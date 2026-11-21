import type {
  DirectorTaskSnapshot,
} from "@ai-novel/shared/types/directorRuntime";
import type {
  DirectorAutoExecutionPlan,
  DirectorRunMode,
  DirectorTakeoverEntryReadiness,
  DirectorTakeoverEntryStep,
  DirectorTakeoverPreview,
  DirectorTakeoverReadinessResponse,
  DirectorTakeoverStrategy,
} from "@ai-novel/shared/types/novelDirector";

type TakeoverScopeMode = "book" | "chapter_range" | "volume";

export interface TakeoverGuidanceViewModel {
  diagnosis: string;
  nextStep: string;
  protectionNotes: string[];
  riskLevel: "safe" | "caution";
  actionLabel: string;
}

export interface TakeoverProgressCard {
  title: string;
  status: string;
  detail: string;
}

export interface TakeoverProgressInspectionViewModel {
  cards: TakeoverProgressCard[];
  summary: string;
}

export interface TakeoverChapterTargetViewModel {
  startOrder: number;
  maxOrder: number;
  selectedOrder: number;
  plan: DirectorAutoExecutionPlan;
  actionLabel: string;
  summary: string;
}

export interface TakeoverContinuousTargetViewModel {
  startOrder: number;
  currentWindowEndOrder: number;
  targetOrder: number;
  selectedOrder: number;
  actionLabel: string;
  summary: string;
}

const ENTRY_STEP_USER_LABELS: Record<DirectorTakeoverEntryStep, string> = {
  basic: "Project setup",
  story_macro: "Story macro plan",
  world: "World setup",
  character: "Character setup",
  outline: "Volume planning",
  structured: "Beats and chapter breakdown",
  chapter: "Chapter execution",
  pipeline: "Quality repair",
};

const RUN_MODE_ACTION_LABELS: Record<DirectorRunMode, string> = {
  auto_to_ready: "Continue until ready to draft",
  auto_to_execution: "Continue within selected scope",
  full_book_autopilot: "Take over and continue the entire book",
  stage_review: "Continue",
};

export function isTakeoverEntryStepAllowedForScope(
  entryStep: DirectorTakeoverEntryStep,
  scopeMode: TakeoverScopeMode,
): boolean {
  if (scopeMode === "chapter_range") {
    return entryStep === "structured" || entryStep === "chapter" || entryStep === "pipeline";
  }
  if (scopeMode === "volume") {
    return entryStep === "outline" || entryStep === "structured" || entryStep === "chapter" || entryStep === "pipeline";
  }
  return true;
}

export function resolveRecommendedTakeoverEntryStep(
  readiness: DirectorTakeoverReadinessResponse | null,
  scopeMode: TakeoverScopeMode,
): DirectorTakeoverEntryStep | null {
  if (!readiness) {
    return null;
  }
  const allowed = (entry: DirectorTakeoverEntryReadiness) => (
    entry.available && isTakeoverEntryStepAllowedForScope(entry.step, scopeMode)
  );
  return (
    readiness.entrySteps.find((entry) => entry.recommended && allowed(entry))
    ?? readiness.entrySteps.find(allowed)
    ?? null
  )?.step ?? null;
}

export function findTakeoverPreview(
  readiness: DirectorTakeoverReadinessResponse | null,
  entryStep: DirectorTakeoverEntryStep,
  strategy: DirectorTakeoverStrategy,
): DirectorTakeoverPreview | null {
  return readiness?.entrySteps
    .find((entry) => entry.step === entryStep)
    ?.previews.find((preview) => preview.strategy === strategy) ?? null;
}

export function buildTakeoverGuidance(
  readiness: DirectorTakeoverReadinessResponse | null,
  entryStep: DirectorTakeoverEntryStep,
  strategy: DirectorTakeoverStrategy,
  runMode: DirectorRunMode,
  taskSnapshot?: DirectorTaskSnapshot | null,
): TakeoverGuidanceViewModel {
  const task = taskSnapshot?.task ?? null;
  const chapterProgress = taskSnapshot?.chapterProgress ?? taskSnapshot?.projection?.chapterExecutionProgress ?? null;
  if (task && (task.status === "queued" || task.status === "running" || task.status === "waiting_approval")) {
    const currentStage = task.currentStage?.trim() || taskSnapshot?.displayState.stageLabel || "Current task";
    const currentLabel = task.currentItemLabel?.trim() || taskSnapshot?.displayState.currentAction || "Waiting to continue";
    const nextChapterOrder = chapterProgress?.currentChapterOrder ?? chapterProgress?.activeChapterOrder ?? null;
    return {
      diagnosis: `An existing director task is paused at "${currentStage}".`,
      nextStep: nextChapterOrder
        ? `Chapter execution has reached around Chapter ${nextChapterOrder}. Return to the current task to continue.`
        : `Current task status: ${currentLabel}.`,
      protectionNotes: [
        `Task status: ${task.status}`,
        currentLabel,
        "Continuing this task won't create a duplicate takeover.",
      ],
      riskLevel: "safe",
      actionLabel: "Open current task",
    };
  }
  if (!readiness) {
    return {
      diagnosis: "Loading project progress. A recommended point to continue will appear when it's ready.",
      nextStep: "Continue when loading is complete.",
      protectionNotes: ["Existing writing assets are preserved by default."],
      riskLevel: "safe",
      actionLabel: RUN_MODE_ACTION_LABELS[runMode] ?? "Continue",
    };
  }
  const preview = findTakeoverPreview(readiness, entryStep, strategy);
  const entryLabel = ENTRY_STEP_USER_LABELS[preview?.effectiveStep ?? entryStep] ?? "Recommended point";
  const hasCharacters = readiness.snapshot.characterCount > 0;
  const hasVolumes = readiness.snapshot.volumeCount > 0;
  const hasChapters = readiness.snapshot.chapterCount > 0;
  const protectionNotes = [
    hasCharacters ? `Preserve ${readiness.snapshot.characterCount} existing character assets.` : "No existing characters detected. AI will prepare the cast.",
    hasVolumes ? "Keep the existing volume plans and fill only the remaining gaps." : "No volume plan detected. AI will generate one.",
    hasChapters ? `Preserve existing drafts or chapter assets for ${readiness.snapshot.chapterCount} chapters.` : "No generated drafts detected.",
  ];
  const riskLevel = strategy === "restart_current_step" ? "caution" : "safe";
  return {
    diagnosis: `The project can continue from "${entryLabel}".`,
    nextStep: preview?.summary ?? `AI will continue from "${entryLabel}".`,
    protectionNotes,
    riskLevel,
    actionLabel: buildPrimaryActionLabel({
      fallback: RUN_MODE_ACTION_LABELS[runMode] ?? "Continue",
      taskSnapshot,
      readiness,
    }),
  };
}

function formatRatio(done: number, total: number): string {
  if (total <= 0) {
    return done > 0 ? `${done} items` : "None";
  }
  return `${done} / ${total}`;
}

function buildPrimaryActionLabel(input: {
  fallback: string;
  taskSnapshot?: DirectorTaskSnapshot | null;
  readiness?: DirectorTakeoverReadinessResponse | null;
}): string {
  const progress = input.taskSnapshot?.chapterProgress
    ?? input.taskSnapshot?.projection?.chapterExecutionProgress
    ?? null;
  if (progress?.currentChapterOrder) {
    return `Continue drafting Chapter ${progress.currentChapterOrder}`;
  }
  const drafted = progress?.draftedChapterCount ?? input.readiness?.snapshot.generatedChapterCount ?? 0;
  const approved = progress?.approvedChapterCount ?? input.readiness?.snapshot.approvedChapterCount ?? 0;
  if (drafted > approved) {
    return "Review chapters awaiting approval";
  }
  if ((input.readiness?.snapshot.chapterCount ?? 0) > 0) {
    return "Continue chapter execution";
  }
  return input.fallback;
}

function normalizePositiveOrder(value: number | null | undefined): number | null {
  if (!Number.isFinite(value ?? NaN) || !value || value < 1) {
    return null;
  }
  return Math.max(1, Math.round(value));
}

function maxNormalizedOrder(values: Array<number | null | undefined>): number | null {
  const normalized = values
    .map(normalizePositiveOrder)
    .filter((value): value is number => Boolean(value));
  if (normalized.length === 0) {
    return null;
  }
  return Math.max(...normalized);
}

export function buildTakeoverChapterTarget(
  readiness: DirectorTakeoverReadinessResponse | null,
  taskSnapshot?: DirectorTaskSnapshot | null,
  selectedOrder?: number | null,
): TakeoverChapterTargetViewModel | null {
  const progress = taskSnapshot?.chapterProgress
    ?? taskSnapshot?.projection?.chapterExecutionProgress
    ?? null;
  const snapshot = readiness?.snapshot ?? null;
  const writtenChapterCount = maxNormalizedOrder([
    progress?.draftedChapterCount,
    progress?.completedChapters,
    snapshot?.generatedChapterCount,
  ]);
  const startOrder = maxNormalizedOrder([
    progress?.currentChapterOrder
      ?? null,
    progress?.activeChapterOrder
      ?? null,
    readiness?.executableRange?.nextChapterOrder
      ?? null,
    writtenChapterCount ? writtenChapterCount + 1 : null,
    snapshot?.approvedChapterCount ? snapshot.approvedChapterCount + 1 : null,
  ]);
  const totalChapters = maxNormalizedOrder([
    progress?.totalChapters
      ?? null,
    snapshot?.plannedChapterCount
      ?? null,
    readiness?.executableRange?.endOrder
      ?? null,
    snapshot?.chapterCount
      ?? null,
    snapshot?.firstVolumeChapterCount
      ?? null,
  ]);
  if (!startOrder || !totalChapters || startOrder > totalChapters) {
    return null;
  }
  const normalizedSelected = normalizePositiveOrder(selectedOrder ?? null);
  const selected = normalizedSelected
    ? Math.min(Math.max(normalizedSelected, startOrder), totalChapters)
    : startOrder;
  const plan: DirectorAutoExecutionPlan = {
    mode: "chapter_range",
    startOrder,
    endOrder: selected,
    autoReview: true,
    autoRepair: true,
  };
  return {
    startOrder,
    maxOrder: totalChapters,
    selectedOrder: selected,
    plan,
    actionLabel: `Continue through Chapter ${selected}`,
    summary: selected === startOrder
      ? `Continue from Chapter ${startOrder}.`
      : `Continue from Chapter ${startOrder} through Chapter ${selected}.`,
  };
}

export function buildTakeoverContinuousTarget(
  readiness: DirectorTakeoverReadinessResponse | null,
  taskSnapshot?: DirectorTaskSnapshot | null,
  selectedOrder?: number | null,
): TakeoverContinuousTargetViewModel | null {
  const currentWindow = readiness
    ? buildTakeoverChapterTarget({
      ...readiness,
      snapshot: { ...readiness.snapshot, plannedChapterCount: null },
    }, taskSnapshot)
    : null;
  const targetOrder = normalizePositiveOrder(readiness?.snapshot.plannedChapterCount ?? null);
  if (!currentWindow || !targetOrder || targetOrder <= currentWindow.maxOrder) {
    return null;
  }
  const normalizedSelected = normalizePositiveOrder(selectedOrder ?? null);
  const resolvedSelected = normalizedSelected
    ? Math.min(Math.max(normalizedSelected, currentWindow.startOrder), targetOrder)
    : targetOrder;
  return {
    startOrder: currentWindow.startOrder,
    currentWindowEndOrder: currentWindow.maxOrder,
    targetOrder,
    selectedOrder: resolvedSelected,
    actionLabel: resolvedSelected === targetOrder ? `Continue through Chapter ${targetOrder}` : `Continue through Chapter ${resolvedSelected}`,
    summary: resolvedSelected === targetOrder
      ? `Continue through Chapters ${currentWindow.startOrder}–${currentWindow.maxOrder} first. Near the end of this range, AI will add the next volume outline and chapter breakdown without planning distant chapters too early.`
      : `This run will cover Chapters ${currentWindow.startOrder}–${resolvedSelected}. You can continue from the current progress later; the planned total is ${targetOrder} chapters.`,
  };
}

export function buildTakeoverProgressInspection(
  readiness: DirectorTakeoverReadinessResponse | null,
  taskSnapshot?: DirectorTaskSnapshot | null,
): TakeoverProgressInspectionViewModel {
  const factSummary = taskSnapshot?.factSummary ?? taskSnapshot?.projection?.factSummary ?? null;
  const outline = factSummary?.outlineFacts ?? null;
  const chapterFacts = factSummary?.chapterExecutionFacts ?? null;
  const repairFacts = factSummary?.repairFacts ?? null;
  const chapterProgress = taskSnapshot?.chapterProgress ?? taskSnapshot?.projection?.chapterExecutionProgress ?? null;
  const snapshot = readiness?.snapshot ?? null;
  const volumeRanges = snapshot?.volumeChapterRanges ?? [];
  const syncedChapterCount = outline?.syncedChapterCount ?? snapshot?.chapterCount ?? 0;
  const plannedChapterCount = outline?.plannedChapterCount ?? snapshot?.chapterCount ?? chapterProgress?.totalChapters ?? 0;
  const selectedChapterCount = outline?.selectedChapterCount ?? readiness?.executableRange?.totalChapterCount ?? 0;
  const detailDone = outline?.completedDetailSteps ?? snapshot?.firstVolumePreparedChapterCount ?? 0;
  const detailTotal = outline?.totalDetailSteps ?? selectedChapterCount;
  const drafted = chapterProgress?.draftedChapterCount ?? chapterFacts?.draftedChapterCount ?? snapshot?.generatedChapterCount ?? 0;
  const approved = chapterProgress?.approvedChapterCount ?? chapterFacts?.approvedChapterCount ?? snapshot?.approvedChapterCount ?? 0;
  const reviewed = chapterFacts?.reviewedChapterCount ?? repairFacts?.reviewedChapterCount ?? 0;
  const pendingRepair = chapterProgress?.needsRepairChapters ?? chapterFacts?.needsRepairChapters ?? snapshot?.pendingRepairChapterCount ?? 0;
  const nextChapterOrder = chapterProgress?.currentChapterOrder ?? readiness?.executableRange?.nextChapterOrder ?? null;

  const cards: TakeoverProgressCard[] = [
    {
      title: "Volume planning progress",
      status: factSummary?.hasVolumeStrategy || (snapshot?.volumeCount ?? 0) > 0 ? "Volume strategy ready" : "Volume strategy needed",
      detail: snapshot
        ? `${snapshot.volumeCount} volumes; ${snapshot.firstVolumeChapterCount} chapters in the current volume; broken-down ranges: ${volumeRanges.map((range) => `Chapters ${range.startOrder}–${range.endOrder}`).join(", ") || "None"}`
        : "Loading volume plans...",
    },
    {
      title: "Chapter breakdown sync",
      status: formatRatio(syncedChapterCount, plannedChapterCount),
      detail: selectedChapterCount > 0
        ? `Current executable range: Chapters ${readiness?.executableRange?.startOrder ?? 1}–${readiness?.executableRange?.endOrder ?? selectedChapterCount}.`
        : "No executable chapter range detected.",
    },
    {
      title: "Chapter refinement progress",
      status: formatRatio(detailDone, detailTotal),
      detail: outline?.chapterDetailReady || detailDone > 0
        ? `${detailDone} chapter task sheets / execution resources prepared.`
        : "No chapter refinement resources detected.",
    },
    {
      title: "Draft and quality progress",
      status: formatRatio(drafted, chapterProgress?.totalChapters ?? chapterFacts?.totalChapters ?? plannedChapterCount),
      detail: [
        reviewed > 0 ? `${reviewed} chapters reviewed` : "",
        approved > 0 ? `${approved} chapters approved` : "",
        pendingRepair > 0 ? `${pendingRepair} chapters need follow-up` : "",
        nextChapterOrder ? `Next: Chapter ${nextChapterOrder}` : "",
      ].filter(Boolean).join("; ") || "Drafting has not started yet.",
    },
  ];

  return {
    cards,
    summary: taskSnapshot?.task
      ? `Current task: ${taskSnapshot.task.currentStage || taskSnapshot.displayState.stageLabel || "Auto Director"} / ${taskSnapshot.task.currentItemLabel || taskSnapshot.displayState.currentAction || "Waiting to continue"}`
      : "Detected asset progress for this project.",
  };
}

export function formatTakeoverStartError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || "");
  if (message.includes("章节范围只能从节奏拆章、章节执行或质量修复开始")) {
    return "This project has not reached chapter production yet, so it cannot continue directly from a chapter range. Use the system's recommended point instead.";
  }
  if (message.includes("当前已有自动导演任务")) {
    return "An Auto Director task is already working on this book. Open or cancel that task before starting a takeover.";
  }
  return message || "Failed to start Auto Director takeover.";
}
