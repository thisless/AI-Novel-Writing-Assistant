import type { TaskOverviewSummary } from "@ai-novel/shared/types/task";
import type { NovelListResponse } from "@/api/novel/shared";
import {
  canContinueChapterBatchAutoExecution,
  canContinueDirector,
  canEnterChapterExecution,
  getWorkflowDescription,
  isWorkflowActionRequired,
  isWorkflowRunningInBackground,
  requiresCandidateSelection,
} from "@/lib/novelWorkflowTaskUi";
import { featureFlags } from "@/config/featureFlags";
import {getDirectorWorkspaceHref} from "@/lib/novelRoutes";

export const HOME_NOVEL_FETCH_LIMIT = 12;
export const HOME_RECENT_LIMIT = 6;
export const DIRECTOR_CREATE_LINK = "/novels/auto-director";
export const SHORT_STORY_CREATE_LINK = featureFlags.creationStudioEnabled
  ? "/create?form=short_story"
  : null;
export const MANUAL_CREATE_LINK = "/novels/create";

export type HomeNovelItem = NovelListResponse["items"][number];
export type HomeTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface HomeMetric {
  id: string;
  title: string;
  value: string | number;
  hint: string;
  tone: HomeTone;
}

export interface HomeAttentionItem {
  id: string;
  title: string;
  description: string;
  tone: HomeTone;
  to?: string;
  actionLabel?: string;
}

export interface HomeAssetHealthItem {
  id: string;
  title: string;
  value: string;
  description: string;
  tone: HomeTone;
}

export interface HomeNextAction {
  kind: "novel" | "starter";
  eyebrow: string;
  title: string;
  description: string;
  reason: string;
  tone: HomeTone;
}

export function getHomeNovelTask(novel: HomeNovelItem) {
  if (isHomeV2Novel(novel)) return null;
  return novel.narrativeForm === "short_story"
    ? novel.latestCreationStudioTask ?? null
    : novel.latestAutoDirectorTask ?? null;
}

export function isHomeV2Novel(novel: HomeNovelItem): boolean {
  return novel.narrativeForm !== "short_story" && (novel.directorVersion === "v2" || !!getDirectorWorkspaceHref(novel));
}

export function getHomeWrittenChapters(novel: HomeNovelItem): number {
  return novel.bookProgress?.writtenChapters ?? (isHomeV2Novel(novel) ? 0 : novel._count.chapters);
}

function isHomeRunning(novel: HomeNovelItem): boolean {
  return isHomeV2Novel(novel) ? ["queued", "running"].includes(novel.bookProgress?.director?.status ?? "")
    : isWorkflowRunningInBackground(getHomeNovelTask(novel));
}

function isHomeActionRequired(novel: HomeNovelItem): boolean {
  return isHomeV2Novel(novel) ? ["paused", "waiting_gate", "failed"].includes(novel.bookProgress?.director?.status ?? "")
    : isWorkflowActionRequired(getHomeNovelTask(novel));
}

function canHomeWrite(novel: HomeNovelItem): boolean {
  if (isHomeV2Novel(novel)) return novel.bookProgress?.director?.status === "completed"
    && (!novel.bookProgress.targetChapters || getHomeWrittenChapters(novel) < novel.bookProgress.targetChapters);
  return novel.narrativeForm === "short_story" ? getHomeNovelTask(novel)?.status === "succeeded"
    : canEnterChapterExecution(getHomeNovelTask(novel));
}

export function formatHomeDate(value: string | undefined): string {
  if (!value) {
    return "Not available";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }
  return date.toLocaleString("en-US");
}

export function getNovelPriorityScore(novel: HomeNovelItem): number {
  if (isHomeV2Novel(novel)) return isHomeActionRequired(novel) ? 0 : isHomeRunning(novel) ? 3 : canHomeWrite(novel) ? 4 : 6;
  const task = getHomeNovelTask(novel);
  if (canContinueChapterBatchAutoExecution(task)) {
    return 0;
  }
  if (requiresCandidateSelection(task)) {
    return 1;
  }
  if (canContinueDirector(task)) {
    return 2;
  }
  if (task?.status === "running" || task?.status === "queued") {
    return 3;
  }
  if (canEnterChapterExecution(task)) {
    return 4;
  }
  if (task?.status === "failed" || task?.status === "cancelled") {
    return 5;
  }
  return 6;
}

export function getNovelLeadSummary(novel: HomeNovelItem): string {
  if (isHomeV2Novel(novel)) return "Open Auto Director to view the outline, chapter text, and current writing progress.";
  const workflowDescription = getWorkflowDescription(getHomeNovelTask(novel));
  if (workflowDescription) {
    return workflowDescription;
  }
  if (novel.description?.trim()) {
    return novel.description.trim();
  }
  if (novel.world?.name) {
    return `This project is linked to the world "${novel.world.name}" and is ready for more writing.`;
  }
  return "This project has no description yet. Open the editor to keep working on it.";
}

export function selectPrimaryNovel(novels: HomeNovelItem[]): HomeNovelItem | null {
  if (novels.length === 0) {
    return null;
  }
  return novels.reduce<HomeNovelItem | null>((selected, current) => {
    if (!selected) {
      return current;
    }
    const selectedPriority = getNovelPriorityScore(selected);
    const currentPriority = getNovelPriorityScore(current);
    return currentPriority < selectedPriority ? current : selected;
  }, null);
}

export function buildHomeNextAction(primaryNovel: HomeNovelItem | null): HomeNextAction {
  if (!primaryNovel) {
    return {
      kind: "starter",
      eyebrow: "Start your first novel",
      title: "Choose how you'd like to create",
      description: "Let Auto Director plan a full-length novel, or start with a short story to finish a complete work sooner.",
      reason: "Start with a rough idea, and AI will help you shape it into a story.",
      tone: "info",
    };
  }

  const task = getHomeNovelTask(primaryNovel);
  if (isHomeV2Novel(primaryNovel)) {
    const status = primaryNovel.bookProgress?.director?.status;
    const action = status === "waiting_gate" ? "Review this stage" : isHomeActionRequired(primaryNovel) || status === "cancelled"
      ? "Review interrupted writing" : isHomeRunning(primaryNovel) ? "View writing progress"
      : primaryNovel.bookProgress?.targetChapters && getHomeWrittenChapters(primaryNovel) >= primaryNovel.bookProgress.targetChapters
        ? "Read and review chapter text" : "Continue writing";
    return {kind: "novel", eyebrow: "Recommended next step", title: action, description: getNovelLeadSummary(primaryNovel),
      reason: "Review saved results, quality reminders, and upcoming chapters in Auto Director before continuing.",
      tone: isHomeActionRequired(primaryNovel) ? "warning" : "info"};
  }
  if (primaryNovel.narrativeForm === "short_story") {
    return {
      kind: "novel",
      eyebrow: task?.status === "succeeded" ? "Complete story" : "Writing in progress",
      title: task?.status === "succeeded" ? "Keep refining this story" : "View story progress",
      description: getNovelLeadSummary(primaryNovel),
      reason: task?.status === "succeeded"
        ? "Your story is complete. Read, edit, revise, or export it."
        : "Your short story is being written in the background. Open it to see live progress.",
      tone: task?.status === "succeeded" ? "success" : "info",
    };
  }
  if (canContinueChapterBatchAutoExecution(task)) {
    return {
      kind: "novel",
      eyebrow: "Recommended next step",
      title: "Resume chapter writing",
      description: getNovelLeadSummary(primaryNovel),
      reason: "The chapter batch can be resumed. Resume it to get back to writing sooner.",
      tone: "danger",
    };
  }
  if (requiresCandidateSelection(task)) {
    return {
      kind: "novel",
      eyebrow: "Recommended next step",
      title: "Confirm the novel's direction",
      description: getNovelLeadSummary(primaryNovel),
      reason: "Confirm the direction so the system can continue planning the world, characters, and chapters.",
      tone: "warning",
    };
  }
  if (canContinueDirector(task)) {
    return {
      kind: "novel",
      eyebrow: "Recommended next step",
      title: "Continue planning the novel",
      description: getNovelLeadSummary(primaryNovel),
      reason: "This stage is waiting for your confirmation. Continue to move on to the next planning step.",
      tone: "warning",
    };
  }
  if (task?.status === "running" || task?.status === "queued") {
    return {
      kind: "novel",
      eyebrow: "AI is writing",
      title: "View writing progress",
      description: getNovelLeadSummary(primaryNovel),
      reason: "Auto Director or chapter writing is running in the background. Check its progress and latest stage.",
      tone: "info",
    };
  }
  if (canEnterChapterExecution(task)) {
    return {
      kind: "novel",
      eyebrow: "Recommended next step",
      title: "Start writing chapters",
      description: getNovelLeadSummary(primaryNovel),
      reason: "Your planning materials are ready for chapter production. Start drafting and reviewing the text.",
      tone: "success",
    };
  }
  if (task?.status === "failed" || task?.status === "cancelled") {
    return {
      kind: "novel",
      eyebrow: "Needs attention",
      title: "Resolve interrupted writing",
      description: getNovelLeadSummary(primaryNovel),
      reason: "This task was paused or failed. Review its details before resuming, retrying, or making changes.",
      tone: "danger",
    };
  }
  return {
    kind: "novel",
    eyebrow: "Recommended next step",
    title: "Keep refining your novel",
    description: getNovelLeadSummary(primaryNovel),
    reason: "Nothing is blocking higher-priority work. Return to the project to refine its details or chapters.",
    tone: "neutral",
  };
}

export function buildHomeMetrics(input: {
  novels: HomeNovelItem[];
  taskOverview?: TaskOverviewSummary | null;
}): HomeMetric[] {
  const liveWorkflowCount = input.novels.filter((novel) => (
    isHomeRunning(novel)
  )).length;
  const actionRequiredCount = input.novels.filter((novel) => (
    isHomeActionRequired(novel)
  )).length;
  const readyForExecutionCount = input.novels.filter((novel) => (
    canHomeWrite(novel)
  )).length;
  const totalChapterCount = input.novels.reduce((sum, novel) => sum + getHomeWrittenChapters(novel), 0);

  return [
    {
      id: "running",
      title: "Writing",
      value: liveWorkflowCount,
      hint: "Novels or chapters currently being written by AI.",
      tone: "info",
    },
    {
      id: "attention",
      title: "Awaiting your review",
      value: actionRequiredCount,
      hint: "Projects that can continue after your review.",
      tone: actionRequiredCount > 0 ? "warning" : "success",
    },
    {
      id: "chapter-ready",
      title: "Ready to write",
      value: readyForExecutionCount,
      hint: "Planning is complete. Start writing chapter text.",
      tone: readyForExecutionCount > 0 ? "success" : "neutral",
    },
    {
      id: "chapters",
      title: "Chapters written",
      value: totalChapterCount,
      hint: "Chapters written across all your novels.",
      tone: totalChapterCount > 0 ? "info" : "neutral",
    },
  ];
}

export function buildHomeAttentionItems(input: {
  novels: HomeNovelItem[];
  taskOverview?: TaskOverviewSummary | null;
}): HomeAttentionItem[] {
  const actionRequiredCount = input.novels.filter((novel) => (
    isHomeActionRequired(novel)
  )).length;
  const readyForExecutionCount = input.novels.filter((novel) => (
    canHomeWrite(novel)
  )).length;
  const runningCount = input.taskOverview?.runningCount ?? 0;
  const waitingApprovalCount = input.taskOverview?.waitingApprovalCount ?? 0;
  const recoveryCandidateCount = input.taskOverview?.recoveryCandidateCount ?? 0;
  const failedTaskCount = input.taskOverview?.failedCount ?? 0;
  const items: HomeAttentionItem[] = [];

  if (failedTaskCount > 0 || recoveryCandidateCount > 0) {
    items.push({
      id: "task-recovery",
      title: failedTaskCount > 0 ? `${failedTaskCount} background tasks failed` : `${recoveryCandidateCount} tasks can be resumed`,
      description: "Resolve failed or resumable tasks to keep future generation from getting stuck.",
      tone: failedTaskCount > 0 ? "danger" : "warning",
      to: "/tasks",
      actionLabel: "View task center",
    });
  }
  if (actionRequiredCount > 0 || waitingApprovalCount > 0) {
    items.push({
      id: "workflow-action-required",
      title: `${Math.max(actionRequiredCount, waitingApprovalCount)} writing workflows need attention`,
      description: "These projects may be waiting for direction approval, the next stage, or a recovery decision.",
      tone: "warning",
      to: "/auto-director/follow-ups",
      actionLabel: "View follow-ups",
    });
  }
  if (readyForExecutionCount > 0) {
    items.push({
      id: "chapter-ready",
      title: `${readyForExecutionCount} projects are ready for chapter writing`,
      description: "Planning materials are ready to support chapter writing.",
      tone: "success",
    });
  }
  if (runningCount > 0) {
    items.push({
      id: "running-tasks",
      title: `${runningCount} tasks in progress`,
      description: "Background tasks are running. Return to the home page later to check the results.",
      tone: "info",
      to: "/tasks",
      actionLabel: "View progress",
    });
  }

  return items.slice(0, 4);
}

export function buildHomeAssetHealthItems(novels: HomeNovelItem[]): HomeAssetHealthItem[] {
  const totalNovels = novels.length;
  const worldBoundCount = novels.filter((novel) => Boolean(novel.world?.id || novel.worldId)).length;
  const totalCharacters = novels.reduce((sum, novel) => sum + novel._count.characters, 0);
  const totalChapters = novels.reduce((sum, novel) => sum + getHomeWrittenChapters(novel), 0);
  const resourceScores = novels
    .map((novel) => novel.resourceReadyScore)
    .filter((score): score is number => typeof score === "number" && Number.isFinite(score));
  const averageResourceScore = resourceScores.length > 0
    ? Math.round(resourceScores.reduce((sum, score) => sum + score, 0) / resourceScores.length)
    : null;

  return [
    {
      id: "world",
      title: "Worldbuilding coverage",
      value: totalNovels > 0 ? `${worldBoundCount}/${totalNovels}` : "0",
      description: totalNovels > 0
        ? "Linking a world helps keep its rules consistent in later chapters."
        : "Worldbuilding status will appear here after you create a novel.",
      tone: totalNovels === 0 ? "neutral" : worldBoundCount === totalNovels ? "success" : "warning",
    },
    {
      id: "characters",
      title: "Character assets",
      value: String(totalCharacters),
      description: "The number of characters helps show whether a project is ready for continued generation.",
      tone: totalCharacters > 0 ? "success" : "warning",
    },
    {
      id: "chapters",
      title: "Chapters written",
      value: String(totalChapters),
      description: "As you write more chapters, summaries, facts, and character timelines need regular updates.",
      tone: totalChapters > 0 ? "info" : "neutral",
    },
    {
      id: "readiness",
      title: "Planning readiness",
      value: averageResourceScore == null ? "--" : `${averageResourceScore}`,
      description: "Average readiness of project materials to help assess whether you're ready to write.",
      tone: averageResourceScore == null
        ? "neutral"
        : averageResourceScore >= 80
          ? "success"
          : averageResourceScore >= 50
            ? "warning"
            : "danger",
    },
  ];
}
