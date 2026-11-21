import NovelAutoDirectorCandidateBatches from "../components/NovelAutoDirectorCandidateBatches";
import NovelAutoDirectorProgressPanel from "../components/NovelAutoDirectorProgressPanel";
import { Button } from "@/components/ui/button";
import type { useAutoDirectorCreateController } from "./useAutoDirectorCreateController";
import NovelProductionExperienceHandoff from "../components/NovelProductionExperienceHandoff";
import OnboardingTip from "@/components/onboarding/OnboardingTip";
import { isProductionExperienceChoicePending } from "@/lib/novelRoutes";

type AutoDirectorCreateController = ReturnType<typeof useAutoDirectorCreateController>;

interface StageCandidatesProps {
  controller: AutoDirectorCreateController;
  onRegenerateSettings: () => void;
}

export default function StageCandidates({
  controller,
  onRegenerateSettings,
}: StageCandidatesProps) {
  const directorTask = controller.directorTask;
  if (
    directorTask
    && isProductionExperienceChoicePending(directorTask)
    && directorTask.resumeTarget?.novelId
  ) {
    return (
      <NovelProductionExperienceHandoff
        taskId={directorTask.id}
        novelId={directorTask.resumeTarget.novelId}
        novelTitle={directorTask.title}
      />
    );
  }

  if (controller.dialogMode !== "candidate_selection") {
    return (
      <section className="space-y-4">
        <NovelAutoDirectorProgressPanel
          mode={controller.dialogMode}
          task={controller.directorTask}
          taskId={controller.workflowTaskId}
          titleHint={controller.pendingTitleHint}
          fallbackError={controller.executionError}
          onConfirmAndContinue={() => controller.continueMutation.mutate()}
          isConfirmingAndContinuing={controller.continueMutation.isPending}
          quickRetryLabel="Quick retry"
        />
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <OnboardingTip
        storageKey="auto-director-candidates"
        title="Choose the story you most want to read"
        description="Compare the protagonist's goals, central conflict, and ongoing payoffs. You can adjust the title and details later."
        next="Once you confirm, AI will prepare the characters, world, and volume and chapter resources."
      />
      <div className="flex flex-col gap-4 pb-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="break-words text-2xl font-semibold leading-9 text-foreground [overflow-wrap:anywhere]">Story directions</div>
          <div className="mt-1 max-w-3xl break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
            Choose the direction closest to your idea. Expand to make adjustments or generate another round if needed.
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onRegenerateSettings}
        >
          Edit setup
        </Button>
      </div>
      <NovelAutoDirectorCandidateBatches
        batches={controller.batches}
        selectedPresets={controller.selectedPresets}
        feedback={controller.feedback}
        onFeedbackChange={controller.setFeedback}
        onTogglePreset={controller.togglePreset}
        candidatePatchFeedbacks={controller.candidatePatchFeedbacks}
        onCandidatePatchFeedbackChange={(candidateId, value) => controller.setCandidatePatchFeedbacks((prev) => ({
          ...prev,
          [candidateId]: value,
        }))}
        titlePatchFeedbacks={controller.titlePatchFeedbacks}
        onTitlePatchFeedbackChange={(candidateId, value) => controller.setTitlePatchFeedbacks((prev) => ({
          ...prev,
          [candidateId]: value,
        }))}
        isGenerating={controller.generateMutation.isPending}
        isPatchingCandidate={controller.patchCandidateMutation.isPending}
        isRefiningTitle={controller.refineTitleMutation.isPending}
        isConfirming={controller.confirmMutation.isPending}
        onApplyCandidateTitleOption={controller.applyCandidateTitleOption}
        onPatchCandidate={(batchId, candidate, nextFeedback) => controller.patchCandidateMutation.mutate({
          batchId,
          candidate,
          feedback: nextFeedback,
        })}
        onRefineTitle={(batchId, candidate, nextFeedback) => controller.refineTitleMutation.mutate({
          batchId,
          candidate,
          feedback: nextFeedback,
        })}
        onConfirmCandidate={controller.handleConfirmCandidate}
        onGenerateNext={() => controller.generateMutation.mutate()}
      />
    </section>
  );
}

