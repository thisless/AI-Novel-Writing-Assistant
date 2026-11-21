import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2, RefreshCw, Sparkles } from "lucide-react";
import type { DirectorTaskFactInspectionStep } from "@ai-novel/shared/types/directorRuntime";
import type { DirectorStepCalibrationAction, DirectorStepCalibrationRequest } from "@ai-novel/shared/types/novelDirector";
import { getDirectorTaskFactInspection } from "@/api/novelDirector";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function stepStateLabel(step: DirectorTaskFactInspectionStep): string {
  if (step.isCurrentFactStep) return "Current step";
  if (step.completed) return "Completed";
  if (step.ready) return "Ready to adjust";
  return "Waiting for prerequisites";
}

function stepStateVariant(step: DirectorTaskFactInspectionStep): "default" | "secondary" | "outline" | "destructive" {
  if (step.isCurrentFactStep) return "default";
  if (step.completed) return "secondary";
  if (step.ready) return "outline";
  return "destructive";
}

export default function DirectorStepCalibrationDialog(input: {
  taskId: string;
  activeStepId?: string | null;
  enabled: boolean;
  isSubmitting: boolean;
  onSubmit: (request: DirectorStepCalibrationRequest) => void;
}) {
  const { taskId, activeStepId, enabled, isSubmitting, onSubmit } = input;
  const [open, setOpen] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState(activeStepId?.trim() || "");
  const [instruction, setInstruction] = useState("");
  const inspectionQuery = useQuery({
    queryKey: queryKeys.tasks.directorTaskFactInspection(taskId),
    queryFn: () => getDirectorTaskFactInspection(taskId),
    enabled: open && enabled && Boolean(taskId),
    staleTime: 0,
  });
  const steps = inspectionQuery.data?.data?.inspection?.steps ?? [];
  const selectableSteps = useMemo(
    () => steps.filter((step) => step.completed || step.ready || step.isCurrentFactStep),
    [steps],
  );
  const selectedStep = selectableSteps.find((step) => step.stepId === selectedStepId) ?? null;

  useEffect(() => {
    if (!open) return;
    const preferred = selectableSteps.find((step) => step.stepId === activeStepId)
      ?? selectableSteps.find((step) => step.isCurrentFactStep)
      ?? selectableSteps[0];
    if (preferred && !selectableSteps.some((step) => step.stepId === selectedStepId)) {
      setSelectedStepId(preferred.stepId);
    }
  }, [activeStepId, open, selectableSteps, selectedStepId]);

  const submit = (action: DirectorStepCalibrationAction) => {
    if (!selectedStepId || isSubmitting) return;
    onSubmit({
      stepId: selectedStepId,
      action,
      instruction: instruction.trim() || null,
    });
    setOpen(false);
  };

  if (!enabled) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={isSubmitting}>
          <Sparkles className="h-4 w-4" />
          Adjust another step
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adjust a Director step</DialogTitle>
          <DialogDescription>
            Select a step to revise and tell AI what to improve. After generation, you'll return to the current review point; the workflow continues only after you confirm the result.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="director-step-calibration-step" className="text-sm font-medium text-foreground">
              Which step should be adjusted?
            </label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void inspectionQuery.refetch()}
              disabled={inspectionQuery.isFetching}
            >
              {inspectionQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Reload
            </Button>
          </div>

          {inspectionQuery.isLoading ? (
            <div className="flex items-center justify-center rounded-xl bg-muted/30 px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading completed Director steps…
            </div>
          ) : inspectionQuery.isError ? (
            <div className="rounded-xl bg-destructive/5 px-4 py-3 text-sm leading-6 text-destructive">
              Unable to load the step list. {inspectionQuery.error instanceof Error ? inspectionQuery.error.message : "Try again later."}
            </div>
          ) : selectableSteps.length === 0 ? (
            <div className="rounded-xl bg-muted/30 px-4 py-3 text-sm leading-6 text-muted-foreground">
              No steps are available to adjust. Ask Director to review the steps first.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <select
                  id="director-step-calibration-step"
                  value={selectedStepId}
                  onChange={(event) => setSelectedStepId(event.target.value)}
                  className="h-10 w-full appearance-none rounded-lg border border-input bg-background px-3 pr-9 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  {selectableSteps.map((step) => (
                    <option key={step.stepId} value={step.stepId}>
                      {step.label} · {stepStateLabel(step)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              </div>
              {selectedStep ? (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={stepStateVariant(selectedStep)}>{stepStateLabel(selectedStep)}</Badge>
                  <span>{selectedStep.progress?.label || "This output can be revised based on your instructions."}</span>
                </div>
              ) : null}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="director-step-calibration-instruction" className="text-sm font-medium text-foreground">
              How should AI adjust this step? (Optional)
            </label>
            <textarea
              id="director-step-calibration-instruction"
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder="For example: Keep the current character motivations, but rework the conflict escalation in volume three. Preserve the confirmed world constraints."
              rows={4}
              className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => submit("validate")} disabled={!selectedStep || isSubmitting}>
              <Check className="h-4 w-4" />Check step
            </Button>
            <Button type="button" variant="outline" onClick={() => submit("improve")} disabled={!selectedStep || isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Improve step
            </Button>
            <Button type="button" onClick={() => submit("regenerate")} disabled={!selectedStep || isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Regenerate step
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
