import type { ChapterEditorCursorOperation, ChapterEditorDiagnosticCard, ChapterEditorOperation, ChapterEditorRevisionScope } from "@ai-novel/shared/types/novel";
import { Button } from "@/components/ui/button";
import CursorAIToolbar from "../CursorAIToolbar";
import SelectionAIToolbar from "../SelectionAIToolbar";

export type ChapterEditorActionContext = "diagnostic" | "selection" | "cursor" | "chapter";

export interface ChapterEditorActionsProps {
  actionContext: ChapterEditorActionContext;
  selectedDiagnosticCard: ChapterEditorDiagnosticCard | null;
  cursorTargetDescription: string;
  selectionTargetDescription: string;
  revisionScope: ChapterEditorRevisionScope;
  revisionInstruction: string;
  canRunSelectionRevision: boolean;
  isGenerating: boolean;
  onInstructionChange: (next: string) => void;
  onScopeChange: (scope: ChapterEditorRevisionScope) => void;
  onRunSelectedDiagnostic: () => void;
  onRunFreeform: () => void;
  onRunCursorOperation: (operation: ChapterEditorCursorOperation) => void;
  onRunSelectionOperation: (operation: ChapterEditorOperation) => void;
}

export default function ChapterEditorActions(props: ChapterEditorActionsProps) {
  const { actionContext: context, selectedDiagnosticCard: card, isGenerating } = props;
  const title = context === "diagnostic" ? "Address this issue" : context === "cursor" ? "Continue at cursor"
    : context === "selection" ? "Revise selected text" : "Revise manuscript";
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-medium">{title}</h3>
        <Button size="sm" variant="ghost" disabled={isGenerating} onClick={() => props.onScopeChange(props.revisionScope === "chapter" ? "selection" : "chapter")}>
          {props.revisionScope === "chapter" ? "Back to selection" : "Edit entire chapter"}
        </Button>
      </div>
      {context === "diagnostic" && card ? (
        <div className="space-y-3 text-sm leading-6">
          <div className="font-medium">{card.title} <span className="ml-2 text-xs font-normal text-muted-foreground">{card.paragraphLabel || "Entire chapter"}</span></div>
          <div><div className="text-xs text-muted-foreground">Issue</div><p>{card.problemSummary}</p></div>
          <div><div className="text-xs text-muted-foreground">Why it matters</div><p>{card.whyItMatters}</p></div>
          <div><div className="text-xs text-muted-foreground">Suggested approach</div><p>{card.repairApproach || card.repairGoal || "Generate a revision plan that addresses this issue while preserving plot facts and continuity."}</p></div>
          {card.repairGoal ? <p className="text-muted-foreground">Goal: {card.repairGoal}</p> : null}
          {card.mustPreserve?.length ? <div className="rounded-lg bg-muted/30 p-3"><div className="text-xs text-muted-foreground">Preserve</div><ul className="mt-1 list-inside list-disc">{card.mustPreserve.map((item, index) => <li key={index}>{item}</li>)}</ul></div> : null}
        </div>
      ) : context === "cursor" ? (
        <CursorAIToolbar visible targetLabel={props.cursorTargetDescription} disabled={isGenerating} onRunOperation={props.onRunCursorOperation} />
      ) : context === "selection" ? (
        <SelectionAIToolbar visible targetLabel={props.selectionTargetDescription} disabled={isGenerating} onRunOperation={props.onRunSelectionOperation} />
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">{props.revisionScope === "chapter" ? "Scope: entire chapter. Compare the candidates before deciding whether to accept one." : "Place the cursor or select text in the manuscript, or choose to revise the entire chapter."}</p>
      )}
      <div className="space-y-3 border-t border-border/50 pt-4">
        <label htmlFor="chapter-editor-instruction" className="text-sm font-medium">Additional instructions{context === "diagnostic" || context === "cursor" ? " (optional)" : ""}</label>
        <textarea id="chapter-editor-instruction" aria-label="Additional instructions" maxLength={800} className="min-h-[100px] w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          placeholder="For example: Keep the character's restrained tone and reduce repetitive descriptions." value={props.revisionInstruction} onChange={(event) => props.onInstructionChange(event.target.value)} />
        <div className="flex justify-end">
          {context === "diagnostic" ? <Button size="sm" disabled={isGenerating || !card} onClick={props.onRunSelectedDiagnostic}>Generate revision plan</Button>
            : context === "cursor" ? <Button size="sm" disabled={isGenerating || !props.revisionInstruction.trim()} onClick={() => props.onRunCursorOperation("continue")}>Continue as instructed</Button>
              : <Button size="sm" disabled={isGenerating || !props.revisionInstruction.trim() || (props.revisionScope === "selection" && !props.canRunSelectionRevision)} onClick={props.onRunFreeform}>Revise as instructed</Button>}
        </div>
      </div>
    </div>
  );
}
