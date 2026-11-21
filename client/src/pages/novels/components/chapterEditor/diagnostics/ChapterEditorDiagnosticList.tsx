import type { ChapterEditorDiagnosticCard, ChapterEditorWorkspaceResponse } from "@ai-novel/shared/types/novel";
import { Button } from "@/components/ui/button";
import { findRecommendedDiagnostic } from "./workspaceState";

interface Props {
  workspace: ChapterEditorWorkspaceResponse | null;
  status: "loading" | "ready" | "error";
  selectedId: string | null;
  disabled: boolean;
  isDirty: boolean;
  isResolving: boolean;
  onFocus: (card: ChapterEditorDiagnosticCard) => void;
  onRun: (card: ChapterEditorDiagnosticCard) => void;
  onResolve: (card: ChapterEditorDiagnosticCard) => void;
}

function DiagnosticRow({ card, props }: { card: ChapterEditorDiagnosticCard; props: Props }) {
  const selected = card.id === props.selectedId;
  return (
    <div className={`space-y-3 rounded-xl px-3 py-3 ${selected ? "bg-primary/5 ring-1 ring-primary/20" : "bg-muted/20"}`}>
      <div>
        <div className="text-sm font-medium">{card.title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{card.paragraphLabel || "Entire chapter"}</div>
      </div>
      <p className={`text-sm leading-6 text-muted-foreground ${selected ? "" : "line-clamp-2"}`}>{card.problemSummary}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={props.disabled} onClick={() => props.onFocus(card)}>
          {selected ? "Clear location" : "Locate in manuscript"}
        </Button>
        <Button size="sm" disabled={props.disabled} onClick={() => props.onRun(card)}>Address with AI</Button>
        {card.sourceIssueId ? (
          <Button size="sm" variant="ghost" disabled={props.disabled || props.isDirty || props.isResolving} onClick={() => props.onResolve(card)}>
            {props.isResolving ? "Confirming..." : props.isDirty ? "Save before confirming" : "Mark issue as addressed"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default function ChapterEditorDiagnosticList(props: Props) {
  const { workspace, status } = props;
  const primary = workspace ? findRecommendedDiagnostic(workspace) ?? workspace.diagnosticCards[0] : null;
  const others = workspace?.diagnosticCards.filter((card) => card.id !== primary?.id) ?? [];
  return (
    <div className="space-y-5 border-t border-border/50 pt-5">
      <section aria-label="Top issue" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Top issue</h3>
          {primary ? <span className="text-xs text-muted-foreground">Recommended first</span> : null}
        </div>
        {status === "loading" ? (
          <p className="text-sm leading-6 text-muted-foreground">AI is reviewing this chapter's goals and identifying issues. You can keep editing.</p>
        ) : primary ? <DiagnosticRow card={primary} props={props} /> : (
          <p className="text-sm leading-6 text-muted-foreground">
            {status === "error" ? "Issue analysis is temporarily unavailable. You can still select text to revise or add instructions." : "No issues to address. You can keep editing or add revision instructions."}
          </p>
        )}
      </section>
      {others.length ? (
        <details className="border-t border-border/40 pt-4">
          <summary className="cursor-pointer text-sm text-muted-foreground">Other issues ({others.length})</summary>
          <div className="mt-3 space-y-3">{others.map((card) => <DiagnosticRow key={card.id} card={card} props={props} />)}</div>
        </details>
      ) : null}
    </div>
  );
}
