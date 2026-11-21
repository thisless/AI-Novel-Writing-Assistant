import type {
  NovelWorkflowMilestone,
  NovelWorkflowMilestoneType,
} from "@ai-novel/shared/types/novelWorkflow";
import type {
  DirectorDashboardAction,
  DirectorDashboardMode,
  DirectorDisplayStepStatus,
} from "@ai-novel/shared/types/directorRuntime";
import {
  DIRECTOR_CANDIDATE_SETUP_STEPS,
  extractDirectorTaskSeedPayloadFromMeta,
} from "@ai-novel/shared/types/novelDirector";
import type { UnifiedTaskDetail } from "@ai-novel/shared/types/task";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import {
  getDirectorTaskSnapshot,
} from "@/api/novelDirector";
import { queryKeys } from "@/api/queryKeys";
import DirectorRuntimeProjectionCard from "@/components/autoDirector/DirectorRuntimeProjectionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AITakeoverContainer, { type AITakeoverMode } from "@/components/workflow/AITakeoverContainer";
import {
  isChapterTitleDiversitySummary,
  resolveChapterTitleWarning,
} from "@/lib/directorTaskNotice";
import { extractWorkflowActivityTags } from "@/lib/novelWorkflowActivityTags";
import { useDirectorChapterTitleRepair } from "@/hooks/useDirectorChapterTitleRepair";
import NovelDirectorPreparationJourney, {
  type DirectorPreparationStepStatus,
} from "./NovelDirectorPreparationJourney";

type DirectorExecutionViewMode = "execution_progress" | "execution_failed";

interface NovelAutoDirectorProgressPanelProps {
  mode: DirectorExecutionViewMode;
  task: UnifiedTaskDetail | null;
  taskId: string;
  titleHint?: string;
  fallbackError?: string | null;
  onConfirmAndContinue?: () => void;
  isConfirmingAndContinuing?: boolean;
  quickRetryLabel?: string;
}

type DirectorStepVisualStatus = DirectorPreparationStepStatus;
type DirectorStepDefinition = {
  key: string;
  label: string;
};

const DIRECTOR_EXECUTION_STEPS: DirectorStepDefinition[] = [
  { key: "novel_create", label: "Create project" },
  { key: "book_contract", label: "Book contract + story macro plan" },
  { key: "character_setup", label: "Prepare characters" },
  { key: "volume_strategy", label: "Volume strategy + outline" },
  { key: "beat_sheet", label: "Volume 1 beat sheet + chapter list" },
  { key: "chapter_detail_bundle", label: "Refine chapters in batches" },
];

const DIRECTOR_CANDIDATE_SETUP_STEP_KEYS = new Set<string>(
  DIRECTOR_CANDIDATE_SETUP_STEPS.map((step) => step.key),
);

const DIRECTOR_CANDIDATE_SETUP_STEP_LABELS: Record<string, string> = {
  candidate_seed_alignment: "Organize project details",
  candidate_project_framing: "Align book positioning",
  candidate_direction_batch: "Generate book concepts",
  candidate_title_pack: "Refine title options",
};

const AUTO_DIRECTOR_PLACEHOLDER_TITLES = new Set([
  "AI 自动导演小说",
  "小说流程任务",
]);

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "None";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "None";
  }
  return date.toLocaleString();
}

function formatTokenCount(value: number | null | undefined): string {
  return new Intl.NumberFormat("zh-CN").format(Math.max(0, Math.round(value ?? 0)));
}

function resolveAutoExecutionScopeLabel(task: UnifiedTaskDetail | null): string {
  const seedPayload = extractDirectorTaskSeedPayloadFromMeta(task?.meta) as {
    autoExecution?: {
      scopeLabel?: string | null;
      totalChapterCount?: number | null;
    } | null;
  } | null;
  const scopeLabel = seedPayload?.autoExecution?.scopeLabel?.trim();
  if (scopeLabel) {
    return scopeLabel;
  }
  const fallbackCount = Math.max(1, Math.round(seedPayload?.autoExecution?.totalChapterCount ?? 10));
  return `First ${fallbackCount} chapters`;
}

function resolveDirectorStyleSeed(task: UnifiedTaskDetail | null): {
  title: string;
  summaryLines: string[];
} | null {
  const seedPayload = extractDirectorTaskSeedPayloadFromMeta(task?.meta);
  const styleIntentSummary = seedPayload?.styleIntentSummary;
  if (styleIntentSummary?.headline?.trim()) {
    return {
      title: styleIntentSummary.styleProfileName?.trim() || styleIntentSummary.headline.trim(),
      summaryLines: styleIntentSummary.stageSummaryLines ?? [],
    };
  }
  const fallbackTone = typeof (seedPayload as { styleTone?: unknown } | null)?.styleTone === "string"
    ? (((seedPayload as { styleTone?: string }).styleTone ?? "").trim())
    : "";
  if (!fallbackTone) {
    return null;
  }
  return {
    title: fallbackTone,
    summaryLines: [`Style keywords: ${fallbackTone}`],
  };
}

function formatCheckpoint(
  checkpoint: NovelWorkflowMilestoneType | null | undefined,
  task: UnifiedTaskDetail | null,
): string {
  if (checkpoint === "rewrite_snapshot_created") {
    return "Pre-rewrite backup created";
  }
  if (checkpoint === "candidate_selection_required") {
    return "Awaiting confirmation of book direction";
  }
  if (checkpoint === "book_contract_ready") {
    return "Book contract ready";
  }
  if (checkpoint === "character_setup_required") {
    return "Character preparation awaiting review";
  }
  if (checkpoint === "volume_strategy_ready") {
    return "Volume strategy ready";
  }
  if (checkpoint === "production_experience_required") {
    return "Ready to draft. Choose a writing experience.";
  }
  if (checkpoint === "chapter_batch_ready") {
    return `Automatic execution paused for ${resolveAutoExecutionScopeLabel(task)}`;
  }
  if (checkpoint === "step_review_required") {
    return "Current step awaiting review";
  }
  if (checkpoint === "replan_required") {
    return "Replanning required";
  }
  if (checkpoint === "workflow_completed") {
    return "Main workflow complete";
  }
  return "None";
}

function isCandidateSetupFlow(task: UnifiedTaskDetail | null): boolean {
  return DIRECTOR_CANDIDATE_SETUP_STEP_KEYS.has(task?.currentItemKey ?? "");
}

function resolveDirectorExecutionStepIndex(task: UnifiedTaskDetail | null): number {
  const itemKey = task?.currentItemKey ?? "";
  const chapterExecutionKeys = new Set([
    "chapter_execution",
    "chapter_execution_node",
    "chapter.draft.write",
    "chapter.write",
  ]);
  const qualityRepairKeys = new Set([
    "reviewing",
    "repairing",
    "quality_repair",
    "chapter_quality_review_node",
    "chapter.quality.review",
    "chapter_state_commit_node",
    "chapter.state.commit",
  ]);
  if (qualityRepairKeys.has(itemKey)) {
    return 5;
  }
  if (
    (task?.status === "running" && task?.checkpointType === "chapter_batch_ready")
    || itemKey === "chapter_detail_bundle"
    || chapterExecutionKeys.has(itemKey)
  ) {
    return 5;
  }
  if (itemKey === "beat_sheet" || itemKey === "chapter_list" || itemKey === "chapter_sync") {
    return 4;
  }
  if (
    task?.checkpointType === "character_setup_required"
    || itemKey === "character_setup"
    || itemKey === "character_cast_apply"
  ) {
    return 2;
  }
  if (
    task?.checkpointType === "volume_strategy_ready"
    || itemKey === "volume_strategy"
    || itemKey === "volume_skeleton"
  ) {
    return 3;
  }
  if (
    task?.checkpointType === "book_contract_ready"
    || itemKey === "book_contract"
    || itemKey === "story_macro"
    || itemKey === "constraint_engine"
  ) {
    return 1;
  }
  return 0;
}

function resolveCandidateSetupStepIndex(task: UnifiedTaskDetail | null): number {
  const itemKey = task?.currentItemKey ?? "";
  const foundIndex = DIRECTOR_CANDIDATE_SETUP_STEPS.findIndex((step) => step.key === itemKey);
  return foundIndex >= 0 ? foundIndex : 0;
}

function resolveDirectorStepStatuses(
  task: UnifiedTaskDetail | null,
  mode: DirectorExecutionViewMode,
  steps: ReadonlyArray<DirectorStepDefinition>,
): DirectorStepVisualStatus[] {
  if (task?.status === "succeeded") {
    return steps.map(() => "completed");
  }

  const currentIndex = isCandidateSetupFlow(task)
    ? resolveCandidateSetupStepIndex(task)
    : resolveDirectorExecutionStepIndex(task);
  return steps.map((_, index) => {
    if (index < currentIndex) {
      return "completed";
    }
    if (index === currentIndex) {
      return mode === "execution_failed" || task?.pendingManualRecovery ? "failed" : "running";
    }
    return "pending";
  });
}

function mapDisplayStepStatus(status: DirectorDisplayStepStatus | null | undefined): DirectorStepVisualStatus {
  if (status === "completed") {
    return "completed";
  }
  if (status === "running") {
    return "running";
  }
  if (status === "attention") {
    return "failed";
  }
  return "pending";
}

function mapDashboardModeToContainerMode(mode: DirectorDashboardMode | null | undefined): AITakeoverMode {
  switch (mode) {
    case "failed":
      return "failed";
    case "recovering":
      return "action_required";
    case "waiting_user":
      return "waiting";
    case "idle":
      return "loading";
    case "queued":
    case "completed":
    case "running":
    default:
      return "running";
  }
}

export default function NovelAutoDirectorProgressPanel({
  mode,
  task,
  taskId,
  titleHint,
  fallbackError,
  onConfirmAndContinue,
  isConfirmingAndContinuing = false,
  quickRetryLabel,
}: NovelAutoDirectorProgressPanelProps) {
  const taskChapterTitleWarning = resolveChapterTitleWarning(task);
  const chapterTitleRepairMutation = useDirectorChapterTitleRepair();
  const runtimeTaskId = task?.id ?? taskId;
  const snapshotQuery = useQuery({
    queryKey: queryKeys.tasks.directorTaskSnapshot(runtimeTaskId || "none"),
    queryFn: () => getDirectorTaskSnapshot(runtimeTaskId),
    enabled: Boolean(runtimeTaskId),
    retry: false,
    placeholderData: (previousData) => previousData,
    refetchInterval: () => (
      task && (task.status === "queued" || task.status === "running" || task.status === "waiting_approval") ? 4000 : false
    ),
  });
  const snapshot = snapshotQuery.data?.data?.snapshot ?? null;
  const dashboardView = snapshot?.dashboardView ?? null;
  const displayState = snapshot?.displayState ?? null;
  const runtimeProjection = snapshot?.projection ?? null;
  const taskHasTerminalFailure = task?.status === "failed" || task?.status === "cancelled";
  const dashboardViewForDisplay = taskHasTerminalFailure ? null : dashboardView;
  const displayStateForDisplay = taskHasTerminalFailure ? null : displayState;
  const staleActionProjection = Boolean(
    dashboardViewForDisplay?.mode === "running"
    && (
      runtimeProjection?.requiresUserAction
      || runtimeProjection?.status === "blocked"
      || runtimeProjection?.status === "waiting_approval"
    ),
  );
  const runtimeProjectionForDisplay = dashboardViewForDisplay?.mode === "recovering" || staleActionProjection ? null : runtimeProjection;
  const chapterFacts = snapshot?.factSummary?.chapterExecutionFacts
    ?? runtimeProjectionForDisplay?.factSummary?.chapterExecutionFacts
    ?? null;
  const chapterProductionStarted = resolveDirectorExecutionStepIndex(task) >= 5;
  const chapterProgress = chapterFacts && chapterFacts.totalChapters > 0 && (
    chapterProductionStarted || chapterFacts.completedChapters > 0
  )
    ? {
      completed: chapterFacts.completedChapters,
      total: chapterFacts.expectedChapterCount ?? chapterFacts.totalChapters,
    }
    : null;
  const onboardingNovelId = task?.resumeTarget?.novelId?.trim() || runtimeTaskId;
  const historyEvents = snapshot?.recentEvents ?? [];
  const displayProgress = dashboardViewForDisplay?.progressPercent ?? displayStateForDisplay?.progressPercent ?? task?.progress ?? null;
  const fallbackChapterTitleWarning = !taskChapterTitleWarning && isChapterTitleDiversitySummary(fallbackError)
    ? {
      summary: fallbackError?.trim() ?? "",
      route: null,
      label: "Quickly fix chapter titles",
    }
    : null;
  const rawChapterTitleWarning = taskChapterTitleWarning ?? fallbackChapterTitleWarning;
  const chapterTitleWarning = dashboardViewForDisplay?.mode === "running" || dashboardViewForDisplay?.mode === "queued"
    ? null
    : rawChapterTitleWarning;
  const visualMode: DirectorExecutionViewMode = mode === "execution_failed" && !chapterTitleWarning
    ? "execution_failed"
    : "execution_progress";
  const currentAction = dashboardViewForDisplay?.currentAction
    || displayStateForDisplay?.currentAction
    || runtimeProjectionForDisplay?.currentLabel?.trim()
    || task?.currentItemLabel?.trim()
    || (visualMode === "execution_failed"
      ? "Director task interrupted"
      : (chapterTitleWarning ? "Chapter list generated. Waiting to fix title structure." : "Preparing director task"));
  const activityTags = extractWorkflowActivityTags(displayStateForDisplay?.currentFactStepLabel || task?.currentItemLabel);
  const workflowTitle = task?.title?.trim() || "";
  const hintedTitle = titleHint?.trim() || "";
  const taskTitle = (
    hintedTitle && (!workflowTitle || AUTO_DIRECTOR_PLACEHOLDER_TITLES.has(workflowTitle))
      ? hintedTitle
      : workflowTitle || hintedTitle || "New novel project"
  );
  const milestones = Array.isArray(task?.meta.milestones)
    ? task.meta.milestones as NovelWorkflowMilestone[]
    : [];
  const candidateSetupFlow = isCandidateSetupFlow(task);
  const displaySteps = dashboardViewForDisplay?.steps ?? displayStateForDisplay?.steps ?? [];
  const stepDefinitions = candidateSetupFlow
    ? DIRECTOR_CANDIDATE_SETUP_STEPS.map((step) => ({
      ...step,
      label: DIRECTOR_CANDIDATE_SETUP_STEP_LABELS[step.key] ?? step.label,
    }))
    : displaySteps.map((step) => ({ key: step.key, label: step.label }));
  const steps = candidateSetupFlow
    ? resolveDirectorStepStatuses(task, visualMode, stepDefinitions)
    : displaySteps.map((step) => mapDisplayStepStatus(step.status));
  const failureMessage = task?.lastError?.trim()
    || task?.checkpointSummary?.trim()
    || fallbackError?.trim()
    || "The director task failed without a specific error message.";
  const isHighMemoryConflict = /高内存卷规划生成正在处理同一范围|高内存.*同一范围|已有自动导演任务正在处理同一范围/.test(failureMessage);
  const tokenUsage = task?.tokenUsage ?? null;
  const styleSeed = resolveDirectorStyleSeed(task);
  const containerMode: AITakeoverMode = visualMode === "execution_failed"
    ? "failed"
    : !task
      ? "loading"
      : chapterTitleWarning
        ? "waiting"
        : mapDashboardModeToContainerMode(dashboardViewForDisplay?.mode ?? null);
  const description = candidateSetupFlow
    ? (
      visualMode === "execution_failed"
        ? "Story direction generation was interrupted. You can retry from the current step."
        : "The system will organize the project details, align the book positioning, and generate two book concepts with title options."
    )
    : (
      dashboardViewForDisplay?.description
      || displayStateForDisplay?.description
      || (visualMode === "execution_failed"
        ? "The task stopped at the latest step. You can resume from the current progress."
        : chapterTitleWarning
          ? "The chapter list has been preserved. Quickly fix the title structure, then decide whether to continue the director workflow."
          : task?.status === "waiting_approval"
            ? "The director workflow is awaiting review. Check the results before deciding whether to continue."
            : "You can leave this page while the task continues. Check its progress in the AI cockpit when you return.")
    );
  const resolveDashboardAction = (dashboardAction: DirectorDashboardAction) => {
    if (dashboardAction.type === "confirm_and_continue" && onConfirmAndContinue) {
      return {
        label: isConfirmingAndContinuing ? "Continuing..." : dashboardAction.label,
        onClick: onConfirmAndContinue,
        variant: "default" as const,
        disabled: isConfirmingAndContinuing,
      };
    }
    if (dashboardAction.type === "background_continue" || dashboardAction.type === "open_task_center") return null;
    if ((dashboardAction.type === "resume_from_checkpoint" || dashboardAction.type === "retry") && onConfirmAndContinue) {
      return {
        label: isConfirmingAndContinuing ? "Resuming..." : (isHighMemoryConflict ? "Retry from checkpoint" : dashboardAction.label),
        onClick: onConfirmAndContinue,
        variant: "default" as const,
        disabled: isConfirmingAndContinuing,
      };
    }
    return null;
  };
  const dashboardActions = dashboardViewForDisplay
    ? [
      dashboardViewForDisplay.primaryAction,
      ...dashboardViewForDisplay.secondaryActions,
    ].filter((item): item is DirectorDashboardAction => Boolean(item))
      .map(resolveDashboardAction)
      .filter((item): item is NonNullable<ReturnType<typeof resolveDashboardAction>> => Boolean(item))
    : [];
  const quickRetryAction = quickRetryLabel
    && onConfirmAndContinue
    && (visualMode === "execution_failed" || task?.pendingManualRecovery)
    ? {
        label: isConfirmingAndContinuing ? "Retrying..." : quickRetryLabel,
        onClick: onConfirmAndContinue,
        variant: "default" as const,
        disabled: isConfirmingAndContinuing,
      }
    : null;
  const actions = dashboardActions.length > 0 || !quickRetryAction
    ? dashboardActions
    : [quickRetryAction];

  return (
    <div className="space-y-4">
      <AITakeoverContainer
        mode={containerMode}
        title={visualMode === "execution_failed"
          ? (candidateSetupFlow ? "Story direction generation failed" : "Director execution failed")
          : dashboardViewForDisplay?.mode === "recovering"
            ? `“${taskTitle}” awaiting recovery`
            : candidateSetupFlow
              ? "Generating story directions"
              : `Auto Director is working on “${taskTitle}”`}
        description={description}
        progress={displayProgress}
        currentAction={currentAction}
        checkpointLabel={displayStateForDisplay?.checkpointLabel || formatCheckpoint(task?.checkpointType, task)}
        taskId={task?.id || taskId}
        actions={actions}
      >
        <NovelDirectorPreparationJourney
          steps={candidateSetupFlow
            ? stepDefinitions
            : displaySteps.map((step) => ({ key: step.key, label: step.label }))}
          statuses={steps}
          onboardingStorageKey={`director-preparation-${onboardingNovelId}`}
          chapterProgress={chapterProgress}
        />

        {activityTags.length > 0 ? (
          <div className="mt-4">
            <div className="text-xs font-medium text-muted-foreground">{"Background analysis"}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {activityTags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          </div>
        ) : null}

        <details className="group mt-4 overflow-hidden rounded-2xl border border-border/70 bg-muted/[0.12]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5">
            <div>
              <div className="text-sm font-medium text-foreground">Run details</div>
              <div className="mt-0.5 text-xs text-muted-foreground">View live metrics, events, style, and AI usage</div>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
          </summary>
          <div className="border-t border-border/60 px-4 pb-4">
            <DirectorRuntimeProjectionCard
              projection={runtimeProjectionForDisplay}
              compact
              className="mt-4"
            />

        <div className="mt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-foreground">{"All progress"}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {historyEvents.length > 0 ? `Showing ${historyEvents.length} recent updates` : "Loading progress history"}
              </div>
            </div>
          </div>

          {snapshotQuery.isLoading ? (
            <div className="mt-3 text-sm text-muted-foreground">
              {"Loading progress history."}
            </div>
          ) : historyEvents.length > 0 ? (
            <div className="mt-3 max-h-80 space-y-3 overflow-y-auto border-l border-border/60 pl-3 pr-1">
              {historyEvents.map((event) => (
                <div key={event.eventId} className="text-sm">
                  <div className="font-medium text-foreground">{event.summary}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{"Recorded: "}{formatDate(event.occurredAt)}</span>
                    {event.nodeKey ? <span>{"Step: "}{event.nodeKey}</span> : null}
                    {event.artifactType ? <span>{"Artifact: "}{event.artifactType}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 text-sm text-muted-foreground">
              {"Progress updates will appear here after the task starts."}
            </div>
          )}
        </div>

        {styleSeed ? (
          <div className="mt-5">
            <div className="text-sm font-medium text-foreground">Active style</div>
            <div className="mt-2 text-sm text-foreground">{styleSeed.title}</div>
            {styleSeed.summaryLines.length > 0 ? (
              <div className="mt-3 space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Style summary for this stage</div>
                {styleSeed.summaryLines.map((line) => (
                  <div key={line} className="text-xs leading-6 text-muted-foreground">
                    {line}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {tokenUsage ? (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-lg bg-muted/15 p-3">
              <div className="text-xs text-muted-foreground">Total calls</div>
              <div className="mt-1 text-sm font-medium text-foreground">{formatTokenCount(tokenUsage.llmCallCount)}</div>
            </div>
            <div className="rounded-lg bg-muted/15 p-3">
              <div className="text-xs text-muted-foreground">Input tokens</div>
              <div className="mt-1 text-sm font-medium text-foreground">{formatTokenCount(tokenUsage.promptTokens)}</div>
            </div>
            <div className="rounded-lg bg-muted/15 p-3">
              <div className="text-xs text-muted-foreground">Output tokens</div>
              <div className="mt-1 text-sm font-medium text-foreground">{formatTokenCount(tokenUsage.completionTokens)}</div>
            </div>
            <div className="rounded-lg bg-muted/15 p-3">
              <div className="text-xs text-muted-foreground">Total tokens</div>
              <div className="mt-1 text-sm font-medium text-foreground">{formatTokenCount(tokenUsage.totalTokens)}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Last recorded: {formatDate(tokenUsage.lastRecordedAt)}</div>
            </div>
          </div>
        ) : null}
          </div>
        </details>

        {chapterTitleWarning ? (
          <div className="mt-4 rounded-xl border border-amber-300/60 bg-amber-50/80 p-4 text-sm text-amber-950">
            <div className="font-medium">Current notice</div>
            <div className="mt-1">{chapterTitleWarning.summary}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {task && chapterTitleWarning ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    chapterTitleRepairMutation.startRepair(task);
                  }}
                  disabled={chapterTitleRepairMutation.isPending}
                >
                  {chapterTitleRepairMutation.isPending && chapterTitleRepairMutation.pendingTaskId === task.id
                    ? "AI is fixing..."
                    : chapterTitleWarning.label}
                </Button>
              ) : null}
            </div>
          </div>
        ) : visualMode === "execution_failed" ? (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <div className="font-medium">Failure summary</div>
            <div className="mt-1">{failureMessage}</div>
            {isHighMemoryConflict ? (
              <div className="mt-3 rounded-lg border border-destructive/20 bg-background/60 p-3 text-xs leading-5 text-destructive/90">
                This resource conflict is recoverable. Completed setup and chapter plans will not be lost. Once the resource is available, resume from the latest safe checkpoint without starting over.
              </div>
            ) : null}
            {task?.recoveryHint ? (
              <div className="mt-2 text-xs text-destructive/80">Recovery suggestion: {task.recoveryHint}</div>
            ) : null}
            {isHighMemoryConflict && onConfirmAndContinue ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={onConfirmAndContinue}
                  disabled={isConfirmingAndContinuing}
                >
                  {isConfirmingAndContinuing ? "Resuming..." : "Retry from checkpoint"}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </AITakeoverContainer>

      <details className="group rounded-2xl border border-border/70 bg-background">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5">
          <div>
            <div className="text-sm font-medium text-foreground">Milestone history</div>
            <div className="mt-0.5 text-xs text-muted-foreground">Review recoverable checkpoints and completion records</div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
        </summary>
        <div className="border-t border-border/60 px-4 pb-4 pt-1">
        {milestones.length > 0 ? (
          <div className="mt-3 space-y-3 border-l border-border/60 pl-3">
            {milestones
              .slice()
              .reverse()
              .map((item) => (
                <div key={`${item.checkpointType}:${item.createdAt}`} className="text-sm">
                  <div className="font-medium text-foreground">{formatCheckpoint(item.checkpointType, task)}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{item.summary}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Recorded: {formatDate(item.createdAt)}</div>
                </div>
              ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-muted-foreground">
            Task created. Waiting for the first stable milestone.
          </div>
        )}
        </div>
      </details>
    </div>
  );
}
