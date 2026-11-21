import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OutlineFeedbackRunView, OutlineFeedbackSettings } from "@ai-novel/shared/types/outlineFeedback";
import {
  adoptOutlineFeedback,
  analyzeOutlineFeedback,
  getOutlineFeedbackStatus,
  rejectOutlineFeedback,
  retryOutlineFeedbackRun,
  updateOutlineFeedbackSettings,
} from "@/api/outlines";
import { Button } from "@/components/ui/button";
import { featureFlags } from "@/config/featureFlags";
import { useIsMobileViewport } from "@/components/layout/mobile/useIsMobileViewport";
import { outlineFieldLabels } from "./outlineNodes";

const RUN_STATUS_LABEL: Record<OutlineFeedbackRunView["status"], string> = {
  pending: "Queued",
  running: "Analyzing",
  completed: "Completed",
  failed: "Failed",
};

const ITEM_STATUS_LABEL = {
  pending: "Pending",
  adopted: "Applied",
  rejected: "Rejected",
} as const;

function defaultSettings(settings?: OutlineFeedbackSettings | null): OutlineFeedbackSettings {
  return {
    mode: settings?.mode ?? "chapter",
    everyN: settings?.everyN ?? 5,
    provider: settings?.provider,
    model: settings?.model,
  };
}

export function shouldShowOutlineFeedbackPanel(options: { flagEnabled: boolean; bound: boolean; isMobile: boolean }) {
  return options.flagEnabled && options.bound && !options.isMobile;
}

export function OutlineFeedbackPanel({ outlineId, bound }: { outlineId: string; bound: boolean }) {
  const isMobile = useIsMobileViewport();
  if (!shouldShowOutlineFeedbackPanel({ flagEnabled: featureFlags.outlineFeedbackEnabled, bound, isMobile })) {
    return null;
  }
  return <OutlineFeedbackPanelBody outlineId={outlineId} />;
}

function OutlineFeedbackPanelBody({ outlineId }: { outlineId: string }) {
  const queryClient = useQueryClient();
  const [settingsDraft, setSettingsDraft] = useState<OutlineFeedbackSettings>(defaultSettings());
  const [chapterId, setChapterId] = useState("");
  const [requestKey, setRequestKey] = useState("");
  const statusQuery = useQuery({
    queryKey: ["outline-feedback", outlineId],
    queryFn: () => getOutlineFeedbackStatus(outlineId),
    enabled: !!outlineId,
    refetchInterval: (query) => {
      const runs = query.state.data?.runs ?? [];
      return runs.some((run) => run.status === "pending" || run.status === "running") ? 3000 : false;
    },
  });

  useEffect(() => {
    if (statusQuery.data?.settings) setSettingsDraft(defaultSettings(statusQuery.data.settings));
  }, [statusQuery.data?.settings]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["outline-feedback", outlineId] }),
      queryClient.invalidateQueries({ queryKey: ["outline", outlineId] }),
      queryClient.invalidateQueries({ queryKey: ["outline-revisions", outlineId] }),
    ]);
  };

  const saveSettings = useMutation({
    mutationFn: () => updateOutlineFeedbackSettings(outlineId, settingsDraft),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["outline-feedback", outlineId] });
    },
  });
  const analyze = useMutation({
    mutationFn: () => analyzeOutlineFeedback(outlineId, { chapterId: chapterId.trim(), requestKey: requestKey.trim() }),
    onSuccess: async () => {
      setRequestKey("");
      await queryClient.invalidateQueries({ queryKey: ["outline-feedback", outlineId] });
    },
  });
  const retry = useMutation({
    mutationFn: (runId: string) => retryOutlineFeedbackRun(outlineId, runId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["outline-feedback", outlineId] });
    },
  });
  const decide = useMutation({
    mutationFn: ({ runId, action, operationIds }: { runId: string; action: "adopt" | "reject"; operationIds: string[] }) =>
      action === "adopt"
        ? adoptOutlineFeedback(outlineId, runId, operationIds)
        : rejectOutlineFeedback(outlineId, runId, operationIds),
    onSuccess: async () => {
      await refresh();
    },
  });

  const runs = statusQuery.data?.runs ?? [];
  const hasActive = useMemo(() => runs.some((run) => run.status === "pending" || run.status === "running"), [runs]);

  return (
    <section id="outline-feedback-panel" aria-label="Chapter summary feedback" className="space-y-4 rounded-md border border-border/60 p-4">
      <header className="space-y-1">
        <h2 className="text-base font-semibold">Chapter summary feedback</h2>
        <p className="text-xs text-muted-foreground">
          Suggest outline field changes based on saved chapter summaries. Apply or reject each suggestion before creating a new revision. The outline is never edited automatically, and chapter text is not read.
        </p>
        {statusQuery.data?.sourceRoute ? (
          <p className="text-xs text-muted-foreground">Linked source: {statusQuery.data.sourceRoute}</p>
        ) : null}
      </header>

      {statusQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading feedback…</p> : null}
      {statusQuery.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {statusQuery.error instanceof Error ? statusQuery.error.message : "Failed to load feedback status. Try again later."}
        </p>
      ) : null}

      {statusQuery.isSuccess ? (
        <>
          <form
            className="space-y-3 border-b border-border/50 pb-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveSettings.mutate();
            }}
          >
            <h3 className="text-sm font-medium">Trigger settings</h3>
            <div className="flex flex-wrap items-end gap-3">
              <label className="space-y-1 text-xs">
                <span className="text-muted-foreground">Frequency</span>
                <select
                  className="block rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                  value={settingsDraft.mode}
                  onChange={(event) => setSettingsDraft((current) => ({ ...current, mode: event.target.value as OutlineFeedbackSettings["mode"] }))}
                >
                  <option value="chapter">Every chapter</option>
                  <option value="every_n">Every N chapters</option>
                  <option value="volume">End of each volume</option>
                  <option value="off">Turn off automatic analysis</option>
                </select>
              </label>
              {settingsDraft.mode === "every_n" ? (
                <label className="space-y-1 text-xs">
                  <span className="text-muted-foreground">N</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="block w-20 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                    value={settingsDraft.everyN}
                    onChange={(event) => setSettingsDraft((current) => ({ ...current, everyN: Number(event.target.value) || 1 }))}
                  />
                </label>
              ) : null}
              <Button type="submit" size="sm" variant="outline" disabled={saveSettings.isPending}>
                {saveSettings.isPending ? "Saving…" : "Save settings"}
              </Button>
            </div>
            {saveSettings.isError ? (
              <p role="alert" className="text-sm text-destructive">
                {saveSettings.error instanceof Error ? saveSettings.error.message : "Failed to save settings. Try again."}
              </p>
            ) : null}
          </form>

          <form
            className="space-y-3 border-b border-border/50 pb-4"
            onSubmit={(event) => {
              event.preventDefault();
              analyze.mutate();
            }}
          >
            <h3 className="text-sm font-medium">Manual analysis</h3>
            <div className="flex flex-wrap items-end gap-3">
              <label className="space-y-1 text-xs">
                <span className="text-muted-foreground">Chapter ID</span>
                <input
                  className="block w-56 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                  value={chapterId}
                  onChange={(event) => setChapterId(event.target.value)}
                  aria-label="Chapter ID to analyze"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span className="text-muted-foreground">Request key</span>
                <input
                  className="block w-56 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                  value={requestKey}
                  onChange={(event) => setRequestKey(event.target.value)}
                  aria-label="Manual analysis request key"
                />
              </label>
              <Button type="submit" size="sm" disabled={!chapterId.trim() || !requestKey.trim() || analyze.isPending}>
                {analyze.isPending ? "Submitted…" : "Start analysis"}
              </Button>
            </div>
            {analyze.isError ? (
              <p role="alert" className="text-sm text-destructive">
                {analyze.error instanceof Error ? analyze.error.message : "Analysis request failed. Try again."}
              </p>
            ) : null}
          </form>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Runs and suggestions</h3>
              {hasActive ? <p className="text-xs text-muted-foreground">Analysis is in progress. This list will refresh automatically.</p> : null}
            </div>
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No feedback runs yet. Saved summaries are analyzed asynchronously according to your settings, or you can start an analysis manually.</p>
            ) : (
              <ul className="space-y-4">
                {runs.map((run) => (
                  <li key={run.id} className="space-y-2 rounded-md border border-border/50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm">
                        Chapter {run.chapterOrder} · {RUN_STATUS_LABEL[run.status]}
                        {run.attempt > 1 ? ` · Attempt ${run.attempt}` : ""}
                      </p>
                      {run.status === "failed" || (run.status === "running" && run.attempt >= 1) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={retry.isPending}
                          onClick={() => retry.mutate(run.id)}
                        >
                          Retry
                        </Button>
                      ) : null}
                    </div>
                    {run.error ? <p role="alert" className="text-xs text-destructive">{run.error}</p> : null}
                    {run.items.length ? (
                      <ul className="space-y-3">
                        {run.items.map((item) => (
                          <li key={item.operationId} className="space-y-2 text-sm">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="font-medium">Node {item.nodeId}</p>
                                <p className="text-xs text-muted-foreground">{ITEM_STATUS_LABEL[item.status]}</p>
                              </div>
                              {item.status === "pending" ? (
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={decide.isPending}
                                    onClick={() => decide.mutate({ runId: run.id, action: "adopt", operationIds: [item.operationId] })}
                                  >
                                    Apply
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={decide.isPending}
                                    onClick={() => decide.mutate({ runId: run.id, action: "reject", operationIds: [item.operationId] })}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{item.reason}</p>
                            <dl className="outline-comparison text-xs">
                              {Object.entries(item.fields).map(([field, value]) => (
                                <div key={field}>
                                  <dt className="text-muted-foreground">{outlineFieldLabels[field] ?? field}</dt>
                                  <dd className="mt-1 whitespace-pre-wrap">{value}</dd>
                                </div>
                              ))}
                            </dl>
                          </li>
                        ))}
                      </ul>
                    ) : run.status === "completed" ? (
                      <p className="text-xs text-muted-foreground">This run has no field suggestions to apply.</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {decide.isError ? (
              <p role="alert" className="text-sm text-destructive">
                {decide.error instanceof Error ? decide.error.message : "Failed to process suggestions. If another revision changed the outline, run the analysis again."}
              </p>
            ) : null}
            {retry.isError ? (
              <p role="alert" className="text-sm text-destructive">
                {retry.error instanceof Error ? retry.error.message : "Retry failed. Try again later."}
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
