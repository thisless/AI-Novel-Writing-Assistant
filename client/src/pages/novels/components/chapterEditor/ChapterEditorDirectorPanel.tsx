import type { ChapterEditorCandidate, ChapterEditorWorkspaceResponse } from "@ai-novel/shared/types/novel";
import type { ChapterEditorDiffChange } from "@ai-novel/shared/types/chapterEditor/document";
import { PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChapterEditorSessionState } from "./chapterEditorTypes";
import { ChapterEditorActions, type ChapterEditorActionsProps } from "./assistant";

interface ChapterEditorDirectorPanelProps extends ChapterEditorActionsProps {
  workspace: ChapterEditorWorkspaceResponse | null;
  workspaceStatus: "loading" | "ready" | "error";
  session: ChapterEditorSessionState;
  activeCandidate: ChapterEditorCandidate | null;
  diffChanges: ChapterEditorDiffChange[];
  selectedDiffChangeIds: ReadonlySet<string>;
  reviewError?: string | null;
  hasSelectedChanges: boolean;
  isApplying: boolean;
  onSelectCandidate: (candidateId: string) => void;
  onToggleDiffChange: (changeId: string) => void;
  onSelectAllChanges: (selected: boolean) => void;
  onChangeViewMode: (mode: "inline" | "block") => void;
  onAccept: () => void;
  onReject: () => void;
  onRegenerate: () => void;
  onCollapse?: () => void;
}

export default function ChapterEditorDirectorPanel(props: ChapterEditorDirectorPanelProps) {
  const { session, activeCandidate, diffChanges, selectedDiffChangeIds, reviewError, hasSelectedChanges, isApplying,
    onSelectCandidate, onToggleDiffChange, onSelectAllChanges, onChangeViewMode, onAccept, onReject, onRegenerate } = props;
  const isIdle = session.status === "idle";
  const selectedDiffCount = diffChanges.filter(change => selectedDiffChangeIds.has(change.id)).length;
  return (
    <div className="flex min-h-0 flex-col overflow-hidden bg-background xl:h-full">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
        <div className="text-sm font-medium">AI revisions and continuation</div>
        <div className="flex items-center gap-2">
          {!isIdle ? <>
            <Button size="sm" variant={session.viewMode === "block" ? "default" : "outline"} onClick={() => onChangeViewMode("block")}>Paragraph comparison</Button>
            <Button size="sm" variant={session.viewMode === "inline" ? "default" : "outline"} onClick={() => onChangeViewMode("inline")}>Inline changes</Button>
          </> : null}
          {props.onCollapse ? (
            <Button size="icon" variant="ghost" className="h-8 w-8" title="Collapse right panel" onClick={props.onCollapse}>
              <PanelRightClose className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {isIdle ? <>
          {props.workspaceStatus === "loading" ? <p className="text-xs leading-5 text-muted-foreground">AI is analyzing this chapter. You can select text or add revision instructions.</p> : null}
          <ChapterEditorActions {...props} />
        </> : null}
        {session.status === "loading" ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
            AI is generating 2–3 candidates based on the chapter's overall direction and your revision instructions.
          </div>
        ) : null}

        {session.status === "error" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            {session.errorMessage || "Could not generate candidates. Please try again."}
          </div>
        ) : null}

        {session.status === "ready" && activeCandidate ? (
          <>
            <div className="rounded-xl bg-muted/10 p-4">
              <div className="text-sm font-medium text-foreground">
                {session.mode === "continuation" ? "AI continuation approach" : "AI's understanding of the revision"}
              </div>
              {session.mode === "continuation" ? (
                <div className="mt-3 text-sm leading-6 text-muted-foreground">
                  A passage for “{session.continuationOperation === "continue" ? "natural continuation" : session.requestLabel?.replace(/^Generating\s*| plan$/g, "") || "continuation"}” will be inserted at the cursor. Compare the candidates before deciding whether to add one to the manuscript.
                </div>
              ) : (
                <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  <div>Goal: {session.resolvedIntent?.editGoal}</div>
                  <div>Tone: {session.resolvedIntent?.toneShift}</div>
                  <div>Pacing: {session.resolvedIntent?.paceAdjustment}</div>
                  <div>Conflict: {session.resolvedIntent?.conflictAdjustment}</div>
                  <div>Emotion: {session.resolvedIntent?.emotionAdjustment}</div>
                  <div>Rationale: {session.resolvedIntent?.reasoningSummary}</div>
                </div>
              )}
              {session.macroAlignmentNote ? (
                <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-3 text-sm leading-6 text-emerald-900">
                  Alignment with chapter/volume goals: {session.macroAlignmentNote}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {session.candidates?.map((candidate) => (
                <Button
                  key={candidate.id}
                  size="sm"
                  variant={candidate.id === session.activeCandidateId ? "default" : "outline"}
                  onClick={() => onSelectCandidate(candidate.id)}
                >
                  {candidate.label}
                </Button>
              ))}
            </div>

            <div className="space-y-2 rounded-xl bg-muted/10 p-4">
              <div className="text-sm font-medium text-foreground">{activeCandidate.label}</div>
              {activeCandidate.summary ? (
                <div className="text-sm leading-6 text-muted-foreground">{activeCandidate.summary}</div>
              ) : null}
              {activeCandidate.rationale ? (
                <div className="text-sm leading-6 text-foreground/80">Why this revision: {activeCandidate.rationale}</div>
              ) : null}
              {activeCandidate.riskNotes && activeCandidate.riskNotes.length > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-3 text-sm leading-6 text-amber-900">
                  Notes: {activeCandidate.riskNotes.join("; ")}
                </div>
              ) : null}
            </div>
            {reviewError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-900">
                {reviewError}
              </div>
            ) : null}
            <div className="space-y-3 rounded-xl bg-muted/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-foreground">Choose changes to apply to the manuscript</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {diffChanges.length > 0
                      ? `${selectedDiffCount} of ${diffChanges.length} changes selected. Unselected text will remain unchanged.`
                      : "No individually selectable changes were found in this candidate."}
                  </div>
                </div>
                {diffChanges.length > 0 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onSelectAllChanges(selectedDiffCount !== diffChanges.length)}
                  >
                    {selectedDiffCount === diffChanges.length ? "Deselect all" : "Select all"}
                  </Button>
                ) : null}
              </div>
              {diffChanges.length > 0 ? (
                <div className="space-y-2">
                  {diffChanges.map((change, index) => {
                    const checked = selectedDiffChangeIds.has(change.id);
                    const before = change.originalText.trim() || "(Added content)";
                    const after = change.candidateText.trim() || "(Deleted content)";
                    return (
                      <label
                        key={change.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition-colors ${checked ? "bg-emerald-50/80" : "bg-background/60 opacity-70"}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 accent-emerald-600"
                          checked={checked}
                          onChange={() => onToggleDiffChange(change.id)}
                        />
                        <span className="min-w-0 flex-1 text-xs leading-5">
                          <span className="font-medium text-foreground">Change {index + 1} · {change.kind === "replace" ? "Replace" : change.kind === "insert" ? "Insert" : "Delete"}</span>
                          <span className="mt-1 block break-words text-rose-800 line-through">{before}</span>
                          <span className="mt-1 block break-words text-emerald-800">{after}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
      {!isIdle ? (
      <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 border-t border-border/70 px-4 py-4">
        <Button size="sm" variant="outline" onClick={onReject} disabled={isIdle || session.status === "loading" || isApplying}>
          Reject all
        </Button>
        <Button size="sm" variant="outline" onClick={onRegenerate} disabled={isIdle || session.status === "loading" || isApplying}>
          Regenerate
        </Button>
        <Button size="sm" onClick={onAccept} disabled={session.status !== "ready" || !activeCandidate || isApplying || selectedDiffCount === 0 || !hasSelectedChanges}>
          {isApplying ? "Saving..." : session.mode === "continuation" ? (selectedDiffCount === diffChanges.length ? "Insert into manuscript" : "Insert selected changes") : selectedDiffCount === diffChanges.length ? "Accept all" : "Accept selected changes"}
        </Button>
      </div>
      ) : null}
    </div>
  );
}
