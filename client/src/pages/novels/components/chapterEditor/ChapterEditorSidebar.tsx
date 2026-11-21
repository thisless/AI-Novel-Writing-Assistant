import type { ReactNode } from "react";
import type { Chapter, ChapterEditorDiagnosticCard, ChapterEditorWorkspaceResponse } from "@ai-novel/shared/types/novel";
import { PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChapterEditorDiagnosticList } from "./diagnostics";

interface ChapterEditorSidebarProps {
  chapter: Chapter;
  workspace: ChapterEditorWorkspaceResponse | null;
  workspaceStatus: "loading" | "ready" | "error";
  wordCount: number;
  saveStatusLabel: string;
  isDirty: boolean;
  isSaving: boolean;
  selectedDiagnosticId: string | null;
  onBack?: () => void;
  backLabel?: string;
  onOpenChapterVersions?: () => void;
  onOpenVersionHistory?: () => void;
  onRefreshWorkspace?: () => void;
  isRefreshingWorkspace?: boolean;
  onSave: () => void;
  onFocusDiagnostic: (card: ChapterEditorDiagnosticCard) => void;
  onRunDiagnostic: (card: ChapterEditorDiagnosticCard) => void;
  onResolveDiagnostic: (card: ChapterEditorDiagnosticCard) => void;
  isResolvingDiagnostic?: boolean;
  diagnosticsDisabled?: boolean;
  onCollapse?: () => void;
  qualityNotice?: ReactNode;
}

function MetaChip({ label }: { label: string }) {
  return <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{label}</span>;
}

export default function ChapterEditorSidebar(props: ChapterEditorSidebarProps) {
  const { chapter, workspace } = props;
  const macro = workspace?.macroContext;
  const loading = props.workspaceStatus === "loading";
  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto px-3 py-2">
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          {props.onBack ? <Button size="sm" variant="outline" onClick={props.onBack}>{props.backLabel ?? "Back to chapter execution"}</Button> : <span />}
          {props.onCollapse ? (
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Collapse left panel" onClick={props.onCollapse}>
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <h2 className="text-lg font-semibold leading-7">Chapter {chapter.order} · {chapter.title?.trim() || "Untitled chapter"}</h2>
        <div className="flex flex-wrap gap-2">
          <MetaChip label={props.wordCount.toLocaleString("en-US") + " characters"} />
          <MetaChip label={props.saveStatusLabel} />
          <MetaChip label={loading ? "AI analyzing" : (workspace?.diagnosticCards.length ?? 0) + " issues to address"} />
        </div>
        <div className="grid gap-2">
          <Button size="sm" onClick={props.onSave} disabled={!props.isDirty || props.isSaving} title="Save manuscript (Ctrl/Cmd+S)" aria-keyshortcuts="Control+S Meta+S">
            {props.isSaving ? "Saving..." : "Save · Ctrl/Cmd+S"}
          </Button>
          {props.onOpenChapterVersions ? <Button size="sm" variant="outline" onClick={props.onOpenChapterVersions}>View chapter versions</Button>
            : props.onOpenVersionHistory ? <Button size="sm" variant="outline" onClick={props.onOpenVersionHistory}>Version history</Button> : null}
          {props.onRefreshWorkspace ? <Button size="sm" variant="ghost" onClick={props.onRefreshWorkspace} disabled={props.isRefreshingWorkspace || props.diagnosticsDisabled}>
            {props.isRefreshingWorkspace ? "Analyzing..." : "Reanalyze chapter"}
          </Button> : null}
        </div>
      </section>
      {props.qualityNotice}
      <details className="border-t border-border/50 pt-5">
        <summary className="cursor-pointer text-sm font-medium">
          Chapter goals and context
          {loading ? <span className="ml-2 text-xs font-normal text-muted-foreground">Analyzing…</span> : null}
        </summary>
        <div className="mt-3 space-y-3">
          <p className="text-sm leading-6 text-muted-foreground">{macro?.chapterMission || (loading ? "AI is outlining this chapter's goals. You can keep editing." : "Select text in the chapter that you want to revise.")}</p>
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            {macro ? <>
              <div><div className="font-medium text-foreground">Volume position</div>{macro.volumeTitle} · {macro.volumePositionLabel} · {macro.volumePhaseLabel}</div>
              <div><div className="font-medium text-foreground">Pacing guidance</div>{macro.paceDirective}</div>
              <div><div className="font-medium text-foreground">Continuity</div><p>Previous chapter: {macro.previousChapterBridge}</p><p>Next chapter: {macro.nextChapterBridge}</p></div>
            </> : <p>{loading ? "Analyzing chapter context." : "Chapter context is temporarily unavailable. You can keep editing."}</p>}
            {workspace?.chapterMeta.styleSummary ? <p>Style: {workspace.chapterMeta.styleSummary}</p> : null}
          </div>
        </div>
      </details>
      <ChapterEditorDiagnosticList workspace={workspace} status={props.workspaceStatus} selectedId={props.selectedDiagnosticId}
        disabled={props.diagnosticsDisabled ?? false} isDirty={props.isDirty} isResolving={props.isResolvingDiagnostic ?? false}
        onFocus={props.onFocusDiagnostic} onRun={props.onRunDiagnostic} onResolve={props.onResolveDiagnostic} />
    </div>
  );
}
