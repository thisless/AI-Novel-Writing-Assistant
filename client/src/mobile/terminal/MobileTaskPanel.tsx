import { useMutation, useQuery } from "@tanstack/react-query";
import { createDirectorCommandKey, getDirectorSummary, submitDirectorCommand } from "@/api/directorNext";
import { getDirectorBookAutomationProjection, pauseDirectorTask } from "@/api/novelDirector";
import { continueNovelWorkflow } from "@/api/novelWorkflow";
import { cancelTask, retryTask } from "@/api/tasks";
import type { DirectorBookAutomationAction } from "@ai-novel/shared/types/directorRuntime";
import DirectorBadge from "@/components/directorNext/DirectorBadge";
import { queryKeys } from "@/api/queryKeys";
import { getDirectorCockpitContinuationMode } from "@/lib/directorCockpitActions";
import { Button } from "@/components/ui/button";

export function MobileTaskPanel({ novelId, version }: { novelId: string; version: "v1" | "v2" }) {
  return version === "v2" ? <CurrentTask novelId={novelId} /> : <LegacyTask novelId={novelId} />;
}

function CurrentTask({ novelId }: { novelId: string }) {
  const query = useQuery({ queryKey: queryKeys.directorNext.summary(novelId), queryFn: () => getDirectorSummary(novelId), refetchInterval: 5000, retry: false });
  const view = query.data?.data;
  const pause = useMutation({ mutationFn: () => submitDirectorCommand({ type: "pause", runId: view!.runId, expectedVersion: view!.sourceTrace.controlVersion, idempotencyKey: createDirectorCommandKey() }), onSuccess: () => { void query.refetch(); } });
  const needsDesktopRecovery = Boolean(view?.chapterBudget || view?.unknownClaims || view?.sourceTrace.pauseKind === "replan" || view?.sourceTrace.pauseKind === "safety");
  const availableActions = view?.availableActions.filter(action => action.kind === "command" && ["resume", "retry_start", "cancel"].includes(action.command ?? "") && !(needsDesktopRecovery && action.command === "resume")) ?? [];
  return <section className="space-y-3 bg-muted/30 p-4" aria-label="Novel tasks">
    <h2 className="font-medium">Novel tasks</h2>
    {query.isError ? <p role="alert">Could not load task status. <Button variant="ghost" onClick={() => void query.refetch()}>Try again</Button></p> : null}
    {view ? <><p className="text-sm">{view.headline}</p><p className="text-sm text-muted-foreground">{view.detail ?? view.nextActionGuidance}</p>
      <p className="text-sm">{view.progress.done} / {view.progress.total} stages · {view.chapterProgress ? `${view.chapterProgress.done} / ${view.chapterProgress.total} chapters` : "Planning"}</p>
      <DirectorBadge view={{ ...view, availableActions }} novelId={novelId} onActionComplete={() => void query.refetch()} />
      {view.mode === "running" ? <Button variant="outline" size="sm" disabled={pause.isPending} onClick={() => pause.mutate()}>{pause.isPending ? "Pausing…" : "Pause task"}</Button> : null}
      {view.mode === "waiting_gate" ? <p className="text-sm text-muted-foreground">Review the relevant outline or chapter review results on desktop, then confirm the next step.</p> : null}
      {needsDesktopRecovery ? <p className="text-sm text-muted-foreground">Review the creation scope, call results, or usage limits on desktop before continuing.</p> : null}
    </> : !query.isError ? <p className="text-sm text-muted-foreground">{query.isPending ? "Loading task…" : "No active tasks."}</p> : null}
  </section>;
}

function LegacyTask({ novelId }: { novelId: string }) {
  const query = useQuery({ queryKey: ["mobileBookAutomation", novelId], queryFn: () => getDirectorBookAutomationProjection(novelId), refetchInterval: 5000 });
  const projection = query.data?.data?.projection;
  const pause = useMutation({ mutationFn: () => pauseDirectorTask(projection!.latestTask!.id), onSuccess: () => { void query.refetch(); } });
  const actions = [projection?.primaryAction, ...(projection?.secondaryActions ?? [])].filter((action): action is DirectorBookAutomationAction => !!action && ["continue", "auto_execute_range", "retry", "cancel"].includes(action.type));
  const mutation = useMutation({ mutationFn: async (action: DirectorBookAutomationAction) => {
    const taskId = action.commandPayload?.taskId ?? action.target.taskId ?? projection?.latestTask?.id;
    if (!taskId) throw new Error("The task has changed. Reload before continuing.");
    if (action.type === "cancel") await cancelTask("novel_workflow", taskId);
    else if (action.type === "retry") await retryTask("novel_workflow", taskId);
    else await continueNovelWorkflow(taskId, { continuationMode: getDirectorCockpitContinuationMode(action) });
  }, onSuccess: () => { void query.refetch(); } });
  return <section aria-label="Novel tasks" className="space-y-3 bg-muted/30 p-4"><h2 className="font-medium">Novel tasks</h2>
    {query.isError ? <p role="alert">Could not load task status. <Button variant="ghost" onClick={() => void query.refetch()}>Try again</Button></p> : null}
    {projection ? <><p className="text-sm">{projection.userHeadline}</p><p className="text-sm text-muted-foreground">{projection.progressSummary ?? projection.detail}</p>
      {projection.latestTask?.lastError ? <p className="text-sm text-destructive">{projection.latestTask.lastError}</p> : null}
      <div className="flex flex-wrap gap-2">{actions.map(action => <Button key={action.type} variant={action.type === "cancel" ? "outline" : "default"} size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate(action)}>{action.label}</Button>)}</div>
      {projection.latestTask && (projection.dashboardView?.mode === "running" || projection.dashboardView?.mode === "queued") ? <Button variant="outline" size="sm" disabled={pause.isPending || mutation.isPending} onClick={() => pause.mutate()}>{pause.isPending ? "Pausing…" : "Pause task"}</Button> : null}
    </> : !query.isError ? <p className="text-sm text-muted-foreground">{query.isPending ? "Loading task…" : "No tasks."}</p> : null}
  </section>;
}
