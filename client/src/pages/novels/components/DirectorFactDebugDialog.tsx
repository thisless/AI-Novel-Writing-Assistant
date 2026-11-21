import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Bug, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import type { DirectorTaskFactInspectionStep } from "@ai-novel/shared/types/directorRuntime";
import { getDirectorNovelFactInspection } from "@/api/novelDirector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function formatPercent(ratio: number): string {
  return `${Math.max(0, Math.min(100, Math.round(ratio * 100)))}%`;
}

function formatStageLabel(stage: string): string {
  if (stage === "candidate_selection") return "Book direction";
  if (stage === "candidate_confirm") return "Project setup";
  if (stage === "story_macro") return "Story macro plan";
  if (stage === "book_contract") return "Book-level writing contract";
  if (stage === "character_setup") return "Character setup";
  if (stage === "volume_strategy") return "Volume planning";
  if (stage === "structured_outline") return "Beats and chapter breakdown";
  if (stage === "chapter_execution") return "Drafting";
  if (stage === "quality_repair") return "Quality loop";
  if (stage === "takeover") return "Take over an existing project";
  return stage;
}

function formatNextAction(action?: string | null): string {
  if (!action) return "No additional action suggested";
  if (action === "run_chapter_detail_generation") return "Continue refining the remaining chapter task sheets";
  if (action === "run_chapter_list_generation") return "Continue completing the volume's chapter breakdown";
  if (action === "sync_execution_contracts") return "Sync chapter execution contracts";
  const text = action
    .replace(/_/g, " ")
    .replace(/\./g, " ")
    .trim();
  return text || action;
}

function formatResumeFrom(resumeFrom?: string | null): string {
  if (!resumeFrom) return "Reassess based on the current state";
  if (resumeFrom === "chapter_detail_bundle") return "Continue with the remaining chapters to refine";
  if (resumeFrom === "chapter_list") return "Continue from the volume's chapter breakdown";
  if (resumeFrom === "beat_sheet") return "Continue from the volume's beat sheet";
  if (resumeFrom.startsWith("chapter:")) {
    const rawOrder = resumeFrom.slice("chapter:".length).trim();
    const order = Number(rawOrder);
    if (Number.isFinite(order) && order > 0) {
      return `Chapter ${order}`;
    }
  }
  return resumeFrom.replace(/_/g, " ").trim() || resumeFrom;
}

function summarizeStep(step: DirectorTaskFactInspectionStep): {
  tone: "done" | "current" | "blocked" | "working" | "error";
  title: string;
  detail: string;
} {
  if (step.inspectError) {
    return {
      tone: "error",
      title: "Check incomplete",
      detail: step.inspectError,
    };
  }
  if (step.completed) {
    return {
      tone: "done",
      title: "Confirmed complete",
      detail: "The system found an existing output for this step that can be reused.",
    };
  }
  if (!step.ready) {
    return {
      tone: "blocked",
      title: "Not ready",
      detail: step.blockers[0]?.reason || "Upstream information is incomplete, so this step cannot start yet.",
    };
  }
  if (step.isCurrentFactStep) {
    return {
      tone: "current",
      title: "Next priority",
      detail: step.progress?.label || "Based on the available information, this is the next major step.",
    };
  }
  return {
    tone: "working",
    title: "In progress",
    detail: step.progress?.label || "This step is ready to run, but its output is not complete yet.",
  };
}

function toneBadgeVariant(tone: ReturnType<typeof summarizeStep>["tone"]): "default" | "secondary" | "outline" | "destructive" {
  if (tone === "done") return "secondary";
  if (tone === "current") return "default";
  if (tone === "blocked" || tone === "error") return "destructive";
  return "outline";
}

function StepFactCard({ step }: { step: DirectorTaskFactInspectionStep }) {
  const summary = summarizeStep(step);

  return (
    <Card className="rounded-lg">
      <CardHeader className="space-y-3 p-4 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-semibold text-foreground">{step.label}</div>
            <div className="text-xs text-muted-foreground">{formatStageLabel(step.stage)}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {step.isCurrentFactStep ? <Badge>System will handle this first</Badge> : null}
            {step.isActiveRuntimeStep ? <Badge variant="outline">Currently running in the background</Badge> : null}
            <Badge variant={toneBadgeVariant(summary.tone)}>{summary.title}</Badge>
          </div>
        </div>
        <div className="text-sm leading-6 text-muted-foreground">{summary.detail}</div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Completion</span>
            <span>{formatPercent(step.completenessRatio)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: formatPercent(step.completenessRatio) }}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border/70 bg-muted/10 p-3">
            <div className="text-xs text-muted-foreground">Ready to continue?</div>
            <div className="mt-1 text-sm font-medium text-foreground">
              {step.ready ? "Ready to start or continue" : "Prerequisites still needed"}
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/10 p-3">
            <div className="text-xs text-muted-foreground">System's next step</div>
            <div className="mt-1 text-sm font-medium text-foreground">{formatNextAction(step.nextAction)}</div>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/10 p-3">
            <div className="text-xs text-muted-foreground">Where to resume if interrupted</div>
            <div className="mt-1 text-sm font-medium text-foreground">{formatResumeFrom(step.resumeFrom)}</div>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/10 p-3">
            <div className="text-xs text-muted-foreground">Latest step details</div>
            <div className="mt-1 text-sm font-medium text-foreground">{step.progress?.label || "No additional details"}</div>
          </div>
        </div>

        {step.blockers.length > 0 ? (
          <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <div className="text-sm font-medium text-destructive">What's blocking this step</div>
            <ul className="space-y-2 text-sm leading-6 text-destructive/90">
              {step.blockers.map((blocker) => (
                <li key={`${step.stepId}:${blocker.code}`}>{blocker.reason}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {step.evidence ? (
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">Evidence</div>
            <pre className="overflow-x-auto rounded-lg border border-border/70 bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
              {JSON.stringify(step.evidence, null, 2)}
            </pre>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function DirectorFactDebugDialog(input: {
  novelId: string;
  taskId?: string | null;
  disabled?: boolean;
}) {
  const { novelId, disabled = false } = input;
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["director-novel-fact-inspection", novelId],
    queryFn: () => getDirectorNovelFactInspection(novelId),
    enabled: open && Boolean(novelId),
    staleTime: 0,
  });

  const inspection = query.data?.data?.inspection ?? null;
  const summary = useMemo(() => {
    const steps = inspection?.steps ?? [];
    return {
      completedCount: steps.filter((step) => step.completed).length,
      blockedCount: steps.filter((step) => !step.completed && !step.ready).length,
      currentStep: steps.find((step) => step.isCurrentFactStep) ?? null,
    };
  }, [inspection]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled || !novelId}>
          <Bug className="h-4 w-4" />
          Debug checks
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-5xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border/70 px-6 py-5">
          <DialogTitle>Director workflow completion check</DialogTitle>
          <DialogDescription>
            These checks are based on actual outputs. See which steps are complete, which prerequisites are missing, and what the system plans to handle next.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[calc(90vh-88px)] flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 px-6 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                Completed {summary.completedCount}/{inspection?.steps.length ?? 0}
              </Badge>
              <Badge variant={summary.blockedCount > 0 ? "destructive" : "outline"}>
                Prerequisites needed: {summary.blockedCount}
              </Badge>
              {summary.currentStep ? (
                <Badge>
                  Next: {summary.currentStep.label}
                </Badge>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void query.refetch()}
              disabled={query.isFetching || !novelId}
            >
              {query.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Check again
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {query.isLoading || query.isFetching ? (
              <div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading director workflow completion checks...
              </div>
            ) : query.isError ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <div className="max-w-md rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm text-destructive">
                  Could not complete the check. {query.error instanceof Error ? query.error.message : "Please try again later."}
                </div>
              </div>
            ) : !inspection ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <div className="max-w-md rounded-lg border border-border/70 bg-muted/10 px-4 py-4 text-sm text-muted-foreground">
                  No director task to inspect yet. Start or take over an AI director workflow to see step-by-step results here.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {inspection.currentFactEvidence ? (
                  <Card className="rounded-lg border-primary/20 bg-primary/5">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <CheckCircle2 className="h-4 w-4" />
                        System will handle this next
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 p-4 pt-0">
                      <div className="text-sm text-foreground">{inspection.currentFactStepLabel || "The system is reassessing the next step"}</div>
                      <pre className="overflow-x-auto rounded-lg border border-border/70 bg-background/70 p-3 text-xs leading-5 text-muted-foreground">
                        {JSON.stringify(inspection.currentFactEvidence, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                ) : null}

                <div className="grid gap-4">
                  {inspection.steps.map((step) => (
                    <StepFactCard key={step.stepId} step={step} />
                  ))}
                </div>

                {inspection.steps.some((step) => step.inspectError) ? (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    Some steps could not be fully checked. The current task state may be incomplete, or more information may be needed.
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
