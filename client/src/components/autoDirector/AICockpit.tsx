import type { ReactNode } from "react";
import type {
  DirectorBookAutomationAction,
  DirectorBookAutomationDisplayState,
  DirectorBookAutomationProjection,
} from "@ai-novel/shared/types/directorRuntime";
import { getDirectorNodeDisplayLabel } from "@ai-novel/shared/types/directorRuntime";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
  Clock3,
  Database,
  ExternalLink,
  History,
  PauseCircle,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AICockpitProps {
  projection?: DirectorBookAutomationProjection | null;
  mode?: "focusedNovel" | "compact";
  fallbackSummary?: string | null;
  fallbackStatusLabel?: string | null;
  isActionPending?: boolean;
  showDetailsAction?: boolean;
  onAction?: (projection: DirectorBookAutomationProjection, action: DirectorBookAutomationAction) => void;
  onOpenDetails?: (projection: DirectorBookAutomationProjection) => void;
  onOpenNovel?: (projection: DirectorBookAutomationProjection) => void;
  onOpenFallbackDetails?: () => void;
}

function displayStateLabel(state: DirectorBookAutomationDisplayState): string {
  const labels: Record<DirectorBookAutomationDisplayState, string> = {
    processing: "AI processing",
    needs_confirmation: "Awaiting your approval",
    paused: "Paused",
    needs_attention: "Needs attention",
    completed: "Completed",
    idle: "Not started",
  };
  return labels[state];
}

function stateBadgeVariant(state: DirectorBookAutomationDisplayState): "default" | "secondary" | "outline" | "destructive" {
  if (state === "needs_attention") {
    return "destructive";
  }
  if (state === "processing") {
    return "default";
  }
  if (state === "needs_confirmation" || state === "paused") {
    return "outline";
  }
  return "secondary";
}

function stateClassName(state: DirectorBookAutomationDisplayState): string {
  if (state === "processing") {
    return "border-sky-500/25 bg-sky-500/10";
  }
  if (state === "needs_confirmation") {
    return "border-amber-500/25 bg-amber-500/10";
  }
  if (state === "paused") {
    return "border-indigo-500/25 bg-indigo-500/10";
  }
  if (state === "needs_attention") {
    return "border-destructive/30 bg-destructive/5";
  }
  if (state === "completed") {
    return "border-emerald-500/25 bg-emerald-500/10";
  }
  return "border-border/70 bg-muted/20";
}

function stateIcon(state: DirectorBookAutomationDisplayState) {
  if (state === "processing") {
    return <Activity className="h-4 w-4" />;
  }
  if (state === "needs_confirmation") {
    return <PauseCircle className="h-4 w-4" />;
  }
  if (state === "paused") {
    return <Clock3 className="h-4 w-4" />;
  }
  if (state === "needs_attention") {
    return <AlertTriangle className="h-4 w-4" />;
  }
  if (state === "completed") {
    return <CheckCircle2 className="h-4 w-4" />;
  }
  return <ShieldCheck className="h-4 w-4" />;
}

function stateAccentClassName(state: DirectorBookAutomationDisplayState): string {
  if (state === "processing") {
    return "text-sky-700 dark:text-sky-300";
  }
  if (state === "needs_confirmation") {
    return "text-amber-700 dark:text-amber-300";
  }
  if (state === "paused") {
    return "text-indigo-700 dark:text-indigo-300";
  }
  if (state === "needs_attention") {
    return "text-destructive";
  }
  if (state === "completed") {
    return "text-emerald-700 dark:text-emerald-300";
  }
  return "text-muted-foreground";
}

function stateSoftSurfaceClassName(state: DirectorBookAutomationDisplayState): string {
  if (state === "processing") {
    return "bg-sky-500/10";
  }
  if (state === "needs_confirmation") {
    return "bg-amber-500/10";
  }
  if (state === "paused") {
    return "bg-indigo-500/10";
  }
  if (state === "needs_attention") {
    return "bg-destructive/5";
  }
  if (state === "completed") {
    return "bg-emerald-500/10";
  }
  return "bg-muted/20";
}

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
  const count = Math.max(0, Math.round(Number(value ?? 0)));
  return count.toLocaleString();
}

function formatDuration(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  const seconds = Math.round(value / 1000);
  if (seconds <= 0) {
    return "<1 sec";
  }
  if (seconds < 60) {
    return `${seconds} sec`;
  }
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  return restSeconds > 0 ? `${minutes} min ${restSeconds} sec` : `${minutes} min`;
}

function formatUsageLine(usage: {
  llmCallCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs?: number | null;
}): string {
  const duration = formatDuration(usage.durationMs);
  return [
    `${formatTokenCount(usage.llmCallCount)} calls`,
    `Input ${formatTokenCount(usage.promptTokens)}`,
    `Output ${formatTokenCount(usage.completionTokens)}`,
    `Total ${formatTokenCount(usage.totalTokens)} tokens`,
    duration ? `Total call time ${duration}` : null,
  ].filter(Boolean).join(" · ");
}

function fallbackProjectionReason(props: Pick<AICockpitProps, "fallbackSummary">): string {
  return props.fallbackSummary?.trim() || "There are no AI autopilot tasks that need your attention.";
}

function renderActionLabel(
  action: DirectorBookAutomationAction,
  displayState?: DirectorBookAutomationDisplayState,
): string {
  if (
    displayState === "needs_confirmation"
    && (action.type === "continue" || action.type === "auto_execute_range")
  ) {
    return "Approve and continue";
  }
  return action.label || "Continue";
}

function artifactTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    book_contract: "Book contract",
    story_macro: "Story plan",
    character_cast: "Characters",
    volume_strategy: "Volume plan",
    chapter_task_sheet: "Task sheet",
    chapter_draft: "Draft",
    audit_report: "Review",
    repair_ticket: "Repair",
    reader_promise: "Reader promise",
    character_governance_state: "Character state",
    world_skeleton: "World framework",
    source_knowledge_pack: "Reference pack",
    chapter_retention_contract: "Retention contract",
    continuity_state: "Continuity",
    rolling_window_review: "Recent review",
  };
  return labels[type] ?? type;
}

function recoveryActionLabel(
  action: NonNullable<DirectorBookAutomationProjection["circuitBreaker"]>["recoveryAction"],
): string | null {
  const labels: Record<string, string> = {
    retry: "Retry current step",
    resume_after_review: "Review the cause, then continue",
    switch_model: "Switch model, then continue",
    confirm_protected_content: "Confirm protected-content boundaries",
    manual_repair: "Resolve chapter issues first",
  };
  return action ? labels[action] ?? null : null;
}

function workerStateLabel(
  state: NonNullable<DirectorBookAutomationProjection["workerHealth"]>["derivedState"],
): string {
  const labels: Record<NonNullable<DirectorBookAutomationProjection["workerHealth"]>["derivedState"], string> = {
    idle: "Not running",
    queued_waiting_worker: "Queued",
    leased_starting: "Starting",
    running_step: "Auto-progressing",
    waiting_gate: "Awaiting approval",
    auto_recovering: "Recovering",
    cancelled: "Stopped",
    failed_recoverable: "Recovery available",
    failed_hard: "Needs attention",
    succeeded: "Completed",
  };
  return labels[state] ?? state;
}

function workerStateDetail(health: NonNullable<DirectorBookAutomationProjection["workerHealth"]>): string {
  if (health.message?.trim()) {
    return health.message.trim();
  }
  if (health.queuedCommandCount > 0) {
    return "The task is queued and will continue when a background worker picks it up.";
  }
  if (health.runningCommandCount > 0 || health.leasedCommandCount > 0) {
    return "A background worker is processing the current task.";
  }
  if (health.staleCommandCount > 0) {
    return "If background execution is interrupted, it will try to resume from the latest progress.";
  }
  return "No background actions are queued or running.";
}

function SummaryMetric(props: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-muted-foreground">{props.label}</div>
      <div className={cn("mt-1 truncate text-sm font-medium text-foreground", props.className)}>
        {props.value}
      </div>
    </div>
  );
}

function DetailPanel(props: {
  title: string;
  summary?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-2xl bg-muted/25">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          {props.icon ? <span className="shrink-0 text-muted-foreground">{props.icon}</span> : null}
          <span className="truncate">{props.title}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs font-normal text-muted-foreground">
          {props.summary}
          <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
        </span>
      </summary>
      <div className="px-4 pb-4 pt-1">
        {props.children}
      </div>
    </details>
  );
}

export default function AICockpit(props: AICockpitProps) {
  const {
    mode = "focusedNovel",
    fallbackStatusLabel,
    isActionPending = false,
    showDetailsAction = true,
    onAction,
    onOpenDetails,
    onOpenNovel,
    onOpenFallbackDetails,
  } = props;
  const focusProjection = props.projection ?? null;
  const isCompact = mode === "compact";

  if (!focusProjection) {
    return (
      <div className="rounded-2xl bg-muted/25 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 shrink-0 text-muted-foreground">{stateIcon("idle")}</span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">AI cockpit</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">{fallbackProjectionReason(props)}</div>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0">{fallbackStatusLabel ?? "Not started"}</Badge>
        </div>
        {onOpenFallbackDetails ? (
          <Button type="button" size="sm" variant="outline" className="mt-3 w-full" onClick={onOpenFallbackDetails}>
            View
          </Button>
        ) : null}
      </div>
    );
  }

  const primaryAction = focusProjection.primaryAction ?? null;
  const detailAction = focusProjection.secondaryActions?.find((item) => item.type === "open_details") ?? null;
  const canOpenDetails = showDetailsAction && Boolean(onOpenDetails || (detailAction && onAction));
  const recentItems = focusProjection.timeline.slice(0, isCompact ? 2 : 3);
  const artifactRows = focusProjection.artifactSummary.byType?.slice(0, 3) ?? [];
  const usageSummary = focusProjection.usageSummary ?? null;
  const stepUsage = focusProjection.stepUsage?.slice(0, 2) ?? [];
  const promptUsage = focusProjection.promptUsage?.slice(0, 6) ?? [];
  const circuitBreaker = focusProjection.circuitBreaker?.status === "open" ? focusProjection.circuitBreaker : null;
  const circuitRecovery = recoveryActionLabel(circuitBreaker?.recoveryAction ?? null);
  const workerHealth = focusProjection.workerHealth ?? null;
  const artifactInsightLines = [
    focusProjection.artifactSummary.affectedChapterCount
      ? `Affects ${focusProjection.artifactSummary.affectedChapterCount} chapters`
      : null,
    focusProjection.artifactSummary.recentStaleArtifacts?.length
      ? `${focusProjection.artifactSummary.recentStaleArtifacts.length} assets need review`
      : null,
    focusProjection.artifactSummary.recentRepairArtifacts?.length
      ? `${focusProjection.artifactSummary.recentRepairArtifacts.length} repair records`
      : null,
    focusProjection.artifactSummary.recentVersionedArtifacts?.length
      ? `${focusProjection.artifactSummary.recentVersionedArtifacts.length} assets have new versions`
      : null,
  ].filter((line): line is string => Boolean(line));
  const reason = focusProjection.userReason?.trim()
    || focusProjection.blockedReason?.trim()
    || focusProjection.detail?.trim()
    || focusProjection.automationSummary?.trim()
    || fallbackProjectionReason(props);
  const statusHeadline = focusProjection.userHeadline?.trim()
    || focusProjection.headline?.trim()
    || displayStateLabel(focusProjection.displayState);
  const statusDetail = reason === statusHeadline
    ? focusProjection.progressSummary?.trim() || "AI will summarize this novel's latest autopilot status here."
    : reason;
  const latestRecordText = recentItems[0] ? formatDate(recentItems[0].occurredAt) : "None";

  const handlePrimaryAction = () => {
    if (primaryAction && onAction) {
      onAction(focusProjection, primaryAction);
      return;
    }
    onOpenNovel?.(focusProjection);
  };

  const handleDetails = () => {
    if (detailAction && onAction) {
      onAction(focusProjection, detailAction);
      return;
    }
    onOpenDetails?.(focusProjection);
  };

  const handleCompactOpen = () => {
    if (onOpenNovel) {
      onOpenNovel(focusProjection);
      return;
    }
    handleDetails();
  };

  if (isCompact) {
    return (
      <div className={cn("rounded-lg border p-3", stateClassName(focusProjection.displayState))}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 shrink-0 text-foreground">{stateIcon(focusProjection.displayState)}</span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">AI cockpit</div>
              <div className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground">
                {focusProjection.userHeadline || focusProjection.headline || reason}
              </div>
            </div>
          </div>
          <Badge variant={stateBadgeVariant(focusProjection.displayState)} className="shrink-0">
            {displayStateLabel(focusProjection.displayState)}
          </Badge>
        </div>
        <Button type="button" size="sm" variant="outline" className="mt-3 w-full" onClick={handleCompactOpen}>
          View
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className={cn("rounded-2xl p-5 shadow-sm", stateSoftSurfaceClassName(focusProjection.displayState))}>
        <div className="flex items-center justify-between gap-3">
          <div className={cn("flex min-w-0 items-center gap-2 text-xs font-medium", stateAccentClassName(focusProjection.displayState))}>
            <span className="shrink-0">
              {stateIcon(focusProjection.displayState)}
            </span>
            <span className="truncate">{displayStateLabel(focusProjection.displayState)}</span>
          </div>
          <span className="min-w-0 max-w-[52%] truncate rounded-full bg-background/60 px-2.5 py-1 text-xs text-muted-foreground">
            {focusProjection.focusNovel.title}
          </span>
        </div>

        <div className="mt-4 max-w-[46rem]">
          <h3 className="text-base font-semibold leading-7 text-foreground">{statusHeadline}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{statusDetail}</p>
        </div>

        <div className="mt-5 grid gap-3 rounded-xl bg-background/60 p-3 sm:grid-cols-3">
          <SummaryMetric
            label="Current status"
            value={displayStateLabel(focusProjection.displayState)}
            className={stateAccentClassName(focusProjection.displayState)}
          />
          <SummaryMetric label="Progress overview" value={focusProjection.progressSummary || "No progress summary"} />
          <SummaryMetric label="Latest activity" value={latestRecordText} />
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] text-muted-foreground">Next step</div>
            <div className="mt-1 text-sm font-medium leading-5 text-foreground">
              {focusProjection.nextActionLabel || "Open the novel to view current content"}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Button type="button" size="sm" onClick={handlePrimaryAction} disabled={isActionPending}>
              {isActionPending ? "Processing…" : renderActionLabel(primaryAction ?? {
                type: "open_novel",
                label: "Open novel",
                target: { novelId: focusProjection.novelId },
              }, focusProjection.displayState)}
            </Button>
            {canOpenDetails ? (
              <Button type="button" size="sm" variant="secondary" onClick={handleDetails}>
                <ExternalLink className="h-4 w-4" />
                Task details
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {circuitBreaker ? (
        <section className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm leading-6 text-destructive">
          <div className="font-medium">Autopilot paused</div>
          <div className="mt-1">{circuitBreaker.message || "The system detected that continuing autopilot may cause repeated failures."}</div>
          {circuitRecovery ? <div className="mt-1">Suggested action: {circuitRecovery}.</div> : null}
        </section>
      ) : null}

      {workerHealth ? (
        <section className="rounded-2xl bg-muted/25 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Database className="h-4 w-4 text-muted-foreground" />
              Background execution
            </div>
            <span className="text-xs text-muted-foreground">{workerStateLabel(workerHealth.derivedState)}</span>
          </div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">{workerStateDetail(workerHealth)}</div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            <SummaryMetric label="Queued" value={workerHealth.queuedCommandCount} />
            <SummaryMetric label="Claimed" value={workerHealth.leasedCommandCount} />
            <SummaryMetric label="Running" value={workerHealth.runningCommandCount} />
            <SummaryMetric label="Recovering" value={workerHealth.staleCommandCount} />
          </div>
          {workerHealth.oldestQueuedWaitMs ? (
            <div className="mt-2 text-[11px] text-muted-foreground">
              Waiting to be claimed {formatDuration(workerHealth.oldestQueuedWaitMs) ?? "<1 sec"}
            </div>
          ) : null}
        </section>
      ) : null}

      {artifactRows.length > 0 ? (
        <section className="rounded-2xl bg-muted/25 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Database className="h-4 w-4 text-muted-foreground" />
              Asset records
            </div>
            {artifactInsightLines.length > 0 ? (
              <span className="text-xs text-muted-foreground">{artifactInsightLines[0]}</span>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs text-muted-foreground">
            {artifactRows.map((item) => (
              <span key={item.artifactType}>
                <span className="font-medium text-foreground">{artifactTypeLabel(String(item.artifactType))}</span>
                <span className="ml-1">{item.activeCount}/{item.totalCount}</span>
              </span>
            ))}
          </div>
          {artifactInsightLines.length > 1 ? (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {artifactInsightLines.slice(1).map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {usageSummary ? (
        <DetailPanel
          title="AI usage"
          summary={`${formatTokenCount(usageSummary.llmCallCount)} calls · ${formatTokenCount(usageSummary.totalTokens)} tokens`}
          icon={<Activity className="h-4 w-4" />}
        >
          <div className="space-y-3 text-xs leading-5 text-muted-foreground">
            <div>{formatUsageLine(usageSummary)}</div>
            {promptUsage.length > 0 ? (
              <div className="space-y-1">
                <div className="font-medium text-foreground">Usage by stage</div>
                <div className="divide-y divide-border/60">
                  {promptUsage.map((item) => (
                    <div key={`${item.promptAssetKey}:${item.promptVersion ?? ""}:${item.nodeKey ?? ""}`} className="grid gap-1 py-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                      <span className="min-w-0 truncate text-foreground">
                        {getDirectorNodeDisplayLabel({ label: item.label ?? item.promptAssetKey, nodeKey: item.nodeKey })}
                      </span>
                      <span>{formatUsageLine(item)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {stepUsage.length > 0 ? (
              <div className="space-y-1">
                <div className="font-medium text-foreground">Automation steps</div>
                <div className="divide-y divide-border/60">
                  {stepUsage.map((item) => (
                    <div key={item.stepIdempotencyKey} className="grid gap-1 py-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                      <span className="min-w-0 truncate text-foreground">
                        {getDirectorNodeDisplayLabel({ label: item.label, nodeKey: item.nodeKey })}
                      </span>
                      <span>{formatUsageLine(item)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </DetailPanel>
      ) : null}

      {recentItems.length > 0 ? (
        <DetailPanel
          title="Automation history"
          summary={`${recentItems.length} records`}
          icon={<History className="h-4 w-4" />}
        >
          <div className="divide-y divide-border/60 text-xs leading-5">
            {recentItems.map((item) => (
              <div key={item.id} className="py-2">
                <div className="line-clamp-2 text-foreground">{item.title}</div>
                {item.usage ? (
                  <div className="mt-1 text-muted-foreground">{formatUsageLine(item.usage)}</div>
                ) : item.durationMs ? (
                  <div className="mt-1 text-muted-foreground">Duration: {formatDuration(item.durationMs)}</div>
                ) : null}
                <div className="mt-1 text-muted-foreground">{formatDate(item.occurredAt)}</div>
              </div>
            ))}
          </div>
        </DetailPanel>
      ) : null}
    </div>
  );
}
