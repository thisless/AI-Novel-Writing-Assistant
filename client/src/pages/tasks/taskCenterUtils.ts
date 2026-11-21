import type {
  AutoDirectorAction,
} from "@ai-novel/shared/types/autoDirectorFollowUp";
import type { TaskKind, TaskStatus, UnifiedTaskSummary } from "@ai-novel/shared/types/task";
import type {
  NovelWorkflowMilestoneType,
  NovelWorkflowResumeTarget,
} from "@ai-novel/shared/types/novelWorkflow";
import type { WorkspaceTone } from "@/components/workspace";
import type { TaskQueueSeverity } from "@/components/taskQueue";

export const ACTIVE_STATUSES = new Set<TaskStatus>(["queued", "running", "waiting_approval"]);

export type TaskSortMode = "default" | "updated_desc" | "updated_asc" | "heartbeat_desc" | "heartbeat_asc";

type TaskQueuePresentationInput = Pick<
  UnifiedTaskSummary,
  | "status"
  | "pendingManualRecovery"
  | "checkpointType"
  | "noticeCode"
  | "noticeSummary"
  | "failureCode"
  | "failureSummary"
  | "lastError"
>;

const PIPELINE_QUALITY_REVIEW_CODE = "PIPELINE_QUALITY_REVIEW";
const PIPELINE_REPLAN_REQUIRED_CODE = "PIPELINE_REPLAN_REQUIRED";
const CHAPTER_TITLE_DIVERSITY_CODE = "CHAPTER_TITLE_DIVERSITY";

export function isTaskReplanRequired(task: TaskQueuePresentationInput): boolean {
  return task.checkpointType === "replan_required"
    || task.noticeCode === PIPELINE_REPLAN_REQUIRED_CODE
    || task.failureCode === PIPELINE_REPLAN_REQUIRED_CODE;
}

export function isTaskFailureQualityReminder(task: TaskQueuePresentationInput): boolean {
  return task.failureCode === PIPELINE_QUALITY_REVIEW_CODE
    || task.failureCode === CHAPTER_TITLE_DIVERSITY_CODE;
}

export function isTaskQueueQualityReminder(task: TaskQueuePresentationInput): boolean {
  return task.noticeCode === PIPELINE_QUALITY_REVIEW_CODE
    || task.noticeCode === CHAPTER_TITLE_DIVERSITY_CODE
    || isTaskFailureQualityReminder(task);
}

export function getTaskNoticeSeverity(task: TaskQueuePresentationInput): TaskQueueSeverity {
  if (isTaskReplanRequired(task)) return "blocking";
  if (isTaskQueueQualityReminder(task)) return "quality";
  return "normal";
}

export function getTaskNoticeTitle(task: TaskQueuePresentationInput): string {
  if (isTaskReplanRequired(task)) return "Replanning required";
  if (isTaskQueueQualityReminder(task)) return "Quality reminder";
  return "Task notice";
}

export function getTaskListPriority(task: TaskQueuePresentationInput): number {
  const tone = getTaskQueueTone(task);
  if (tone === "danger") return 0;
  if (tone === "warning") return 1;
  if (tone === "info") return 2;
  return 3;
}

export function isTaskMustHandle(task: TaskQueuePresentationInput): boolean {
  return getTaskQueueTone(task) === "danger";
}

export function getTaskQueueTone(task: TaskQueuePresentationInput): WorkspaceTone {
  if (task.pendingManualRecovery || isTaskReplanRequired(task)) {
    return "danger";
  }
  if (task.status === "failed" && !isTaskFailureQualityReminder(task)) {
    return "danger";
  }
  if (isTaskQueueQualityReminder(task)) {
    return "warning";
  }
  if (task.status === "failed") {
    return "danger";
  }
  if (task.failureCode || task.failureSummary) {
    return "warning";
  }
  if (task.status === "waiting_approval" || task.status === "running" || task.noticeCode || task.noticeSummary) {
    return "info";
  }
  if (task.status === "succeeded") {
    return "success";
  }
  return "neutral";
}

export function getTaskQueueLevelLabel(task: TaskQueuePresentationInput): string {
  const tone = getTaskQueueTone(task);
  if (isTaskReplanRequired(task)) return "Replanning required";
  if (task.pendingManualRecovery) return "Recovery required";
  if (tone === "danger") return task.status === "failed" ? "Task failed" : "Blocked";
  if (tone === "warning" && isTaskQueueQualityReminder(task)) return "Quality reminder";
  if (tone === "warning") return "Action required";
  if (tone === "info") return task.status === "waiting_approval" ? "Action required" : "In progress";
  if (tone === "success") return "Completed";
  return "Standard task";
}

export function getTaskQueueSeverity(task: TaskQueuePresentationInput): TaskQueueSeverity {
  const tone = getTaskQueueTone(task);
  if (tone === "danger") return "blocking";
  if (isTaskQueueQualityReminder(task)) return "quality";
  return "normal";
}

export function getTimestamp(value: string | null | undefined): number {
  if (!value) {
    return Number.NaN;
  }
  return new Date(value).getTime();
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Not available";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }
  return date.toLocaleString("en-US");
}

export function formatTokenCount(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(value ?? 0)));
}

export function formatKind(kind: TaskKind): string {
  if (kind === "book_analysis") {
    return "Book analysis";
  }
  if (kind === "novel_workflow") {
    return "Novel writing";
  }
  if (kind === "novel_pipeline") {
    return "Novel pipeline";
  }
  if (kind === "knowledge_document") {
    return "Knowledge indexing";
  }
  if (kind === "style_extraction") {
    return "Style extraction";
  }
  if (kind === "agent_run") {
    return "Agent run";
  }
  return "Image generation";
}

export function formatCheckpoint(checkpoint: NovelWorkflowMilestoneType | null | undefined, scopeLabel?: string | null): string {
  const resolvedScopeLabel = scopeLabel?.trim() || "First 10 chapters";
  if (checkpoint === "rewrite_snapshot_created") {
    return "Pre-rewrite backup created";
  }
  if (checkpoint === "candidate_selection_required") {
    return "Waiting for book-level direction approval";
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
  if (checkpoint === "chapter_batch_ready") {
    return `Automatic execution paused for ${resolvedScopeLabel}`;
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
  return "Not available";
}

export function formatResumeTarget(target: NovelWorkflowResumeTarget | null | undefined): string {
  if (!target) {
    return "Not available";
  }
  if (target.route === "/novels/create") {
    return target.mode === "director" ? "Creation / AI auto-director" : "Creation";
  }
  if (target.stage === "story_macro") {
    return "Novel editor / Story macro plan";
  }
  if (target.stage === "character") {
    return "Novel editor / Character preparation";
  }
  if (target.stage === "outline") {
    return "Novel editor / Volume strategy";
  }
  if (target.stage === "structured") {
    return "Novel editor / Chapter breakdown";
  }
  if (target.stage === "chapter") {
    return "Novel editor / Chapter execution";
  }
  if (target.stage === "pipeline") {
    return "Novel editor / Quality repair";
  }
  return "Novel editor / Project setup";
}

export function formatStatus(status: TaskStatus): string {
  if (status === "queued") {
    return "Queued";
  }
  if (status === "running") {
    return "Running";
  }
  if (status === "waiting_approval") {
    return "Awaiting approval";
  }
  if (status === "succeeded") {
    return "Completed";
  }
  if (status === "failed") {
    return "Failed";
  }
  return "Cancelled";
}

export function toStatusVariant(status: TaskStatus): "default" | "outline" | "secondary" | "destructive" {
  if (status === "running") {
    return "default";
  }
  if (status === "waiting_approval") {
    return "secondary";
  }
  if (status === "queued") {
    return "secondary";
  }
  if (status === "failed") {
    return "destructive";
  }
  return "outline";
}

export function serializeListParams(input: {
  kind: TaskKind | "";
  status: TaskStatus | "";
  keyword: string;
}): string {
  return JSON.stringify({
    kind: input.kind || null,
    status: input.status || null,
    keyword: input.keyword.trim() || null,
  });
}

export function createIdempotencyKey(taskId: string, actionCode: string): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${taskId}:${actionCode}:${globalThis.crypto.randomUUID()}`;
  }
  return `${taskId}:${actionCode}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

export function formatFollowUpPriority(priority: "P0" | "P1" | "P2"): string {
  if (priority === "P0") {
    return "P0 · Handle immediately";
  }
  if (priority === "P1") {
    return "P1 · Handle soon";
  }
  return "P2 · Can wait";
}

export function followUpActionVariant(action: AutoDirectorAction): "default" | "outline" {
  return action.kind === "navigation" || action.riskLevel !== "low" ? "outline" : "default";
}
