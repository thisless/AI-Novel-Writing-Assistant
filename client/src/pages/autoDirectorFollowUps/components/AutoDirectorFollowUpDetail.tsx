import type {
  AutoDirectorAction,
  AutoDirectorFollowUpDetail,
  AutoDirectorFollowUpItem,
} from "@ai-novel/shared/types/autoDirectorFollowUp";
import { Button } from "@/components/ui/button";
import {
  TaskQueueActionRow,
  TaskQueueImpactNotice,
  TaskQueueSection,
  TaskQueueStatusBadge,
} from "@/components/taskQueue";
import { WorkspaceStateNotice } from "@/components/workspace";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";
import {
  getFollowUpActionConsequence,
  getFollowUpActionRiskDescription,
  getFollowUpActionTone,
  getFollowUpLevelLabel,
  getFollowUpPriorityLabel,
  getFollowUpSeverity,
  getFollowUpTone,
} from "../followUpPresentation";

interface AutoDirectorFollowUpDetailPanelProps {
  detail: AutoDirectorFollowUpDetail | null;
  selectedItem: AutoDirectorFollowUpItem | null;
  loading: boolean;
  errorMessage?: string | null;
  actionLoading: boolean;
  onExecuteAction: (item: AutoDirectorFollowUpItem, action: AutoDirectorAction) => void | Promise<void>;
  onRefreshValidation: () => void | Promise<void>;
  onSafeFix: () => void | Promise<void>;
  onRetry: () => void | Promise<void>;
}

export function AutoDirectorFollowUpDetailPanel({
  detail,
  selectedItem,
  loading,
  errorMessage,
  actionLoading,
  onExecuteAction,
  onRefreshValidation,
  onSafeFix,
  onRetry,
}: AutoDirectorFollowUpDetailPanelProps) {
  const deliveryStatusLabels = {
    delivered: "Delivered",
    pending: "Sending",
    failed: "Delivery failed",
  } as const;
  const eventTypeLabels = {
    "auto_director.approval_required": "Action required",
    "auto_director.auto_approved": "Auto-approved by AI",
    "auto_director.exception": "Task error",
    "auto_director.recovered": "Recovered",
    "auto_director.completed": "Completed",
    "auto_director.progress_changed": "Progress updated",
  } as const;
  const tone = selectedItem ? getFollowUpTone(selectedItem) : "neutral";

  return (
    <TaskQueueSection
      title="Follow-up details"
      description="Each action explains its consequences. Follow-ups retain their director task identity and are kept separate from manual workspace tasks."
      className="min-w-0 overflow-hidden"
    >
      <div className="space-y-4">
        {loading ? (
          <WorkspaceStateNotice loading title="Loading follow-up details" description="Syncing director tasks, checkpoints, and recent validation results." />
        ) : null}

        {errorMessage ? (
          <WorkspaceStateNotice
            tone="danger"
            title="Could not load follow-up details"
            description={errorMessage}
            action={<Button size="sm" variant="outline" onClick={() => void onRetry()}>Reload</Button>}
          />
        ) : null}

        {!loading && !errorMessage && (!detail || !selectedItem) ? (
          <WorkspaceStateNotice title="Select a director follow-up" description="View its blockers, next steps, and safe actions." />
        ) : null}

        {detail && selectedItem ? (
          <>
            <div className="space-y-1">
              <div className={`${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText} font-medium`}>{selectedItem.novelTitle}</div>
              <div className={`${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText} text-sm text-muted-foreground`}>{selectedItem.reasonLabel}</div>
              <div className="flex flex-wrap gap-2 pt-2">
                <TaskQueueStatusBadge label={getFollowUpLevelLabel(selectedItem)} tone={tone} />
                <TaskQueueStatusBadge label={getFollowUpPriorityLabel(selectedItem.priority, selectedItem.reason)} tone={tone} />
              </div>
            </div>

            <TaskQueueImpactNotice
              severity={getFollowUpSeverity(selectedItem)}
              title={getFollowUpLevelLabel(selectedItem)}
              description={detail.blockingReason ?? detail.followUpSummary}
            />

            {detail.riskNote ? (
              <WorkspaceStateNotice
                compact
                tone={tone === "danger" ? "danger" : tone === "warning" ? "warning" : "info"}
                title="Risk details"
                description={detail.riskNote}
              />
            ) : null}

            <div className={`grid gap-2 text-sm text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              <div>Suggested next step: {detail.nextStepSuggestion ?? "Review the task details before continuing."}</div>
              <div>Checkpoint summary: {detail.checkpointSummary ?? "None"}</div>
              <div>Current model: {detail.currentModel ?? "None"}</div>
            </div>

            {selectedItem.section === "needs_validation" ? (
              <div className={`space-y-3 rounded-md border border-warning/25 bg-warning/5 p-3 text-sm text-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <div>
                    <div className="font-medium">Validate task and asset status first</div>
                    <div className="mt-1 text-xs">
                      Safe fixes only reconcile statuses. They do not clear content, rewrite plans, approve candidates, switch models, or make creative choices for you.
                    </div>
                  </div>
                </div>
                {(detail.validationSummary?.blockingReasons.length ?? 0) > 0 ? (
                  <div className="space-y-1 text-xs">
                    {detail.validationSummary?.blockingReasons.map((reason) => (
                      <div key={reason}>Blocker: {reason}</div>
                    ))}
                  </div>
                ) : null}
                {(detail.validationSummary?.warnings.length ?? 0) > 0 ? (
                  <div className="space-y-1 text-xs">
                    {detail.validationSummary?.warnings.map((warning) => (
                      <div key={warning}>Note: {warning}</div>
                    ))}
                  </div>
                ) : null}
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className={AUTO_DIRECTOR_MOBILE_CLASSES.fullWidthAction}
                    disabled={actionLoading}
                    onClick={() => void onRefreshValidation()}
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Revalidate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoading}
                    className={`${AUTO_DIRECTOR_MOBILE_CLASSES.fullWidthAction} border-warning/40 bg-warning/10 text-warning hover:bg-warning/15 hover:text-warning`}
                    title="Only fixes low-risk statuses, checkpoints, progress, recovery targets, automation reconciliation, replacement reasons, audit records, and notifications flagged by validation. Does not clear content, rewrite assets, replan, approve candidates, switch models, or generate content."
                    onClick={() => void onSafeFix()}
                  >
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    Apply safe fixes
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="text-sm font-medium">Available actions</div>
              {detail.availableActions.map((action) => (
                <TaskQueueActionRow
                  key={action.code}
                  title={action.label}
                  consequence={`${getFollowUpActionConsequence(action)} Risk: ${getFollowUpActionRiskDescription(action)}`}
                  tone={getFollowUpActionTone(action)}
                  action={(
                    <Button
                      variant={action.kind === "mutation" && action.riskLevel === "low" ? "default" : "outline"}
                      size="sm"
                      className={AUTO_DIRECTOR_MOBILE_CLASSES.fullWidthAction}
                      disabled={actionLoading}
                      onClick={() => void onExecuteAction(selectedItem, action)}
                    >
                      {action.label}
                    </Button>
                  )}
                />
              ))}
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Recent milestones</div>
              <div className="space-y-2">
                {detail.milestones.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No milestones yet</div>
                ) : detail.milestones.map((milestone) => (
                  <div key={`${milestone.at}:${milestone.label}`} className={`rounded-md border p-3 text-sm ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                    <div className="font-medium">{milestone.label}</div>
                    <div className="text-xs text-muted-foreground">{new Date(milestone.at).toLocaleString()}</div>
                    {milestone.summary ? (
                      <div className="mt-1 text-xs text-muted-foreground">{milestone.summary}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Channel delivery</div>
              <div className="space-y-2">
                {(detail.channelDeliveries?.length ?? 0) === 0 ? (
                  <div className="text-sm text-muted-foreground">No channel delivery records</div>
                ) : detail.channelDeliveries?.map((delivery) => (
                  <div key={`${delivery.channelType}:${delivery.eventType}`} className={`rounded-md border p-3 text-sm ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <TaskQueueStatusBadge label={delivery.channelType === "dingtalk" ? "DingTalk" : delivery.channelType === "feishu" ? "Feishu" : "WeCom"} tone="neutral" />
                      <TaskQueueStatusBadge
                        label={deliveryStatusLabels[delivery.status]}
                        tone={delivery.status === "delivered" ? "success" : delivery.status === "failed" ? "danger" : "info"}
                      />
                      <span className="text-xs text-muted-foreground">{eventTypeLabels[delivery.eventType]}</span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Target: {delivery.target ?? "Not recorded"} | Response code: {delivery.responseStatus ?? "Not recorded"} | Time: {delivery.deliveredAt ? new Date(delivery.deliveredAt).toLocaleString() : "Not delivered"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </TaskQueueSection>
  );
}
