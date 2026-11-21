import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOutlineRevision, listOutlineRevisions } from "@/api/outlines";
import type { OutlineDocument } from "@ai-novel/shared/types/outline";
import type {
  OutlineInitialProposalPayload,
  OutlineProposal,
  OutlineProposalOperation,
} from "@/api/outlines";
import { Button } from "@/components/ui/button";
import {
  findMissingOperationDependencies,
  canApplyOperationSelection,
} from "./outlineProposalSelection";
import {
  findOutlineNode,
  findOutlineNodeTitle,
  formatOutlineValue,
  outlineFieldLabels,
  localizeOutlineText,
} from "./outlineNodes";

const operationKindLabels = {
  add_node: "Add",
  update_fields: "Update",
  remove_node: "Remove",
  move_node: "Move",
} as const;

const nodeTypeLabels = {
  volume: "volume",
  chapter: "chapter",
  character: "character",
  payoff: "foreshadowing or hook",
  fact: "fixed fact",
} as const;

const initialGroupLabels = {
  volumes: "Volumes",
  chapters: "Chapters",
  characters: "Characters",
  payoffs: "Foreshadowing and hooks",
  facts: "Fixed facts",
} as const;

interface OutlineProposalPanelProps {
  proposal: OutlineProposal;
  document: OutlineDocument;
  isApplying: boolean;
  onApply: (operationIds: string[]) => void;
  onDiscard: () => void;
}

function operationTitle(operation: OutlineProposalOperation, document: OutlineDocument): string {
  const targetTitle = operation.nodeId ? findOutlineNodeTitle(document, operation.nodeId) : "";
  if (operation.kind === "add_node") {
    const title = operation.fields?.title ?? operation.fields?.name ?? "New node";
    return `Add ${operation.nodeType ? nodeTypeLabels[operation.nodeType] : "node"} “${String(title)}”`;
  }
  return `${operationKindLabels[operation.kind]} “${targetTitle || "node"}”`;
}

function FieldChanges({ operation, document, titles }: { operation: OutlineProposalOperation; document: OutlineDocument; titles: Record<string, string> }) {
  const target = operation.nodeId ? findOutlineNode(document, operation.nodeId) : undefined;
  const targetRecord = target as unknown as Record<string, unknown> | undefined;
  if (operation.kind === "move_node") {
    return (
      <dl className="outline-comparison text-xs">
        <div><dt className="text-muted-foreground">Previous volume</dt><dd className="mt-1 whitespace-pre-wrap">{targetRecord?.volumeNodeId ? findOutlineNodeTitle(document, String(targetRecord.volumeNodeId)) : "Empty"}</dd></div>
        <div><dt className="text-muted-foreground">New volume</dt><dd className="mt-1 whitespace-pre-wrap">{operation.parentNodeId ? findOutlineNodeTitle(document, operation.parentNodeId) : "Empty"}</dd></div>
      </dl>
    );
  }
  if (operation.kind === "remove_node") {
    return <p className="text-xs text-muted-foreground">Applying this change removes the node and its fields from the new revision.</p>;
  }
  const fields = Object.entries(operation.fields ?? {});
  if (!fields.length) return null;
  return (
    <div className="space-y-2">
      {fields.map(([field, after]) => (
        <div key={field} className="text-xs">
          <p className="font-medium text-muted-foreground">{outlineFieldLabels[field] ?? field}</p>
          <dl className="outline-comparison mt-1">
            <div className="bg-muted/40 p-2"><dt className="text-muted-foreground">Before</dt><dd className="mt-1 whitespace-pre-wrap break-words">{formatOutlineValue(targetRecord?.[field], field, document)}</dd></div>
            <div className="bg-muted/40 p-2"><dt className="text-muted-foreground">After</dt><dd className="mt-1 whitespace-pre-wrap break-words">{formatOutlineValue(after, field, document, titles)}</dd></div>
          </dl>
        </div>
      ))}
    </div>
  );
}

function InitialProposalPreview({ payload }: { payload: OutlineInitialProposalPayload }) {
  return (
    <div className="space-y-4 text-sm">
      <section>
        <h4 className="font-medium">{payload.storyFields.title}</h4>
        <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{payload.storyFields.synopsis || payload.storyFields.premise}</p>
      </section>
      {(Object.keys(initialGroupLabels) as Array<keyof typeof initialGroupLabels>).map(group => (
        <section key={group}>
          <h4 className="text-xs font-medium text-muted-foreground">{initialGroupLabels[group]} · {payload[group].length}</h4>
          <ul className="mt-2 space-y-2">
            {payload[group].map(item => (
              <li key={item.clientRef}>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">{item.summary}</p>
                {item.reason ? <p className="mt-1 text-xs text-muted-foreground">Reason: {item.reason}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function OutlineProposalPanel({ proposal, document: currentDocument, isApplying, onApply, onDiscard }: OutlineProposalPanelProps) {
  const revisions = useQuery({ queryKey: ["outline-revisions", proposal.projectId], queryFn: () => listOutlineRevisions(proposal.projectId) });
  const baseRevision = revisions.data?.find(item => item.version === proposal.baseVersion);
  const base = useQuery({ queryKey: ["outline-revision", proposal.projectId, baseRevision?.id], queryFn: () => getOutlineRevision(proposal.projectId, baseRevision!.id), enabled: !!baseRevision });
  const document = base.data?.document ?? currentDocument;
  const payload = useMemo(
    () => JSON.parse(proposal.proposalJson) as OutlineInitialProposalPayload | { operations: OutlineProposalOperation[] },
    [proposal.proposalJson],
  );
  const operations = "operations" in payload ? payload.operations : [];
  const titles: Record<string, string> = {};
  for (const operation of operations) {
    const title = operation.fields?.title ?? operation.fields?.name;
    if (typeof title === "string") {
      if (operation.nodeId) titles[operation.nodeId] = title;
      if (operation.clientRef) titles[operation.clientRef] = title;
    }
  }
  const operationTitles = Object.fromEntries(operations.map(operation => [operation.operationId, operationTitle(operation, document)]));
  const displayText = (text: string) => localizeOutlineText(text, operationTitles);
  const allOperationIds = useMemo(() => operations.map(operation => operation.operationId), [operations]);
  const [selectedIds, setSelectedIds] = useState<string[]>(allOperationIds);
  const selected = new Set(selectedIds);
  const missingDependencies = findMissingOperationDependencies(operations, selectedIds);
  const allMissingDependencies = findMissingOperationDependencies(operations, allOperationIds);
  const selectedIsComplete = canApplyOperationSelection(operations, selectedIds);

  const toggleOperation = (operationId: string) => {
    setSelectedIds(current => current.includes(operationId)
      ? current.filter(id => id !== operationId)
      : [...current, operationId]);
  };

  const dependencyName = (operationId: string) => {
    const dependency = operations.find(operation => operation.operationId === operationId);
    return dependency ? operationTitle(dependency, document) : "Related change";
  };

  if (revisions.isLoading || base.isLoading) return <p className="text-sm text-muted-foreground">Loading the proposal's base revision…</p>;
  if (revisions.isError || base.isError || !base.data) return <p role="alert" className="text-sm text-destructive">Failed to load the proposal's base revision. Generate suggestions again.</p>;

  return (
    <section className="space-y-4 border-t border-border/50 pt-4">
      <div>
        <h3 className="font-medium">Suggestions for review</h3>
        <p className="mt-1 text-xs text-muted-foreground">Based on revision v{proposal.baseVersion}. Select the changes you want; dependent changes must be applied together.</p>
      </div>

      {"operations" in payload ? (
        <>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Selected {selectedIds.length} of {operations.length}</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedIds(allOperationIds)}>Select all</Button>
          </div>
          <ul className="space-y-3">
            {operations.map(operation => {
              const ownMissing = missingDependencies.find(result => result.operationId === operation.operationId);
              return (
                <li key={operation.operationId} className="space-y-3 bg-muted/25 p-3">
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 accent-primary"
                      checked={selected.has(operation.operationId)}
                      onChange={() => toggleOperation(operation.operationId)}
                    />
                    <span className="text-sm font-medium">{operationTitle(operation, document)}</span>
                  </label>
                  <p className="text-xs text-muted-foreground">Reason: {displayText(operation.reason)}</p>
                  {operation.dependsOn.length ? (
                    <p className="text-xs text-muted-foreground">
                      Depends on: {operation.dependsOn.map(dependencyName).join(", ")}
                    </p>
                  ) : null}
                  {ownMissing ? (
                    <p role="alert" className="text-xs text-destructive">
                      Also select: {ownMissing.dependencyIds.map(dependencyName).join(", ")}
                    </p>
                  ) : null}
                  <FieldChanges operation={operation} document={document} titles={titles} />
                  {operation.affectedNodeIds.length ? (
                    <p className="text-xs text-muted-foreground">Affected items: {operation.affectedNodeIds.map(id => titles[id] ?? findOutlineNodeTitle(document, id)).join(", ")}</p>
                  ) : null}
                  {operation.risks.length ? <p className="text-xs text-amber-700 dark:text-amber-400">Note: {displayText(operation.risks.join("; "))}</p> : null}
                </li>
              );
            })}
          </ul>
          {!selectedIds.length ? <p role="alert" className="text-xs text-destructive">Select at least one change to apply part of a proposal.</p> : null}
          {missingDependencies.length ? <p role="alert" className="text-xs text-destructive">This selection is missing required changes. Add them or apply all changes.</p> : null}
          {allMissingDependencies.length ? <p role="alert" className="text-xs text-destructive">The proposal contains unknown dependencies. Discard it and generate suggestions again.</p> : null}
        </>
      ) : <InitialProposalPreview payload={payload} />}

      <div className="space-y-2">
        {"operations" in payload ? (
          <Button className="w-full" onClick={() => onApply(allOperationIds)} disabled={isApplying || allMissingDependencies.length > 0}>
            Apply all
          </Button>
        ) : (
          <Button className="w-full" onClick={() => onApply([])} disabled={isApplying}>Apply this outline</Button>
        )}
        {"operations" in payload ? (
          <Button className="w-full" variant="secondary" onClick={() => onApply(selectedIds)} disabled={isApplying || !selectedIsComplete}>
            Apply selected ({selectedIds.length})
          </Button>
        ) : null}
        <Button className="w-full" variant="ghost" onClick={onDiscard} disabled={isApplying}>Discard</Button>
      </div>
    </section>
  );
}
