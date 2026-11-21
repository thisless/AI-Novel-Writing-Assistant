import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Headphones, RefreshCw } from "lucide-react";
import {
  estimateDramaEpisodeBatchJob,
  type DramaBatchCostBreakdown,
  type DramaBatchJob,
  type DramaBatchProgress,
  type DramaDialogueAudioData,
  type DramaEpisode,
  type DramaTTSProvider,
} from "@/api/drama";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SelectControl from "@/components/common/SelectControl";

function safeJson<T>(input: string | null | undefined, fallback: T): T {
  if (!input) {
    return fallback;
  }
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}

function parseBatchProgress(raw: string | null | undefined): DramaBatchProgress {
  return safeJson<DramaBatchProgress>(raw, {
    total: 0,
    done: 0,
    failed: 0,
    skipped: 0,
    failedShotIds: [],
    errors: [],
  });
}

function parseAudioData(raw: string | null | undefined): DramaDialogueAudioData {
  return safeJson<DramaDialogueAudioData>(raw, { status: "idle", items: [] });
}

function isActiveBatch(job: DramaBatchJob | undefined): boolean {
  return job?.status === "pending" || job?.status === "running";
}

function batchStatusLabel(status: DramaBatchJob["status"]): string {
  const labels: Record<DramaBatchJob["status"], string> = {
    pending: "Queued",
    running: "Running",
    paused: "Paused",
    done: "Completed",
    failed: "Some items failed",
  };
  return labels[status] ?? status;
}

export function DramaEpisodeAudioPanel(props: {
  projectId: string;
  episode: DramaEpisode;
  batchJobs?: DramaBatchJob[];
  ttsProviders: DramaTTSProvider[];
  busy: boolean;
  onBatchJob: (order: number, input: { type: "tts"; provider?: string; failedShotIds?: string[] }) => void;
}) {
  const [selectedProvider, setSelectedProvider] = useState("");
  const activeProvider = props.ttsProviders.some((provider) => provider.provider === selectedProvider)
    ? selectedProvider
    : props.ttsProviders[0]?.provider ?? "mock";
  const latestTtsBatch = props.batchJobs?.find((job) => job.episodeId === props.episode.id && job.type === "tts");
  const latestProgress = parseBatchProgress(latestTtsBatch?.progress);
  const ttsActive = isActiveBatch(latestTtsBatch);
  const hasStoryboardShots = Boolean(props.episode.storyboards?.[0]?.shots?.length);
  const estimateQuery = useQuery({
    queryKey: ["drama", "batch-estimate", props.projectId, props.episode.order, "tts", activeProvider],
    queryFn: () => estimateDramaEpisodeBatchJob(props.projectId, props.episode.order, {
      type: "tts",
      provider: activeProvider,
    }),
    enabled: hasStoryboardShots,
    staleTime: 30_000,
  });
  const audioItems = useMemo(() => {
    const storyboard = props.episode.storyboards?.[0];
    return (storyboard?.shots ?? []).flatMap((shot) => {
      const audio = parseAudioData(shot.dialogueAudioData);
      return (audio.items ?? []).map((item) => ({
        ...item,
        shotOrder: shot.order,
      }));
    });
  }, [props.episode.storyboards]);

  useEffect(() => {
    if (props.ttsProviders.length > 0 && !selectedProvider) {
      setSelectedProvider(props.ttsProviders[0]!.provider);
    }
  }, [props.ttsProviders, selectedProvider]);

  const total = Math.max(0, latestProgress.total ?? 0);
  const done = Math.max(0, latestProgress.done ?? 0);
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const failedShotIds = latestProgress.failedShotIds ?? [];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Voice-over</h3>
        <div className="flex flex-wrap gap-2">
          <SelectControl
            className="h-9 rounded-md border bg-background px-2 text-xs"
            value={activeProvider}
            onChange={(event) => setSelectedProvider(event.target.value)}
            aria-label="Voice-over provider"
          >
            {props.ttsProviders.length > 0 ? props.ttsProviders.map((provider) => (
              <option key={provider.provider} value={provider.provider}>{provider.label}</option>
            )) : (
              <option value="mock">Mock voice-over provider</option>
            )}
          </SelectControl>
          <Button
            size="sm"
            type="button"
            variant="outline"
            disabled={props.busy || ttsActive || !hasStoryboardShots}
            onClick={() => props.onBatchJob(props.episode.order, { type: "tts", provider: activeProvider })}
          >
            <Headphones className="h-4 w-4" />
            Generate voice-over for this episode
          </Button>
        </div>
      </div>
      <CostEstimate
        cost={estimateQuery.data?.data?.cost}
        loading={estimateQuery.isFetching}
      />

      {latestTtsBatch ? (
        <div className="rounded-md border p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="font-medium">Episode voice-over task</div>
            <Badge variant={latestTtsBatch.status === "failed" ? "destructive" : "outline"}>{batchStatusLabel(latestTtsBatch.status)}</Badge>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded bg-muted">
            <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{done}/{total}</span>
            {latestProgress.skipped ? <span>Skipped: {latestProgress.skipped}</span> : null}
            {latestProgress.failed ? <span>Failed: {latestProgress.failed}</span> : null}
            {latestProgress.provider ? <span>Provider: {latestProgress.provider}</span> : null}
            {latestProgress.cost ? <span>Estimated: {formatCost(latestProgress.cost, latestProgress.cost.estimated)}</span> : null}
            {latestProgress.cost ? <span>Actual: {formatCost(latestProgress.cost, latestProgress.cost.actual)}</span> : null}
          </div>
          {failedShotIds.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-destructive">Failed shots: {failedShotIds.join(", ")}</span>
              <Button
                size="sm"
                type="button"
                variant="outline"
                disabled={props.busy || ttsActive}
                onClick={() => props.onBatchJob(props.episode.order, {
                  type: "tts",
                  provider: activeProvider,
                  failedShotIds,
                })}
              >
                <RefreshCw className="h-4 w-4" />
                Retry failed shots
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {audioItems.length > 0 ? (
        <div className="space-y-2">
          {audioItems.map((item) => (
            <div key={`${item.shotOrder}-${item.lineIndex}`} className="rounded-md border p-3 text-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Shot {item.shotOrder}</Badge>
                {item.speaker ? <span className="font-medium">{item.speaker}</span> : null}
                {item.voiceId ? <span className="text-xs text-muted-foreground">Voice: {item.voiceId}</span> : null}
              </div>
              <p className="mb-2 text-muted-foreground">{item.text}</p>
              <audio className="w-full" controls src={item.audioUrl} />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Create a storyboard before generating voice-over for this episode.</div>
      )}
    </section>
  );
}

function formatCost(cost: DramaBatchCostBreakdown, amount: number): string {
  return `${cost.currency} ${amount.toFixed(2)}`;
}

function CostEstimate(props: { cost?: DramaBatchCostBreakdown; loading: boolean }) {
  return (
    <div className="rounded-md border border-dashed p-3 text-sm">
      <div className="text-xs text-muted-foreground">Estimated voice-over cost</div>
      <div className="mt-1 font-medium">
        {props.loading ? "Calculating…" : props.cost ? formatCost(props.cost, props.cost.estimated) : "Available after creating a storyboard"}
      </div>
      {props.cost ? (
        <div className="mt-1 text-xs text-muted-foreground">
          {props.cost.unit.costPerSecond ? `${formatCost(props.cost, props.cost.unit.costPerSecond)}/sec` : "Unit cost not configured"}
          {props.cost.estimatedUnits.shots ? ` · ${props.cost.estimatedUnits.shots} shots` : ""}
        </div>
      ) : null}
    </div>
  );
}
