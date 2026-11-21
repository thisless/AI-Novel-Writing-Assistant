import type { DirectorDashboardView, DirectorRuntimeProjection } from "@ai-novel/shared/types/directorRuntime";
import type { NovelWorkflowMilestone } from "@ai-novel/shared/types/novelWorkflow";
import type { UnifiedTaskDetail, UnifiedTaskStep } from "@ai-novel/shared/types/task";
import { Link } from "react-router-dom";
import { getTaskHistorySourceHref } from "@/lib/novelRoutes";
import DirectorRuntimeProjectionCard from "@/components/autoDirector/DirectorRuntimeProjectionCard";
import {
  TaskQueueActionRow,
  TaskQueueImpactNotice,
  TaskQueueSection,
  TaskQueueStatusBadge,
  type TaskQueueSeverity,
} from "@/components/taskQueue";
import { Button } from "@/components/ui/button";
import { WorkspaceStateNotice } from "@/components/workspace";
import TaskCenterDetailSummary from "./TaskCenterDetailSummary";
import TaskCenterMilestoneHistory from "./TaskCenterMilestoneHistory";

interface TaskCenterDetailPanelProps {
  task?: UnifiedTaskDetail | null;
  loading: boolean;
  errorMessage?: string | null;
  onRetryLoad: () => void;
  isAutoDirectorTask: boolean;
  currentModelLabel: string;
  dashboardView?: DirectorDashboardView | null;
  runtimeProjection?: DirectorRuntimeProjection | null;
  noticeSeverity: TaskQueueSeverity;
  noticeTitle: string;
  failureIsQualityReminder: boolean;
  steps: UnifiedTaskStep[];
  milestones: NovelWorkflowMilestone[];
}

export default function TaskCenterDetailPanel(props: TaskCenterDetailPanelProps) {
  const task = props.task;

  return (
    <TaskQueueSection
      title="Task details"
      description="Review current impact, recovery location, and source page. Expand run parameters as needed."
      className="overflow-hidden rounded-2xl border-border/40 bg-card/60 shadow-[0_12px_36px_rgba(15,23,42,0.035)]"
    >
      <div className="space-y-4 text-sm">
        {props.loading ? (
          <WorkspaceStateNotice loading title="Loading task details" description="Syncing task status, checkpoints, and recent steps." />
        ) : null}
        {props.errorMessage ? (
          <WorkspaceStateNotice
            tone="danger"
            title="Could not load task details"
            description={props.errorMessage}
            action={<Button size="sm" variant="outline" onClick={props.onRetryLoad}>Reload</Button>}
          />
        ) : null}
        {!props.loading && !props.errorMessage && !task ? (
          <WorkspaceStateNotice title="Select a task" description="Choose a task from the list to view its impact, recovery location, and source page." />
        ) : null}

        {task ? (
          <>
            <TaskCenterDetailSummary
              task={task}
              isAutoDirectorTask={props.isAutoDirectorTask}
              currentModelLabel={props.currentModelLabel}
              dashboardView={props.dashboardView}
            />

            {task.noticeCode || task.noticeSummary ? (
              <TaskQueueImpactNotice
                severity={props.noticeSeverity}
                title={props.noticeTitle}
                description={task.noticeSummary ?? "The task has a result notice that needs review."}
              />
            ) : null}

            {task.failureCode || task.failureSummary ? (
              <TaskQueueImpactNotice
                severity={props.failureIsQualityReminder ? "quality" : "blocking"}
                title={props.failureIsQualityReminder ? "Quality reminder" : "Task blocked"}
                description={task.failureSummary ?? "The task recorded a failure that needs attention."}
              />
            ) : null}

            {task.lastError && !props.failureIsQualityReminder && !task.failureCode && !task.failureSummary ? (
              <WorkspaceStateNotice tone="danger" title="Most recent run failed" description={task.lastError} />
            ) : null}

            {task.kind === "novel_workflow" && task.checkpointSummary ? (
              <WorkspaceStateNotice compact title="Latest checkpoint" description={task.checkpointSummary} />
            ) : null}

            {props.isAutoDirectorTask ? <DirectorRuntimeProjectionCard projection={props.runtimeProjection} /> : null}

            {props.isAutoDirectorTask ? (
              <WorkspaceStateNotice
                compact
                tone="info"
                title="Director task source"
                description="Continue, recover, change models, or adjust progression strategy from the novel page. Run history only shows status, errors, recovery location, and source."
              />
            ) : null}

            <TaskQueueActionRow
              title="Open source page"
              consequence="This only opens the task source and does not change task status. Continue, recover, or retry the task from its source page."
              action={<Button asChild size="sm" variant="outline"><Link to={getTaskHistorySourceHref(task)}>Open source page</Link></Button>}
            />

            <details className="group border-t border-border/35 pt-3">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium marker:hidden">
                <span>Execution steps {props.steps.length > 0 ? `(${props.steps.length})` : ""}</span>
                <span className="text-xs font-normal text-muted-foreground group-open:hidden">Expand</span>
                <span className="hidden text-xs font-normal text-muted-foreground group-open:inline">Collapse</span>
              </summary>
              <div className="mt-3 space-y-2">
                {props.steps.length === 0 ? (
                  <WorkspaceStateNotice compact title="No step status available" description="This task has not provided any detailed steps to display." />
                ) : props.steps.map((step) => (
                  <div key={step.key} className="flex items-center justify-between rounded-xl bg-muted/25 px-3 py-2">
                    <div>{step.label}</div>
                    <TaskQueueStatusBadge
                      label={step.status === "succeeded" ? "Completed" : step.status === "failed" ? "Failed" : step.status === "running" ? "In progress" : step.status === "cancelled" ? "Cancelled" : "Not started"}
                      tone={step.status === "succeeded" ? "success" : step.status === "failed" ? "danger" : step.status === "running" ? "info" : "neutral"}
                      className="border-0 bg-background/70 font-normal"
                    />
                  </div>
                ))}
              </div>
            </details>

            {task.kind === "novel_workflow" ? <TaskCenterMilestoneHistory milestones={props.milestones} /> : null}
          </>
        ) : null}
      </div>
    </TaskQueueSection>
  );
}
