import { useEffect, useState } from "react";
import type { PromptPreviewResult, PromptTestRunResult, PromptTemplateVersionView } from "@/api/promptWorkbench";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { usePromptTemplateEditor } from "../hooks/usePromptTemplateEditor";
import { labelTemplateToken, type PromptTemplateTokenKind } from "../templateTokenEditor";
import { PromptTestRunResultPanel } from "./PromptPreviewPanel";
import { VisualTemplateEditor, type TemplateRole } from "./VisualTemplateEditor";

type TemplateState = ReturnType<typeof usePromptTemplateEditor>;

function formatDiagnosticKeys(keys: string[], kind: Extract<PromptTemplateTokenKind, "context" | "input" | "slot">) {
  return keys.map((key) => labelTemplateToken({ kind, key })).join(", ") || "None";
}

function VersionRow(props: {
  version: PromptTemplateVersionView;
  activeVersionId?: string | null;
  disabled?: boolean;
  onLoad: (version: PromptTemplateVersionView) => void;
  onActivate: (versionId: string) => void;
}) {
  const active = props.activeVersionId === props.version.id;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3">
      <div>
        <span className="text-sm font-medium">Version {props.version.versionNo}{active ? " · Active" : ""}</span>
        <span className="ml-3 text-xs text-muted-foreground">{new Date(props.version.createdAt).toLocaleString()}</span>
        {props.version.notes ? <p className="mt-1 text-sm text-muted-foreground">{props.version.notes}</p> : null}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" disabled={props.disabled} onClick={() => props.onLoad(props.version)}>Load into editor</Button>
        <Button variant="outline" size="sm" disabled={props.disabled || active} onClick={() => props.onActivate(props.version.id)}>Activate version</Button>
      </div>
    </div>
  );
}

export function AdvancedPromptTemplateEditor(props: {
  templateState: TemplateState;
  preview: PromptPreviewResult | null;
  testRun?: PromptTestRunResult | null;
  testRunPending?: boolean;
  testRunError?: string | null;
  testRunStreamOutput?: string;
  disabled?: boolean;
  showTestResult?: boolean;
}) {
  const { templateState: state, preview } = props;
  const [role, setRole] = useState<TemplateRole>("system");
  const [tokenMenuRole, setTokenMenuRole] = useState<TemplateRole | null>(null);
  const [tokenQuery, setTokenQuery] = useState("");
  useEffect(() => state.setFocusedRole(role), [role, state.setFocusedRole]);
  const diagnostics = preview?.diagnostics.template?.diagnostics;
  const busy = props.disabled || state.saveMutation.isPending || state.restoreMutation.isPending || state.activateMutation.isPending;

  if (state.overrideQuery.isError) return (
    <div role="alert" className="rounded-md bg-destructive/10 p-4 text-sm">
      <p>Could not load the template. Try again.</p>
      <Button variant="outline" className="mt-2" onClick={() => void state.overrideQuery.refetch()}>Reload</Button>
    </div>
  );
  if (!state.isReady) return <p role="status" className="py-6 text-sm text-muted-foreground">Loading complete template…</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="rounded-md bg-muted/40 px-4 py-3 text-sm">
        <p className="font-medium">{state.canPersist
          ? (state.view?.mode === "custom" ? "This novel uses a custom template" : "This novel uses the official template")
          : "Start with the official template"}</p>
        <p className="mt-1 leading-relaxed text-muted-foreground">
          Prioritize changes to expression guidance under “Writing rules.” Use “Tasks and references” for chapter tasks and background context. Keep reference tags so AI receives the required information.
          {!state.canPersist ? " Draft changes remain on this page until you choose “Save to novel.”" : " Saved changes apply to future generations for this novel and do not alter existing prose."}
        </p>
      </div>
      <Tabs value={role} onValueChange={(value) => { setRole(value as TemplateRole); setTokenMenuRole(null); state.setFocusedRole(value as TemplateRole); }}>
        <TabsList>
          <TabsTrigger value="system">Writing rules · Main adjustments</TabsTrigger>
          <TabsTrigger value="human">Tasks and references</TabsTrigger>
        </TabsList>
      </Tabs>
      <VisualTemplateEditor
        key={role}
        role={role}
        label={role === "system" ? "Writing rules (System)" : "Tasks and references (User)"}
        value={role === "system" ? state.systemContent : state.humanContent}
        disabled={busy}
        textareaRef={role === "system" ? state.systemRef : state.humanRef}
        tokenItems={state.references?.items ?? []}
        tokenMenuRole={tokenMenuRole}
        tokenQuery={tokenQuery}
        references={state.references}
        onTokenQueryChange={setTokenQuery}
        onOpenTokenMenu={(nextRole) => { state.setFocusedRole(nextRole); setTokenQuery(""); setTokenMenuRole(nextRole); }}
        onCloseTokenMenu={() => setTokenMenuRole(null)}
        onFocusRole={state.setFocusedRole}
        onInsertToken={state.insertToken}
        onChange={role === "system" ? state.setSystemContent : state.setHumanContent}
      />
      {state.referenceQuery.isError ? <div role="alert" className="text-sm text-destructive">
        Could not load the reference list. You can still edit the template.
        <Button variant="ghost" size="sm" onClick={() => void state.referenceQuery.refetch()}>Retry loading references</Button>
      </div> : null}
      <div>
        <label className="text-sm font-medium" htmlFor="prompt-template-notes">Version notes (optional)</label>
        <Input id="prompt-template-notes" value={state.notes} onChange={(event) => state.setNotes(event.target.value)}
          maxLength={2000} placeholder="For example: Shorter dialogue and less explanatory narration" className="mt-2 shadow-none" disabled={busy} />
      </div>
      {props.showTestResult !== false ? <PromptTestRunResultPanel result={props.testRun ?? null}
        isPending={props.testRunPending} error={props.testRunError} streamOutput={props.testRunStreamOutput} /> : null}
      {preview ? (
        <details open className="border-t border-border pt-4">
          <summary className="cursor-pointer text-sm font-medium">Preview content and reference checks</summary>
          {diagnostics ? <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            <p>Referenced context: {formatDiagnosticKeys(diagnostics.referencedContextGroups, "context")}</p>
            <p>Automatically added required context: {formatDiagnosticKeys(diagnostics.fallbackRequiredGroups, "context")}</p>
            <p>Task variables: {formatDiagnosticKeys(diagnostics.referencedInputFields, "input")}</p>
            <p>Common settings: {formatDiagnosticKeys(diagnostics.referencedSlotKeys, "slot")}</p>
            {diagnostics.unknownTokens.length ? <p className="text-destructive">Unrecognized references: {diagnostics.unknownTokens.join(", ")}</p> : null}
          </div> : null}
          {preview.messages.map((message, index) => <div key={index} className="mt-3 rounded-md bg-muted/40 p-3">
            <div className="mb-2 text-xs font-medium">{message.role}</div>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs leading-relaxed">{message.content}</pre>
          </div>)}
        </details>
      ) : null}
      {state.canPersist ? <details className="border-t border-border pt-4">
        <summary className="cursor-pointer text-sm font-medium">Version history for this novel · {state.view?.versions.length ?? 0} versions</summary>
        {state.view?.versions.length ? state.view.versions.map((version) => <VersionRow key={version.id}
          version={version} activeVersionId={state.view?.activeVersionId} disabled={busy}
          onLoad={state.loadVersionToDraft} onActivate={(id) => state.activateMutation.mutate(id)} />)
          : <p className="pt-3 text-sm text-muted-foreground">Saved template versions will be available here.</p>}
      </details> : null}
    </div>
  );
}
