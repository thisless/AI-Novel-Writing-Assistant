import type { RecoverableTaskSummary } from "@ai-novel/shared/types/task";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AppDialogContent,
  Dialog,
} from "@/components/ui/dialog";
import { useTaskRecovery } from "./TaskRecoveryContext";

function formatTaskKind(kind: RecoverableTaskSummary["kind"]): string {
  if (kind === "novel_workflow") {
    return "Novel workflow";
  }
  if (kind === "novel_pipeline") {
    return "Chapter pipeline";
  }
  if (kind === "book_analysis") {
    return "Book analysis";
  }
  if (kind === "style_extraction") {
    return "Style extraction";
  }
  return "Image task";
}

export default function TaskRecoveryDialog() {
  const { items, isOpen, closeDialog } = useTaskRecovery();

  return (
    <Dialog open={isOpen} onOpenChange={(nextOpen) => { if (!nextOpen) closeDialog(); }}>
      <AppDialogContent
        title="Tasks need your attention"
        description="Open the relevant workspace to review saved results and where the task stopped, then choose what to do next."
        footer={(
          <Button variant="outline" onClick={closeDialog}>
            Handle later
          </Button>
        )}
      >
        <div className="divide-y divide-border">
          {items.map((item) => (
            <section key={`${item.kind}-${item.id}`} className="space-y-3 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{formatTaskKind(item.kind)}</Badge>
                    <Badge variant={item.status === "running" ? "default" : "secondary"}>
                      {item.status === "running" ? "Interrupted while running" : "Interrupted while queued"}
                    </Badge>
                  </div>
                  <div className="text-base font-semibold">{item.title}</div>
                  <div className="text-sm text-muted-foreground">For: {item.ownerLabel}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link to={item.sourceRoute} onClick={closeDialog}>Open task</Link>
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 text-sm text-muted-foreground">
                {item.currentStage ? <div>Current stage: {item.currentStage}</div> : null}
                {item.currentItemLabel ? <div>Stopped at: {item.currentItemLabel}</div> : null}
                {item.recoveryHint ? <div>Recovery suggestion: {item.recoveryHint}</div> : null}
              </div>
            </section>
          ))}
        </div>
      </AppDialogContent>
    </Dialog>
  );
}
