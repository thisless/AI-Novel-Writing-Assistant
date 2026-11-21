import type {
  AutoDirectorFollowUpAvailableFilters,
  AutoDirectorFollowUpItem,
  AutoDirectorFollowUpPagination,
} from "@ai-novel/shared/types/autoDirectorFollowUp";
import type { AutoDirectorFollowUpSection } from "@ai-novel/shared/types/autoDirectorValidation";
import type { TaskStatus } from "@ai-novel/shared/types/task";
import { Button } from "@/components/ui/button";
import { TaskRecordActions } from "@/components/taskQueue/TaskRecordActions";
import {
  TaskQueueEmptyState,
  TaskQueueItem,
  TaskQueueSection,
  TaskQueueSeverityBadge,
  TaskQueueStatusBadge,
} from "@/components/taskQueue";
import { WorkspaceStateNotice } from "@/components/workspace";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";
import {
  getFollowUpLevelLabel,
  getFollowUpPriorityLabel,
  getFollowUpSeverity,
  getFollowUpTone,
} from "../followUpPresentation";

interface AutoDirectorFollowUpListPanelProps {
  items: AutoDirectorFollowUpItem[];
  pagination: AutoDirectorFollowUpPagination | null;
  filters: AutoDirectorFollowUpAvailableFilters | null;
  activeReason: string;
  activeSection: AutoDirectorFollowUpSection | "";
  activeStatus: string;
  activeSupportsBatch: string;
  selectedTaskId: string;
  selectedTaskIds: string[];
  loading: boolean;
  errorMessage?: string | null;
  actionLoading: boolean;
  onSelectTask: (taskId: string) => void;
  onFilterChange: (key: "reason" | "status" | "supportsBatch" | "channelType", value: string) => void;
  onToggleSelected: (taskId: string, checked: boolean) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
}

function formatStatus(status: TaskStatus): string {
  if (status === "waiting_approval") return "Awaiting approval";
  if (status === "failed") return "Failed";
  if (status === "cancelled") return "Cancelled";
  if (status === "running") return "Running";
  if (status === "queued") return "Queued";
  return "Completed";
}

function formatReason(reason: AutoDirectorFollowUpItem["reason"]): string {
  const labels: Record<AutoDirectorFollowUpItem["reason"], string> = {
    manual_recovery_required: "Manual recovery required",
    runtime_failed: "Failed; retry available",
    candidate_selection_required: "Novel direction needs approval",
    replan_required: "Replanning required",
    runtime_cancelled: "Cancelled; recovery available",
    chapter_batch_execution_pending: "Automation ready to continue",
    quality_repair_pending: "Quality repair ready to continue",
    auto_progress_running: "Auto-progressing",
    auto_approval_completed: "Recently auto-approved",
    runtime_replaced: "Task replaced",
    validation_required: "Revalidation required",
  };
  return labels[reason];
}

function formatSection(section: AutoDirectorFollowUpSection): string {
  if (section === "needs_validation") return "Needs validation";
  if (section === "exception") return "Exceptions";
  if (section === "pending") return "Pending";
  if (section === "auto_progress") return "Auto-progress";
  return "Replaced";
}

function formatActiveSection(section: AutoDirectorFollowUpSection | ""): string {
  return section ? formatSection(section) : "All sections";
}

function buildChannelBadges(item: AutoDirectorFollowUpItem): string[] {
  const labels: string[] = [];
  if (item.channelCapabilities.dingtalk) {
    labels.push("DingTalk available");
  }
  if (item.channelCapabilities.wecom) {
    labels.push("WeCom available");
  }
  if (item.channelCapabilities.feishu) {
    labels.push("Feishu available");
  }
  return labels;
}

function formatItemType(item: AutoDirectorFollowUpItem): string {
  return item.itemType === "auto_approval_record" ? "Recently auto-approved" : "In progress";
}

export function AutoDirectorFollowUpListPanel(props: AutoDirectorFollowUpListPanelProps) {
  const totalPages = props.pagination ? Math.max(1, Math.ceil(props.pagination.total / props.pagination.pageSize)) : 1;

  return (
    <TaskQueueSection
      title={formatActiveSection(props.activeSection)}
      description="Filter by structured reason and status. Quality reminders and blocked tasks use different severity levels."
      className="min-w-0 overflow-hidden"
    >
      <div className="space-y-4">
        <div className={AUTO_DIRECTOR_MOBILE_CLASSES.followUpFilterGrid}>
          <Select value={props.activeReason || "__all__"} onValueChange={(value) => props.onFilterChange("reason", value === "__all__" ? "" : value)}>
            <SelectTrigger aria-label="Filter by follow-up reason" className={AUTO_DIRECTOR_MOBILE_CLASSES.followUpFilterTrigger}>
              <SelectValue placeholder="All reasons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All reasons</SelectItem>
              {(props.filters?.reasons ?? []).map((reason) => (
                <SelectItem key={reason} value={reason}>{formatReason(reason)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={props.activeStatus || "__all__"} onValueChange={(value) => props.onFilterChange("status", value === "__all__" ? "" : value)}>
            <SelectTrigger aria-label="Filter by task status" className={AUTO_DIRECTOR_MOBILE_CLASSES.followUpFilterTrigger}>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              {(props.filters?.statuses ?? []).map((status) => (
                <SelectItem key={status} value={status}>{formatStatus(status)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={props.activeSupportsBatch || "__all__"} onValueChange={(value) => props.onFilterChange("supportsBatch", value === "__all__" ? "" : value)}>
            <SelectTrigger aria-label="Filter by bulk-action availability" className={AUTO_DIRECTOR_MOBILE_CLASSES.followUpFilterTrigger}>
              <SelectValue placeholder="Bulk-action availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              <SelectItem value="true">Bulk actions available</SelectItem>
              <SelectItem value="false">No bulk actions</SelectItem>
            </SelectContent>
          </Select>

        </div>

        <div className="space-y-3">
          {props.loading ? (
            <WorkspaceStateNotice compact loading title="Loading follow-ups" description="Syncing director tasks and recent auto-approval records." />
          ) : null}

          {props.errorMessage ? (
            <WorkspaceStateNotice
              compact
              tone="danger"
              title="Could not load follow-ups"
              description={props.errorMessage}
              action={<Button size="sm" variant="outline" onClick={props.onRetry}>Reload</Button>}
            />
          ) : null}

          {!props.loading && !props.errorMessage && props.items.length === 0 ? (
            <TaskQueueEmptyState
              title="No follow-ups match these filters"
              description={props.activeSection === "auto_progress"
                ? "There are no in-progress tasks or recent auto-approval records."
                : props.activeSection === "replaced"
                  ? "There are no old tasks replaced by newer ones."
                  : "Switch sections or clear filters to see other director tasks."}
            />
          ) : null}

          {props.items.map((item) => {
            const itemKey = item.autoApprovalRecordId ?? item.directorTaskId;
            const checked = props.selectedTaskIds.includes(item.directorTaskId);
            const selected = props.selectedTaskId === item.directorTaskId;
            const tone = getFollowUpTone(item);
            return (
              <div key={itemKey} className="relative">
                <TaskQueueItem
                  selected={selected}
                  tone={tone}
                  className={item.supportsBatch ? "p-4 pr-12" : "p-4"}
                  onClick={() => props.onSelectTask(item.directorTaskId)}
                >
                <div className={AUTO_DIRECTOR_MOBILE_CLASSES.followUpListHeader}>
                  <div className="min-w-0 space-y-1">
                    <div className={`${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText} font-medium`}>{item.novelTitle}</div>
                    <div className={`${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText} text-sm text-muted-foreground`}>{item.followUpSummary}</div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <TaskQueueSeverityBadge severity={getFollowUpSeverity(item)} label={getFollowUpLevelLabel(item)} />
                  </div>
                </div>

                <div className="mt-3 flex min-w-0 flex-wrap gap-2 text-xs text-muted-foreground">
                  {item.section === "auto_progress" ? <TaskQueueStatusBadge label={formatItemType(item)} tone={tone} /> : null}
                  <TaskQueueStatusBadge label={formatStatus(item.status)} tone="neutral" />
                  <TaskQueueStatusBadge label={item.reasonLabel} tone="neutral" />
                  <TaskQueueStatusBadge label={getFollowUpPriorityLabel(item.priority, item.reason)} tone={tone} />
                  {item.executionScope ? <TaskQueueStatusBadge label={item.executionScope} tone="neutral" className={`max-w-full whitespace-normal text-left ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`} /> : null}
                  {item.supportsBatch ? <TaskQueueStatusBadge label="Bulk action available" tone="info" /> : null}
                  {buildChannelBadges(item).map((label) => (
                    <TaskQueueStatusBadge key={`${item.directorTaskId}:${label}`} label={label} tone="info" />
                  ))}
                </div>

                <div className={`mt-2 text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                  Current stage: {item.currentStage ?? "None"} · Current model: {item.currentModel ?? "None"} · Updated: {new Date(item.updatedAt).toLocaleString()}
                </div>
                </TaskQueueItem>
                <TaskRecordActions kind="novel_workflow" id={item.directorTaskId} status={item.status} title={item.novelTitle} allowStop />
                {item.supportsBatch ? (
                  <label className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center">
                    <span className="sr-only">Select {item.novelTitle} for a bulk action</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => props.onToggleSelected(item.directorTaskId, event.target.checked)}
                      disabled={props.actionLoading}
                    />
                  </label>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            Page {props.pagination?.page ?? 1} of {totalPages} · {props.pagination?.total ?? 0} total
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button
              variant="outline"
              size="sm"
              className={AUTO_DIRECTOR_MOBILE_CLASSES.fullWidthAction}
              disabled={(props.pagination?.page ?? 1) <= 1}
              onClick={() => props.onPageChange((props.pagination?.page ?? 1) - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={AUTO_DIRECTOR_MOBILE_CLASSES.fullWidthAction}
              disabled={(props.pagination?.page ?? 1) >= totalPages}
              onClick={() => props.onPageChange((props.pagination?.page ?? 1) + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </TaskQueueSection>
  );
}
