import type {
  NovelAutoDirectorTaskSummary,
  ProjectProgressStatus,
} from "@ai-novel/shared/types/novel";
import type { NovelListResponse } from "@/api/novel/shared";
import {
  canContinueChapterBatchAutoExecution,
  canContinueDirector,
  canEnterChapterExecution,
  getWorkflowDescription,
  isWorkflowRunningInBackground,
  requiresCandidateSelection,
} from "@/lib/novelWorkflowTaskUi";
import { featureFlags } from "@/config/featureFlags";
import {getDirectorWorkspaceHref} from "@/lib/novelRoutes";

export type NovelListItem = NovelListResponse["items"][number];
export type StatusFilter = "all" | "draft" | "published";
export type WritingModeFilter = "all" | "original" | "continuation";
export type NovelListTone = "neutral" | "info" | "success" | "warning" | "danger";

export const DIRECTOR_CREATE_LINK = "/novels/auto-director";
export const REFERENCE_CREATE_LINK = "/novels/auto-director?start=reference";
export const SHORT_STORY_CREATE_LINK = featureFlags.creationStudioEnabled
  ? "/create?form=short_story"
  : null;
export const PRIMARY_CREATE_LABEL = "Create with Auto Director";
export const REFERENCE_CREATE_LABEL = "Write from a reference novel";
export const MANUAL_CREATE_LINK = "/novels/create";
export const NOVEL_LIST_PAGE_SIZE = 24;

export interface NovelListSummaryItem {
  id: string;
  label: string;
  value: number;
  tone: NovelListTone;
}

export interface WorkflowDisplay {
  tone: NovelListTone;
  label: string;
  description: string;
  progress: number;
  currentStage: string;
  currentAction: string;
  lastHealthyStage: string;
  running: boolean;
}

export function getNovelWorkflowTask(novel: NovelListItem): NovelAutoDirectorTaskSummary | null {
  if (getDirectorWorkspaceHref(novel)) return null;
  return novel.narrativeForm === "short_story"
    ? novel.latestCreationStudioTask ?? null
    : novel.latestAutoDirectorTask ?? null;
}

export function filterNovelList(input: {
  novels: NovelListItem[];
  status: StatusFilter;
  writingMode: WritingModeFilter;
}): NovelListItem[] {
  return input.novels.filter((item) => {
    if (input.status !== "all" && item.status !== input.status) {
      return false;
    }
    if (input.writingMode !== "all" && item.writingMode !== input.writingMode) {
      return false;
    }
    return true;
  });
}

export function formatProgressStatus(status?: ProjectProgressStatus | null): string {
  if (status === "completed") {
    return "Completed";
  }
  if (status === "in_progress") {
    return "In progress";
  }
  if (status === "rework") {
    return "Needs revision";
  }
  if (status === "blocked") {
    return "Blocked";
  }
  return "Not started";
}

export function formatTokenCount(value?: number | null): string {
  const normalized = typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : 0;
  return new Intl.NumberFormat("en-US").format(normalized);
}

export function buildNovelListSummary(novels: NovelListItem[]): NovelListSummaryItem[] {
  const running = novels.filter((novel) => {
    const task = getNovelWorkflowTask(novel);
    return task?.status === "queued" || task?.status === "running";
  }).length;
  const waiting = novels.filter((novel) => getNovelWorkflowTask(novel)?.status === "waiting_approval").length;
  const ready = novels.filter((novel) => (
    novel.narrativeForm === "short_story"
      ? getNovelWorkflowTask(novel)?.status === "succeeded"
      : canEnterChapterExecution(getNovelWorkflowTask(novel))
  )).length;
  const issue = novels.filter((novel) => {
    const status = getNovelWorkflowTask(novel)?.status;
    return status === "failed" || status === "cancelled";
  }).length;

  return [
    { id: "running", label: "In progress", value: running, tone: running > 0 ? "info" : "neutral" },
    { id: "waiting", label: "Needs review", value: waiting, tone: waiting > 0 ? "warning" : "neutral" },
    { id: "ready", label: "Ready to continue", value: ready, tone: ready > 0 ? "success" : "neutral" },
    { id: "issue", label: "Paused / failed", value: issue, tone: issue > 0 ? "danger" : "neutral" },
  ];
}

export function getWorkflowTone(task?: NovelAutoDirectorTaskSummary | null): NovelListTone {
  if (!task) {
    return "neutral";
  }
  if (task.status === "failed" || task.status === "cancelled") {
    return "danger";
  }
  if (task.status === "waiting_approval") {
    return "warning";
  }
  if (canEnterChapterExecution(task)) {
    return "success";
  }
  if (task.status === "running" || task.status === "queued") {
    return "info";
  }
  return "neutral";
}

export function buildWorkflowDisplay(novel: NovelListItem): WorkflowDisplay {
  const task = getNovelWorkflowTask(novel);
  if (novel.narrativeForm === "short_story") {
    return {
      tone: task?.status === "failed" ? "danger" : task?.status === "succeeded" ? "success" : "info",
      label: task?.status === "succeeded" ? "Complete short story" : "Writing short story",
      description: task?.checkpointSummary?.trim()
        || task?.currentItemLabel?.trim()
        || novel.description?.trim()
        || "AI is turning the approved direction into a complete story.",
      progress: Math.round((task?.progress ?? 0) * 100),
      currentStage: "Story writing",
      currentAction: task?.currentItemLabel?.trim() || "",
      lastHealthyStage: "",
      running: task?.status === "queued" || task?.status === "running",
    };
  }
  const description = getWorkflowDescription(task);
  if (!task) {
    return {
      tone: "neutral",
      label: "Project details",
      description: novel.description?.trim() || "No Auto Director task yet. Open the project to refine its details or chapters.",
      progress: 0,
      currentStage: "Auto Director not started",
      currentAction: "",
      lastHealthyStage: "",
      running: false,
    };
  }
  const currentAction = task.currentItemLabel?.trim() || "";
  return {
    tone: getWorkflowTone(task),
    label: task.displayStatus?.trim() || task.resumeAction?.trim() || task.nextActionLabel?.trim() || "Auto Director",
    description: description || "Your progress is saved. Review it or resume the workflow.",
    progress: Math.round(task.progress * 100),
    currentStage: task.currentStage ?? "Auto Director",
    currentAction,
    lastHealthyStage: task.lastHealthyStage ?? "",
    running: isWorkflowRunningInBackground(task),
  };
}

export function getPrimaryActionLabel(novel: NovelListItem): string {
  if (novel.narrativeForm === "short_story") {
    return "Open story";
  }
  if (getDirectorWorkspaceHref(novel)) return "Open Auto Director";
  const task = getNovelWorkflowTask(novel);
  if (canContinueChapterBatchAutoExecution(task)) {
    return task?.resumeAction ?? `Continue automatic execution${task?.executionScopeLabel ?? " for the current chapter range"}`;
  }
  if (canContinueDirector(task)) {
    return task?.resumeAction ?? "Continue Auto Director";
  }
  if (requiresCandidateSelection(task)) {
    return task?.resumeAction ?? "Confirm direction";
  }
  if (canEnterChapterExecution(task)) {
    return "Start writing chapters";
  }
  if (task) {
    return "View progress";
  }
  return "Edit novel";
}

export function getProjectAssetRows(novel: NovelListItem): Array<{
  label: string;
  value: string;
  tone?: NovelListTone;
}> {
  if (novel.narrativeForm === "short_story") {
    return [
      { label: "Format", value: "Short story" },
      { label: "Target", value: `${(novel.targetWordCount ?? 0).toLocaleString("en-US")} words` },
      { label: "Text", value: getNovelWorkflowTask(novel)?.status === "succeeded" ? "Complete" : "Generating", tone: "info" },
      { label: "Source", value: novel.derivedFromNovelId ? "Derivative" : "Original" },
    ];
  }
  return [
    { label: "Chapters", value: String(novel._count.chapters) },
    { label: "Characters", value: String(novel._count.characters) },
    {
      label: "World",
      value: novel.world?.name ?? "Not linked",
      tone: novel.world?.name ? "neutral" : "warning",
    },
    {
      label: "Resources",
      value: `${novel.resourceReadyScore ?? 0}/100`,
      tone: (novel.resourceReadyScore ?? 0) >= 60 ? "success" : "warning",
    },
  ];
}
