import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  applyOutlineProposal,
  exportOutline,
  generateOutlineProposal,
  getOutline,
  getOutlineRevision,
  listOutlineRevisions,
  getOutlineBookBinding,
  saveOutline,
  type OutlineProposal,
  type OutlineProposalKind,
} from "@/api/outlines";
import type { OutlineDocument } from "@ai-novel/shared/types/outline";
import { Button } from "@/components/ui/button";
import { useIsMobileViewport } from "@/components/layout/mobile/useIsMobileViewport";
import { OutlineProposalPanel } from "./OutlineProposalPanel";
import { OutlineFeedbackPanel } from "./OutlineFeedbackPanel";
import { OutlineRevisionPanel } from "./OutlineRevisionPanel";
import "./outlineWorkspace.css";
import { getOutlineNodeTitle, outlineFieldLabels, type OutlineNode } from "./outlineNodes";

export default function OutlineWorkspacePage() {
  const { id = "" } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["outline", id], queryFn: () => getOutline(id), enabled: !!id });
  const revisionQuery = useQuery({ queryKey: ["outline-revisions", id], queryFn: () => listOutlineRevisions(id), enabled: !!id });
  const bindingQuery = useQuery({ queryKey: ["outline-book-binding", id], queryFn: () => getOutlineBookBinding(id), enabled: !!id });
  const currentRevisionId = revisionQuery.data?.find(revision => revision.version === query.data?.currentVersion)?.id ?? "";
  const currentRevisionQuery = useQuery({ queryKey: ["outline-revision", id, currentRevisionId], queryFn: () => getOutlineRevision(id, currentRevisionId), enabled: !!id && !!currentRevisionId });
  const [document, setDocument] = useState<OutlineDocument | null>(null);
  const [node, setNode] = useState("story");
  useEffect(()=>{const requested=searchParams.get("nodeId");if(requested)setNode(requested);},[id,searchParams]);
  const [request, setRequest] = useState("");
  const [proposal, setProposal] = useState<OutlineProposal | null>(null);
  const [proposalKind, setProposalKind] = useState<OutlineProposalKind>("edit");
  const [showHistory, setShowHistory] = useState(false);
  const isMobileViewport = useIsMobileViewport();
  const hasUnsavedChanges = !!currentRevisionQuery.data?.document && JSON.stringify(document) !== JSON.stringify(currentRevisionQuery.data.document);

  useEffect(() => {
    if (query.data?.document) setDocument(query.data.document);
  }, [query.data]);

  const refreshOutline = async () => {
    await queryClient.invalidateQueries({ queryKey: ["outline", id] });
  };
  const save = useMutation({
    mutationFn: () => saveOutline(id, query.data!.currentVersion, document!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["outline-revisions", id] });
      await refreshOutline();
    },
  });
  const propose = useMutation({
    mutationFn: () => generateOutlineProposal(id, request, proposalKind),
    onSuccess: value => setProposal(value),
  });
  const apply = useMutation({
    mutationFn: (operationIds: string[]) => applyOutlineProposal(id, proposal!.id, operationIds),
    onSuccess: async () => {
      setProposal(null);
      await queryClient.invalidateQueries({ queryKey: ["outline-revisions", id] });
      await refreshOutline();
    },
  });

  const selected = useMemo<OutlineNode | undefined>(() => {
    if (!document) return undefined;
    if (node === "story" || document.story.nodeId === node) return document.story;
    return [
      ...document.volumes,
      ...document.chapters,
      ...document.characters,
      ...document.payoffs,
      ...document.facts,
    ].find(item => item.nodeId === node);
  }, [document, node]);

  if (query.isLoading || (!document && !query.isError)) return <p className="text-sm text-muted-foreground">Opening outline…</p>;
  if (query.isError || !document) return <p role="alert" className="text-sm text-destructive">Failed to load outline. Return to the list and try again.</p>;

  const updateSelectedField = (field: string, value: string) => {
    setDocument(current => {
      if (!current) return current;
      if (node === "story" || current.story.nodeId === node) {
        return { ...current, story: { ...current.story, [field]: value } };
      }
      for (const collection of ["volumes", "chapters", "characters", "payoffs", "facts"] as const) {
        if (current[collection].some(item => item.nodeId === node)) {
          return {
            ...current,
            [collection]: current[collection].map(item => item.nodeId === node ? { ...item, [field]: value } : item),
          } as OutlineDocument;
        }
      }
      return current;
    });
  };

  const download = async (format: "json" | "markdown") => {
    const value = await exportOutline(id, format);
    const url = URL.createObjectURL(new Blob([typeof value === "string" ? value : JSON.stringify(value, null, 2)], { type: "text/plain;charset=utf-8" }));
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `${query.data?.title}.${format === "json" ? "json" : "md"}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const directory = [
    { label: "Story", items: [{ id: "story", label: document.story.title }] },
    {
      label: "Volumes and chapters",
      items: [
        ...document.volumes.map(item => ({ id: item.nodeId, label: item.title })),
        ...document.chapters.map(item => ({ id: item.nodeId, label: `　${item.title}` })),
      ],
    },
    { label: "Characters", items: document.characters.map(item => ({ id: item.nodeId, label: item.name })) },
    { label: "Foreshadowing and hooks", items: document.payoffs.map(item => ({ id: item.nodeId, label: item.title })) },
    { label: "Fixed facts", items: document.facts.map(item => ({ id: item.nodeId, label: item.title })) },
  ];
  const selectedFields = selected
    ? Object.entries(selected as unknown as Record<string, unknown>).filter(([key, value]) => key !== "nodeId" && key !== "volumeNodeId" && typeof value === "string") as Array<[string, string]>
    : [];

  return (
    <div className="outline-workspace mx-auto max-w-[1800px]">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{query.data?.title} <span className="text-sm font-normal text-muted-foreground">· Revision v{query.data?.currentVersion}</span></h1>
          <p className="mt-1 text-xs text-muted-foreground">Outlines are saved separately. AI suggestions become a new revision only after you confirm them.</p>
        </div>
        <div className="flex gap-2">
          {!isMobileViewport ? (!bindingQuery.isSuccess || (!bindingQuery.data && (!currentRevisionId || hasUnsavedChanges)) ? <Button disabled>Start novel from outline</Button> : <Button asChild><Link to={bindingQuery.data ? bindingQuery.data.sourceRoute : `/outlines/${id}/open-book?revisionId=${encodeURIComponent(currentRevisionId)}`}>{bindingQuery.data ? "Continue novel" : "Start novel from outline"}</Link></Button>) : null}
          <Button variant="ghost" onClick={() => setShowHistory(current => !current)}>{showHistory ? "Hide history" : "History"}</Button>
          <Button variant="ghost" onClick={() => download("json")}>Export JSON</Button>
          <Button variant="ghost" onClick={() => download("markdown")}>Export Markdown</Button>
        </div>
      </header>

      {bindingQuery.data ? <p className="shrink-0 text-xs leading-6 text-muted-foreground">Linked to “{bindingQuery.data.title}” · Uses revision v{bindingQuery.data.revisionVersion}{bindingQuery.data.currentVersion!==bindingQuery.data.revisionVersion ? ` · The source outline is now v${bindingQuery.data.currentVersion}; this novel will not sync automatically` : ""}</p> : bindingQuery.isError ? <p role="alert" className="shrink-0 text-xs text-destructive">Failed to load binding information. Refresh before starting to avoid creating a duplicate novel.</p> : hasUnsavedChanges ? <p className="shrink-0 text-xs text-muted-foreground">Save local changes before starting a novel from this revision.</p> : null}
      <OutlineFeedbackPanel outlineId={id} bound={!!bindingQuery.data} />
      <div className="outline-workspace-grid">
        <nav aria-label="Outline contents" className="outline-directory space-y-5 border-b border-border/50 pb-4 xl:border-b-0 xl:border-r xl:pr-3">
          {directory.map(group => (
            <section key={group.label}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</h2>
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setNode(item.id)}
                  className={`block w-full truncate rounded px-2 py-1.5 text-left text-sm ${node === item.id ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {item.label}
                </button>
              ))}
            </section>
          ))}
        </nav>

        <section aria-label="Edit outline content" className="outline-editor min-w-0">
          {selected ? (
            <>
              <div className="outline-editor-fields space-y-4">
                <h2 className="text-lg font-semibold">{getOutlineNodeTitle(selected)}</h2>
                {selectedFields.map(([key, value]) => (
                  <label key={key} className="block space-y-1.5">
                    <span className="text-sm text-muted-foreground">{outlineFieldLabels[key] ?? key}</span>
                    <textarea
                      rows={4}
                      className="outline-textarea min-h-24 w-full resize-y rounded-md border border-input bg-background px-3 py-2.5 text-sm leading-6"
                      value={value}
                      onChange={event => updateSelectedField(key, event.target.value)}
                    />
                  </label>
                ))}
              </div>
              <div className="outline-save-bar sticky bottom-0 z-10 border-t border-border/50 bg-background py-3">
                <div className="flex flex-wrap items-center justify-end gap-3">
                  {save.isSuccess ? <span className="text-xs text-muted-foreground">Saved as a new revision</span> : null}
                  <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save as new revision"}</Button>
                </div>
                {save.isError ? <p role="alert" className="mt-2 text-sm text-destructive">{save.error instanceof Error ? save.error.message : "Failed to save. Try again."}</p> : null}
              </div>
            </>
          ) : <p className="text-sm text-muted-foreground">Select an item from the outline to edit it.</p>}
        </section>

        <aside aria-label="Outline suggestions and history" className="outline-inspector space-y-4 border-t border-border/50 pt-4 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
          <div>
            <h2 className="font-semibold">AI collaboration</h2>
            <p className="mt-1 text-sm text-muted-foreground">Tell AI what you'd like to change. You can review suggestions before applying them.</p>
          </div>
          <select
            aria-label="AI suggestion type"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={proposalKind}
            onChange={event => setProposalKind(event.target.value as OutlineProposalKind)}
          >
            <option value="edit">Revise current outline</option>
            <option value="initial_generation">Generate a first draft from an idea</option>
          </select>
          <textarea
            aria-label="Instructions for AI"
            rows={4}
            className="outline-textarea min-h-28 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm leading-6"
            placeholder={proposalKind === "initial_generation" ? "Describe the story you want to write in one sentence" : "For example: Tighten the pacing in volume two and add a romance arc"}
            value={request}
            onChange={event => setRequest(event.target.value)}
          />
          <Button className="w-full" onClick={() => propose.mutate()} disabled={!request.trim() || propose.isPending}>
            {propose.isPending ? "Generating suggestions…" : proposalKind === "initial_generation" ? "Generate outline suggestions" : "Suggest revisions"}
          </Button>
          {propose.isError ? <p role="alert" className="text-sm text-destructive">{propose.error instanceof Error ? propose.error.message : "Failed to generate suggestions. Try again."}</p> : null}
          {proposal ? (
            <OutlineProposalPanel
              key={proposal.id}
              proposal={proposal}
              document={document}
              isApplying={apply.isPending}
              onApply={operationIds => apply.mutate(operationIds)}
              onDiscard={() => setProposal(null)}
            />
          ) : null}
          {apply.isError ? (
            <div role="alert" className="space-y-2 text-sm text-destructive">
              <p>{apply.error instanceof Error ? apply.error.message : "Failed to apply suggestions. Refresh the outline and try again."}</p>
              <p className="text-xs text-muted-foreground">Generate suggestions for the current outline, then review and apply them.</p>
              <Button type="button" size="sm" variant="secondary" onClick={() => { setProposal(null); apply.reset(); }}>
                Regenerate suggestions
              </Button>
            </div>
          ) : null}
          {showHistory ? (
            <OutlineRevisionPanel
              outlineId={id}
              currentVersion={query.data?.currentVersion ?? 0}
              document={document}
              onRestored={() => { void refreshOutline(); }}
            />
          ) : null}
        </aside>
      </div>
    </div>
  );
}
