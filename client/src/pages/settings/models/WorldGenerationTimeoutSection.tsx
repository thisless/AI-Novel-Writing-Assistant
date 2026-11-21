import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getWorldGenerationTimeoutSettings,
  saveWorldGenerationTimeoutSettings,
} from "@/api/settings";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MS_PER_MINUTE = 60_000;

function toMinutes(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.round(value / MS_PER_MINUTE);
}

export function WorldGenerationTimeoutSection() {
  const queryClient = useQueryClient();
  const [minutes, setMinutes] = useState("2");
  const [feedback, setFeedback] = useState("");
  const settingsQuery = useQuery({
    queryKey: queryKeys.settings.worldGenerationTimeout,
    queryFn: getWorldGenerationTimeoutSettings,
  });
  const settings = settingsQuery.data?.data;
  const minMinutes = toMinutes(settings?.minTimeoutMs, 2);
  const maxMinutes = toMinutes(settings?.maxTimeoutMs, 10);
  const parsedMinutes = Number(minutes);
  const isValidTimeout = Number.isInteger(parsedMinutes)
    && parsedMinutes >= minMinutes
    && parsedMinutes <= maxMinutes;

  useEffect(() => {
    if (settings) {
      setMinutes(String(toMinutes(settings.timeoutMs, minMinutes)));
    }
  }, [settings, minMinutes]);

  const saveMutation = useMutation({
    mutationFn: (nextMinutes: number) => saveWorldGenerationTimeoutSettings({
      timeoutMs: nextMinutes * MS_PER_MINUTE,
    }),
    onSuccess: async (response) => {
      setFeedback(response.message ?? "World generation timeout saved.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.worldGenerationTimeout });
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Failed to save the world generation timeout.");
    },
  });

  return (
    <section className="space-y-3" aria-labelledby="world-generation-timeout-title">
      <div className="space-y-1">
        <h2 id="world-generation-timeout-title" className="text-base font-medium">Maximum wait per generation</h2>
        <p className="text-sm text-muted-foreground">
          Increase the per-request wait for world generation when using a slower local model. Two minutes is usually sufficient for cloud models. The next world generation will use this timeout after saving. If it fails, the system may retry once automatically.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="space-y-1 text-sm">
          <span>Wait time (minutes)</span>
          <Input
            type="number"
            min={minMinutes}
            max={maxMinutes}
            step={1}
            value={minutes}
            className="w-28"
            onChange={(event) => {
              setFeedback("");
              setMinutes(event.target.value);
            }}
          />
        </label>
        <Button
          type="button"
          onClick={() => saveMutation.mutate(parsedMinutes)}
          disabled={settingsQuery.isLoading || saveMutation.isPending || !isValidTimeout}
        >
          {saveMutation.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
      {!isValidTimeout ? (
        <p className="text-sm text-amber-700">Enter a whole number between {minMinutes} and {maxMinutes} minutes.</p>
      ) : (
        <p className="text-sm text-muted-foreground">Allowed range: {minMinutes}–{maxMinutes} minutes.</p>
      )}
      {feedback ? <p className="text-sm text-muted-foreground">{feedback}</p> : null}
    </section>
  );
}
