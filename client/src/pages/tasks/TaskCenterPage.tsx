import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TaskKind, TaskStatus, UnifiedTaskStep } from "@ai-novel/shared/types/task";
import { useSearchParams } from "react-router-dom";
import type { NovelWorkflowMilestone } from "@ai-novel/shared/types/novelWorkflow";
import { getDirectorTaskSnapshot } from "@/api/novelDirector";
import {
  getTaskDetail,
  getTaskOverview,
  listRecoveryCandidates,
  listTasks,
} from "@/api/tasks";
import { queryKeys } from "@/api/queryKeys";
import { Activity, ListChecks, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceHeader, WorkspaceNextAction } from "@/components/workspace";
import { useLLMStore } from "@/store/llmStore";
import TaskCenterFilterPanel from "./components/TaskCenterFilterPanel";
import TaskCenterDetailPanel from "./components/TaskCenterDetailPanel";
import TaskCenterListPanel from "./components/TaskCenterListPanel";
import TaskCenterSummaryCards from "./components/TaskCenterSummaryCards";
import {
  ACTIVE_STATUSES,
  getTaskListPriority,
  getTaskNoticeSeverity,
  getTaskNoticeTitle,
  getTaskQueueSeverity,
  getTaskQueueTone,
  isTaskFailureQualityReminder,
  isTaskMustHandle,
  isTaskReplanRequired,
  getTimestamp,
  serializeListParams,
  type TaskSortMode,
} from "./taskCenterUtils";

function normalizeTaskMeta(meta: unknown): Record<string, unknown> {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return {};
  }
  return meta as Record<string, unknown>;
}

function normalizeTaskSteps(steps: unknown): UnifiedTaskStep[] {
  return Array.isArray(steps) ? (steps as UnifiedTaskStep[]) : [];
}

export default function TaskCenterPage() {
  const llm = useLLMStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [kind, setKind] = useState<TaskKind | "">("");
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [keyword, setKeyword] = useState("");
  const [onlyAnomaly, setOnlyAnomaly] = useState(false);
  const [sortMode, setSortMode] = useState<TaskSortMode>("updated_desc");

  const selectedKind = (searchParams.get("kind") as TaskKind | null) ?? null;
  const selectedId = searchParams.get("id");
  const listParamsKey = serializeListParams({ kind, status, keyword });

  const listQuery = useQuery({
    queryKey: queryKeys.tasks.list(listParamsKey),
    queryFn: () =>
      listTasks({
        kind: kind || undefined,
        status: status || undefined,
        keyword: keyword.trim() || undefined,
        limit: 80,
      }),
    refetchInterval: (query) => {
      const rows = query.state.data?.data?.items ?? [];
      return rows.some((item) => ACTIVE_STATUSES.has(item.status)) ? 4000 : false;
    },
  });

  const overviewQuery = useQuery({
    queryKey: queryKeys.tasks.overview,
    queryFn: getTaskOverview,
    refetchInterval: (query) => {
      const overview = query.state.data?.data;
      if (!overview) return false;
      return overview.runningCount
        + overview.queuedCount
        + overview.waitingApprovalCount
        + overview.recoveryCandidateCount > 0
        ? 4000
        : false;
    },
  });

  const recoveryCandidatesQuery = useQuery({
    queryKey: queryKeys.tasks.recoveryCandidates,
    queryFn: listRecoveryCandidates,
    refetchInterval: (query) => (query.state.data?.data?.items.length ?? 0) > 0 ? 4000 : false,
  });

  const allRows = listQuery.data?.data?.items ?? [];
  const visibleRows = useMemo(
    () =>
      (onlyAnomaly ? allRows.filter(isTaskMustHandle) : allRows)
        .map((item, index) => ({ item, index }))
        .sort((left, right) => {
          if (sortMode !== "default") {
            const leftTime = sortMode.startsWith("heartbeat")
              ? getTimestamp(left.item.heartbeatAt)
              : getTimestamp(left.item.updatedAt);
            const rightTime = sortMode.startsWith("heartbeat")
              ? getTimestamp(right.item.heartbeatAt)
              : getTimestamp(right.item.updatedAt);
            const leftResolved = Number.isNaN(leftTime) ? -Infinity : leftTime;
            const rightResolved = Number.isNaN(rightTime) ? -Infinity : rightTime;
            const timeDiff = sortMode.endsWith("_asc")
              ? leftResolved - rightResolved
              : rightResolved - leftResolved;
            if (timeDiff !== 0) {
              return timeDiff;
            }
          }
          const priorityDiff = getTaskListPriority(left.item) - getTaskListPriority(right.item);
          if (priorityDiff !== 0) {
            return priorityDiff;
          }
          return left.index - right.index;
        })
        .map(({ item }) => item),
    [allRows, onlyAnomaly, sortMode],
  );

  const detailQuery = useQuery({
    queryKey: queryKeys.tasks.detail(selectedKind ?? "none", selectedId ?? "none"),
    queryFn: () => getTaskDetail(selectedKind as TaskKind, selectedId as string),
    enabled: Boolean(selectedKind && selectedId),
    retry: false,
    refetchInterval: (query) => {
      const task = query.state.data?.data;
      return task && ACTIVE_STATUSES.has(task.status) ? 4000 : false;
    },
  });

  useEffect(() => {
    if (!selectedKind || !selectedId) {
      if (visibleRows.length > 0) {
        const fallback = visibleRows[0];
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set("kind", fallback.kind);
          next.set("id", fallback.id);
          return next;
        });
      }
      return;
    }
    const exists = visibleRows.some((item) => item.kind === selectedKind && item.id === selectedId);
    if (!exists && visibleRows.length > 0) {
      const fallback = visibleRows[0];
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("kind", fallback.kind);
        next.set("id", fallback.id);
        return next;
      });
    }
  }, [selectedKind, selectedId, setSearchParams, visibleRows]);

  const taskOverview = overviewQuery.data?.data;
  const runningCount = taskOverview?.runningCount ?? allRows.filter((item) => item.status === "running").length;
  const queuedCount = taskOverview?.queuedCount ?? allRows.filter((item) => item.status === "queued").length;
  const waitingActionCount = taskOverview?.waitingApprovalCount
    ?? allRows.filter((item) => item.status === "waiting_approval").length;
  const failedTaskCount = taskOverview?.failedCount
    ?? allRows.filter((item) => item.status === "failed" && isTaskMustHandle(item)).length;
  const recoveryCandidateCount = taskOverview?.recoveryCandidateCount
    ?? recoveryCandidatesQuery.data?.data?.items.length
    ?? allRows.filter((item) => item.pendingManualRecovery).length;
  const blockingCount = allRows.filter((item) => getTaskQueueTone(item) === "danger").length;
  const visibleReplanCount = allRows.filter(isTaskReplanRequired).length;
  const mustHandleCount = failedTaskCount + recoveryCandidateCount + visibleReplanCount;
  const qualityReminderCount = allRows.filter((item) => getTaskQueueSeverity(item) === "quality").length;

  const selectedTask = detailQuery.data?.data;
  const selectedTaskMeta = useMemo(
    () => normalizeTaskMeta(selectedTask?.meta),
    [selectedTask?.meta],
  );
  const selectedTaskSteps = useMemo(
    () => normalizeTaskSteps(selectedTask?.steps),
    [selectedTask?.steps],
  );
  const isAutoDirectorTask = Boolean(
    selectedTask
    && selectedTask.kind === "novel_workflow"
    && selectedTaskMeta.lane === "auto_director",
  );
  const selectedTaskHasQualityFailure = Boolean(
    selectedTask && isTaskFailureQualityReminder(selectedTask),
  );
  const directorRuntimeQuery = useQuery({
    queryKey: queryKeys.tasks.directorTaskSnapshot(selectedId ?? "none"),
    queryFn: () => getDirectorTaskSnapshot(selectedId as string),
    enabled: Boolean(selectedId && isAutoDirectorTask),
    retry: false,
    refetchInterval: (query) => {
      const snapshot = query.state.data?.data?.snapshot;
      const projection = snapshot?.projection;
      return (
        (selectedTask && ACTIVE_STATUSES.has(selectedTask.status))
        || snapshot?.dashboardView.mode === "running"
        || snapshot?.dashboardView.mode === "queued"
        || projection?.status === "running"
        || projection?.status === "waiting_approval"
      )
        ? 4000
        : false;
    },
  });
  const selectedDirectorTaskSnapshot = directorRuntimeQuery.data?.data?.snapshot ?? null;
  const selectedDirectorDashboardView = selectedDirectorTaskSnapshot?.dashboardView ?? null;
  const selectedDirectorRuntimeProjection = selectedDirectorTaskSnapshot?.projection ?? null;
  const staleActionProjection = Boolean(
    selectedDirectorDashboardView?.mode === "running"
    && (
      selectedDirectorRuntimeProjection?.requiresUserAction
      || selectedDirectorRuntimeProjection?.status === "blocked"
      || selectedDirectorRuntimeProjection?.status === "waiting_approval"
      || selectedDirectorRuntimeProjection?.status === "failed"
    ),
  );
  const selectedDirectorRuntimeProjectionForDisplay = staleActionProjection
    ? null
    : selectedDirectorRuntimeProjection;
  const listErrorMessage = listQuery.error instanceof Error ? listQuery.error.message : listQuery.isError ? "Could not load the task list. Try again." : null;
  const overviewErrorMessage = overviewQuery.error instanceof Error
    ? overviewQuery.error.message
    : overviewQuery.isError ? "Could not load the task overview. Try again." : null;
  const detailErrorMessage = detailQuery.error instanceof Error ? detailQuery.error.message : detailQuery.isError ? "Could not load task details. Try again." : null;
  const recommendedBlockingTask = allRows.find(isTaskMustHandle) ?? null;
  const hasMustHandleTask = mustHandleCount > 0 || blockingCount > 0;
  const recommendedRecoveryCandidate = failedTaskCount === 0
    ? recoveryCandidatesQuery.data?.data?.items[0] ?? null
    : null;
  const recommendedTask = recommendedBlockingTask
    ?? recommendedRecoveryCandidate
    ?? (!hasMustHandleTask
      ? allRows.find((item) => item.status === "waiting_approval")
        ?? allRows.find((item) => getTaskQueueSeverity(item) === "quality")
        ?? allRows.find((item) => item.status === "running")
        ?? allRows[0]
        ?? null
      : null);
  const shouldOpenFailedFilter = hasMustHandleTask && !recommendedBlockingTask && failedTaskCount > 0;
  const shouldRetryRecoveryLookup = hasMustHandleTask
    && !recommendedTask
    && !shouldOpenFailedFilter
    && !recoveryCandidatesQuery.isLoading;
  const hasRecommendedAction = Boolean(recommendedTask || shouldOpenFailedFilter || shouldRetryRecoveryLookup);

  return (
    <div className="space-y-5">
      <WorkspaceHeader
        icon={ListChecks}
        context="Execution history and status"
        title="Run history"
        description="View the status, errors, and source location of writing, book analysis, indexing, and image tasks. Continue, recover, or retry tasks from their respective workspaces."
        actions={(
          <Button
            type="button"
            variant="outline"
            onClick={() => void Promise.all([overviewQuery.refetch(), recoveryCandidatesQuery.refetch(), listQuery.refetch()])}
            disabled={overviewQuery.isFetching || recoveryCandidatesQuery.isFetching || listQuery.isFetching}
          >
            <RefreshCw className={overviewQuery.isFetching || recoveryCandidatesQuery.isFetching || listQuery.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden="true" />
            Refresh history
          </Button>
        )}
      />

      <WorkspaceNextAction
        className="rounded-2xl border-transparent px-5 py-3 shadow-none"
        icon={overviewErrorMessage ? RefreshCw : hasMustHandleTask ? ShieldAlert : Activity}
        tone={overviewQuery.isLoading ? "info" : overviewErrorMessage ? "danger" : hasMustHandleTask ? "danger" : waitingActionCount > 0 ? "info" : qualityReminderCount > 0 ? "warning" : runningCount + queuedCount > 0 ? "info" : allRows.length > 0 ? "success" : "neutral"}
        title={overviewQuery.isLoading ? "Loading task status" : overviewErrorMessage ? "Reload task overview" : hasMustHandleTask ? "Review tasks that need attention" : waitingActionCount > 0 ? "Complete pending actions" : qualityReminderCount > 0 ? "Review quality reminders" : runningCount + queuedCount > 0 ? "Monitor active tasks" : allRows.length > 0 ? "No blocked tasks" : "Tasks will appear here when run"}
        description={overviewQuery.isLoading
          ? "Summarizing running, pending, failed, and recoverable tasks. Please wait."
          : overviewErrorMessage
            ? `${overviewErrorMessage} Blocked-task status cannot be determined until the overview loads.`
            : hasMustHandleTask
              ? recoveryCandidatesQuery.isLoading && !recommendedBlockingTask && failedTaskCount === 0
                ? "Finding recoverable tasks. Their source locations will appear when loading is complete."
                : "A blocked task may affect its source workflow. Review the cause and recovery location, then return to the source page."
              : waitingActionCount > 0
                ? "Some steps, such as confirming candidates or continuing a chapter batch, need your input but do not indicate a task failure."
                : qualityReminderCount > 0
                  ? "These reminders do not block the rest of the book. Schedule focused repairs based on their impact."
                  : runningCount + queuedCount > 0
                    ? "Progress updates automatically; routine activity does not need manual intervention."
                    : allRows.length > 0
                      ? "Completed records and quality reminders remain in the details for later reference."
                      : "Tasks started from the novel, book analysis, knowledge, or image workspaces appear here."}
        consequence={overviewErrorMessage
          ? "Reloads the task overview only. It will not recover, retry, or cancel tasks."
          : !overviewQuery.isLoading && hasRecommendedAction
            ? recommendedTask
              ? "Selects the recommended task only. It will not automatically continue, retry, or cancel it."
              : shouldOpenFailedFilter
                ? "Filters for failed tasks only. It will not automatically recover, retry, or cancel them."
                : "Reloads recovery candidates only. It will not automatically recover a task."
            : undefined}
        action={overviewErrorMessage ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void overviewQuery.refetch()}>
            Reload
          </Button>
        ) : !overviewQuery.isLoading && hasRecommendedAction ? (
          <Button
            type="button"
            size="sm"
            variant={hasMustHandleTask ? "destructive" : "outline"}
            onClick={() => {
              if (!recommendedTask) {
                setKind("");
                setKeyword("");
                if (shouldOpenFailedFilter) {
                  setStatus("failed");
                  setOnlyAnomaly(false);
                } else if (shouldRetryRecoveryLookup) {
                  void recoveryCandidatesQuery.refetch();
                }
                return;
              }
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set("kind", recommendedTask.kind);
                next.set("id", recommendedTask.id);
                return next;
              });
            }}
          >
            {shouldRetryRecoveryLookup ? "Reload recoverable tasks" : hasMustHandleTask ? "View tasks needing attention" : "View recommended task"}
          </Button>
        ) : undefined}
      />

      <TaskCenterSummaryCards
        activeCount={runningCount + queuedCount}
        waitingActionCount={waitingActionCount}
        mustHandleCount={mustHandleCount}
        qualityReminderCount={qualityReminderCount}
      />

      <TaskCenterFilterPanel
        kind={kind}
        status={status}
        keyword={keyword}
        onlyAnomaly={onlyAnomaly}
        sortMode={sortMode}
        onKindChange={setKind}
        onStatusChange={setStatus}
        onKeywordChange={setKeyword}
        onOnlyAnomalyChange={setOnlyAnomaly}
        onSortModeChange={setSortMode}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(380px,0.75fr)]">
        <TaskCenterListPanel
          tasks={visibleRows}
          selectedKind={selectedKind}
          selectedId={selectedId}
          loading={listQuery.isLoading}
          errorMessage={listErrorMessage}
          onRetry={() => void listQuery.refetch()}
          onSelectTask={(task) => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set("kind", task.kind);
              next.set("id", task.id);
              return next;
            });
          }}
        />

        <TaskCenterDetailPanel
          task={selectedTask}
          loading={Boolean(selectedKind && selectedId && detailQuery.isLoading)}
          errorMessage={detailErrorMessage}
          onRetryLoad={() => void detailQuery.refetch()}
          isAutoDirectorTask={isAutoDirectorTask}
          currentModelLabel={`${llm.provider} / ${llm.model}`}
          dashboardView={selectedDirectorDashboardView}
          runtimeProjection={selectedDirectorRuntimeProjectionForDisplay}
          noticeSeverity={selectedTask ? getTaskNoticeSeverity(selectedTask) : "normal"}
          noticeTitle={selectedTask ? getTaskNoticeTitle(selectedTask) : "Task notice"}
          failureIsQualityReminder={selectedTaskHasQualityFailure}
          steps={selectedTaskSteps}
          milestones={selectedTask?.kind === "novel_workflow" && Array.isArray(selectedTaskMeta.milestones)
            ? selectedTaskMeta.milestones as NovelWorkflowMilestone[]
            : []}
        />
      </div>
    </div>
  );
}
