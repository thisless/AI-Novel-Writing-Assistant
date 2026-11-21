import { useMemo, useState } from "react";
import type { FailureDiagnostic } from "@ai-novel/shared/types/agent";
import type {
  CreativeHubInterrupt,
  CreativeHubNovelSetupStatus,
  CreativeHubProductionStatus,
  CreativeHubResourceBinding,
  CreativeHubThread,
  CreativeHubTurnSummary,
} from "@ai-novel/shared/types/creativeHub";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import SelectControl from "@/components/common/SelectControl";
import { Link } from "react-router-dom";

interface CreativeHubSidebarProps {
  thread?: CreativeHubThread;
  bindings: CreativeHubResourceBinding;
  novels: Array<{ id: string; title: string }>;
  interrupt?: CreativeHubInterrupt;
  diagnostics?: FailureDiagnostic;
  productionStatus?: CreativeHubProductionStatus | null;
  novelSetup?: CreativeHubNovelSetupStatus | null;
  latestTurnSummary?: CreativeHubTurnSummary | null;
  currentCheckpointId?: string | null;
  modelSummary: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens?: number;
  };
  defaultRuntimeDetailsCollapsed: boolean;
  actionDisabled?: boolean;
  novelsLoading?: boolean;
  novelsErrorMessage?: string;
  novelsRetrying?: boolean;
  onToggleRuntimeDetailsDefault: () => void;
  onRetryNovels?: () => void;
  onNovelChange: (novelId: string) => void | Promise<void>;
  onQuickAction?: (prompt: string) => void;
}

function bindingStatusLabel(value: string | null | undefined): string {
  return value?.trim() ? "Linked" : "Not linked";
}

function pipelineStatusLabel(status: string | null | undefined): string {
  if (status === "queued") return "Queued";
  if (status === "running") return "Running";
  if (status === "succeeded") return "Completed";
  if (status === "failed") return "Failed";
  if (status === "cancelled") return "Cancelled";
  return "Not started";
}

function turnStatusLabel(status: CreativeHubTurnSummary["status"]): string {
  switch (status) {
    case "succeeded":
      return "Completed";
    case "interrupted":
      return "Needs review";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "running":
      return "In progress";
    default:
      return status;
  }
}

function threadStatusLabel(status: CreativeHubThread["status"] | undefined): string {
  switch (status) {
    case "busy":
      return "Running";
    case "interrupted":
      return "Needs review";
    case "error":
      return "Error";
    case "idle":
      return "Idle";
    default:
      return "Not initialized";
  }
}

function metricTone(status: "pending" | "completed" | "running" | "blocked"): string {
  switch (status) {
    case "completed":
      return "border-success/30 bg-success/5 text-success";
    case "running":
      return "border-info/30 bg-info/5 text-info";
    case "blocked":
      return "border-warning/30 bg-warning/5 text-warning";
    default:
      return "border-border bg-muted/30 text-muted-foreground";
  }
}

function buildBlockerCardData(input: {
  interrupt?: CreativeHubInterrupt;
  diagnostics?: FailureDiagnostic;
  productionStatus?: CreativeHubProductionStatus | null;
  latestTurnSummary?: CreativeHubTurnSummary | null;
}) {
  if (input.interrupt) {
    return {
      title: "Current blocker",
      summary: input.interrupt.summary,
      details: [
        `Awaiting approval: ${input.interrupt.title}`,
        input.interrupt.targetType ? `Target type: ${input.interrupt.targetType}` : "",
      ].filter(Boolean),
      tone: "border-warning/30 bg-warning/5 text-foreground",
      actionLabel: "Review pending action",
      actionPrompt: "Summarize the creative decisions awaiting confirmation and explain the recommended next steps.",
    };
  }

  if (input.diagnostics?.failureSummary) {
    return {
      title: "Current risk",
      summary: input.diagnostics.failureSummary,
      details: [
        input.diagnostics.failureCode ? `Error code: ${input.diagnostics.failureCode}` : "",
        input.diagnostics.recoveryHint ? `Recovery suggestion: ${input.diagnostics.recoveryHint}` : "",
      ].filter(Boolean),
      tone: "border-destructive/30 bg-destructive/5 text-foreground",
      actionLabel: "Create recovery plan",
      actionPrompt: input.diagnostics.recoveryHint || "Analyze the current failure and suggest recovery steps.",
    };
  }

  if (input.productionStatus?.failureSummary) {
    return {
      title: "Current blocker",
      summary: input.productionStatus.failureSummary,
      details: [
        input.productionStatus.recoveryHint ? `Recovery suggestion: ${input.productionStatus.recoveryHint}` : "",
        `Current stage: ${input.productionStatus.currentStage}`,
      ].filter(Boolean),
      tone: "border-destructive/30 bg-destructive/5 text-foreground",
      actionLabel: "View current blocker",
      actionPrompt: input.productionStatus.recoveryHint || "Analyze the current production blocker and identify the appropriate place to resolve it.",
    };
  }

  if (input.latestTurnSummary?.status === "interrupted") {
    return {
      title: "Current focus",
      summary: input.latestTurnSummary.nextSuggestion,
      details: [
        `Stage: ${input.latestTurnSummary.currentStage}`,
        `Status: ${turnStatusLabel(input.latestTurnSummary.status)}`,
      ],
      tone: "border-info/30 bg-info/5 text-foreground",
      actionLabel: "View suggestion",
      actionPrompt: `Explain this suggestion and where to take action: ${input.latestTurnSummary.nextSuggestion}`,
    };
  }

  return {
    title: "Current status",
    summary: "There are no issues that need attention. You can check novel progress or activity.",
    details: input.latestTurnSummary?.nextSuggestion
      ? [`Suggested next step: ${input.latestTurnSummary.nextSuggestion}`]
      : [],
    tone: "border-border bg-muted/20 text-foreground",
    actionLabel: input.latestTurnSummary?.nextSuggestion ? "View suggestion" : undefined,
    actionPrompt: input.latestTurnSummary?.nextSuggestion
      ? `Explain this suggestion and where to take action: ${input.latestTurnSummary.nextSuggestion}`
      : undefined,
  };
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
      <span>{label}</span>
      <span className="max-w-[60%] break-all text-right text-foreground">{value}</span>
    </div>
  );
}

export default function CreativeHubSidebar({
  thread,
  bindings,
  novels,
  interrupt,
  diagnostics,
  productionStatus,
  novelSetup,
  latestTurnSummary,
  currentCheckpointId,
  modelSummary,
  defaultRuntimeDetailsCollapsed,
  actionDisabled = false,
  novelsLoading = false,
  novelsErrorMessage = "",
  novelsRetrying = false,
  onToggleRuntimeDetailsDefault,
  onRetryNovels,
  onNovelChange,
  onQuickAction,
}: CreativeHubSidebarProps) {
  const [isBindingNovel, setIsBindingNovel] = useState(false);
  const selectedNovel = novels.find((item) => item.id === bindings.novelId);
  const currentNovelTitle = selectedNovel?.title
    ?? productionStatus?.title
    ?? novelSetup?.title
    ?? null;
  const blocker = useMemo(
    () => buildBlockerCardData({
      interrupt,
      diagnostics,
      productionStatus,
      latestTurnSummary,
    }),
    [diagnostics, interrupt, latestTurnSummary, productionStatus],
  );
  const completedAssets = productionStatus?.assetStages.filter((item) => item.status === "completed").length ?? 0;
  const latestRunId = latestTurnSummary?.runId ?? thread?.latestRunId ?? null;
  const blockerActionPrompt = blocker.actionPrompt ?? "";
  const resourceActionDisabled = actionDisabled || isBindingNovel;

  return (
    <Card
      className="flex h-full min-h-0 flex-col rounded-lg shadow-none"
      aria-busy={isBindingNovel || novelsRetrying}
    >
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Novel and status</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 text-sm">
        <div className="rounded-md border border-border bg-muted/20 p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Novel and resources</div>
          <div className="space-y-3 text-xs text-muted-foreground">
            <div className="space-y-1">
              <label htmlFor="creative-hub-novel" className="text-xs font-medium text-muted-foreground">Current novel</label>
              <SelectControl
                id="creative-hub-novel"
                className="w-full rounded-md border border-input bg-background p-2 text-base text-foreground disabled:cursor-not-allowed disabled:opacity-60 md:text-sm"
                value={bindings.novelId ?? ""}
                disabled={resourceActionDisabled || novelsLoading || Boolean(novelsErrorMessage)}
                onChange={(event) => {
                  const novelId = event.target.value;
                  setIsBindingNovel(true);
                  void Promise.resolve(onNovelChange(novelId))
                    .catch((error: unknown) => {
                      toast.error(error instanceof Error ? error.message : "Failed to switch novel workspace. Try again.");
                    })
                    .finally(() => setIsBindingNovel(false));
                }}
              >
                <option value="">No novel linked</option>
                {bindings.novelId && !selectedNovel ? (
                  <option value={bindings.novelId}>{currentNovelTitle ?? "Currently linked novel"}</option>
                ) : null}
                {novels.map((novel) => (
                  <option key={novel.id} value={novel.id}>
                    {novel.title}
                  </option>
                ))}
              </SelectControl>
              {novelsLoading ? (
                <div className="text-xs leading-5 text-muted-foreground" role="status">
                  Loading available novels. You can't switch workspaces until loading is complete.
                </div>
              ) : novelsErrorMessage ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs leading-5 text-foreground">
                  <div>Failed to load novels. Existing threads are unaffected.</div>
                  {onRetryNovels ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      disabled={novelsRetrying}
                      onClick={onRetryNovels}
                    >
                      {novelsRetrying ? "Reloading..." : "Reload novels"}
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline"><Link to="/novels/create">Create novel</Link></Button>
                {bindings.novelId ? <Button asChild size="sm" variant="outline"><Link to={`/novels/${bindings.novelId}/edit`}>Open novel workspace</Link></Button> : null}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>Chapter: {bindingStatusLabel(bindings.chapterId)}</div>
              <div>World: {bindingStatusLabel(bindings.worldId)}</div>
              <div>Task: {bindingStatusLabel(bindings.taskId)}</div>
              <div>Book analysis: {bindingStatusLabel(bindings.bookAnalysisId)}</div>
              <div>Writing formula: {bindingStatusLabel(bindings.formulaId)}</div>
              <div>Base character: {bindingStatusLabel(bindings.baseCharacterId)}</div>
            </div>
            <div>Knowledge documents: {bindings.knowledgeDocumentIds?.length ?? 0}</div>
          </div>
        </div>

        <div className="rounded-md border border-info/30 bg-info/5 p-3">
          <div className="text-xs font-medium text-info">Continue creating</div>
          <div className="mt-2 text-sm leading-6 text-foreground">For the complete novel creation, Agent production, and Auto Director workflows, continue in the main workspace.</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm"><Link to="/novels/auto-director">Open AI Auto Director</Link></Button>
          </div>
        </div>

        <div className={cn("rounded-md border p-3", blocker.tone)}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-xs font-medium">{blocker.title}</div>
            {interrupt ? <Badge variant="secondary">Needs approval</Badge> : null}
          </div>
          <div className="text-sm leading-6">{blocker.summary}</div>
          {blocker.details.length > 0 ? (
            <div className="mt-3 space-y-2 text-xs">
              {blocker.details.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>
          ) : null}
          {blocker.actionLabel && blockerActionPrompt ? (
            <div className="mt-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-current bg-background/80"
                disabled={actionDisabled}
                onClick={() => onQuickAction?.(blockerActionPrompt)}
              >
                {blocker.actionLabel}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="rounded-md border border-border bg-background p-3">
          <div className="mb-3 text-xs font-medium text-muted-foreground">Production stage</div>
          {productionStatus ? (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Current stage</div>
                  <div className="mt-2 text-sm font-medium text-foreground">{productionStatus.currentStage}</div>
                </div>
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Chapter progress</div>
                  <div className="mt-2 text-sm font-medium text-foreground">
                    {productionStatus.chapterCount}/{productionStatus.targetChapterCount}
                  </div>
                </div>
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Assets complete</div>
                  <div className="mt-2 text-sm font-medium text-foreground">
                    {completedAssets}/{productionStatus.assetStages.length}
                  </div>
                </div>
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Production pipeline</div>
                  <div className="mt-2 text-sm font-medium text-foreground">
                    {pipelineStatusLabel(productionStatus.pipelineStatus)}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {productionStatus.assetStages.map((item) => (
                  <span
                    key={item.key}
                    className={cn("rounded-full border px-2 py-1 text-[11px]", metricTone(item.status))}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              Select a novel and start production to see stages and progress here.
            </div>
          )}
        </div>

        <details className="rounded-md border border-border bg-background p-3">
          <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground">
            Runtime and debug information
          </summary>
          <div className="mt-3 space-y-3">
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                Runtime detail display
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  Message details are
                  {defaultRuntimeDetailsCollapsed ? " collapsed" : " expanded"}
                  {" "}by default
                </span>
                <Button type="button" size="sm" variant="outline" onClick={onToggleRuntimeDetailsDefault}>
                  {defaultRuntimeDetailsCollapsed ? "Expand by default" : "Collapse by default"}
                </Button>
              </div>
            </div>

            <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground">Thread status</div>
              <DebugRow label="Thread ID" value={thread?.id ?? "-"} />
              <DebugRow label="Thread status" value={threadStatusLabel(thread?.status)} />
              <DebugRow label="Latest run" value={latestRunId ?? "-"} />
              <DebugRow label="Current checkpoint" value={currentCheckpointId ?? "-"} />
            </div>

            <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground">Resource binding IDs</div>
              <DebugRow label="Novel" value={bindings.novelId ?? "-"} />
              <DebugRow label="Chapter" value={bindings.chapterId ?? "-"} />
              <DebugRow label="World" value={bindings.worldId ?? "-"} />
              <DebugRow label="Task" value={bindings.taskId ?? "-"} />
              <DebugRow label="Book analysis" value={bindings.bookAnalysisId ?? "-"} />
              <DebugRow label="Writing formula" value={bindings.formulaId ?? "-"} />
              <DebugRow label="Style profile" value={bindings.styleProfileId ?? "-"} />
              <DebugRow label="Base character" value={bindings.baseCharacterId ?? "-"} />
              <DebugRow label="Knowledge documents" value={bindings.knowledgeDocumentIds?.join(", ") || "-"} />
              {interrupt ? <DebugRow label="Pending target" value={interrupt.targetId ?? "-"} /> : null}
            </div>

            <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
              <div className="text-xs font-medium text-muted-foreground">Model routing</div>
              <DebugRow label="Provider" value={modelSummary.provider} />
              <DebugRow label="Model" value={modelSummary.model} />
              <DebugRow label="Temperature" value={String(modelSummary.temperature)} />
              <DebugRow label="Max tokens" value={modelSummary.maxTokens != null ? String(modelSummary.maxTokens) : "Default"} />
            </div>

            {latestTurnSummary ? (
              <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                <div className="text-xs font-medium text-muted-foreground">Latest turn</div>
                <DebugRow label="Turn status" value={turnStatusLabel(latestTurnSummary.status)} />
                <DebugRow label="Turn stage" value={latestTurnSummary.currentStage} />
                <DebugRow label="Summary checkpoint" value={latestTurnSummary.checkpointId ?? "-"} />
              </div>
            ) : null}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
