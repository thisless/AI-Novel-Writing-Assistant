import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import {
  getStyleEngineRuntimeSettings,
  saveStyleEngineRuntimeSettings,
} from "@/api/settings";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

const MS_PER_MINUTE = 60_000;

function toMinutes(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 10;
  }
  return Math.round(value / MS_PER_MINUTE);
}

function clampMinutes(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function StyleEngineRuntimeSettingsCard() {
  const queryClient = useQueryClient();
  const [timeoutMinutes, setTimeoutMinutes] = useState("10");
  const [feedback, setFeedback] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings.styleEngineRuntime,
    queryFn: getStyleEngineRuntimeSettings,
  });

  const settings = settingsQuery.data?.data;
  const limits = useMemo(() => ({
    minMinutes: toMinutes(settings?.minStyleExtractionTimeoutMs),
    maxMinutes: toMinutes(settings?.maxStyleExtractionTimeoutMs),
    effectiveMinutes: toMinutes(settings?.styleExtractionTimeoutMs),
    defaultMinutes: toMinutes(settings?.defaultStyleExtractionTimeoutMs),
  }), [settings]);

  useEffect(() => {
    if (settings) {
      setTimeoutMinutes(String(toMinutes(settings.styleExtractionTimeoutMs)));
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (minutes: number) =>
      saveStyleEngineRuntimeSettings({
        styleExtractionTimeoutMs: minutes * MS_PER_MINUTE,
      }),
    onSuccess: async (response) => {
      setFeedback(response.message ?? "Style engine runtime settings saved.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.styleEngineRuntime });
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : "Failed to save style engine runtime settings.");
    },
  });

  const parsedMinutes = Number(timeoutMinutes);
  const isValidTimeout = Number.isInteger(parsedMinutes)
    && parsedMinutes >= limits.minMinutes
    && parsedMinutes <= limits.maxMinutes;
  const modeOptions = [
    {
      label: "Quick check",
      value: limits.minMinutes,
      description: "Best for short text or quickly checking whether a sample's style can be extracted.",
    },
    {
      label: "Balanced (recommended)",
      value: clampMinutes(limits.defaultMinutes, limits.minMinutes, limits.maxMinutes),
      description: "Best for most style extraction tasks, balancing wait time with early detection of problems.",
    },
    {
      label: "Long-form extraction",
      value: limits.maxMinutes,
      description: "Best for long source texts or slower models; allows more time for extraction.",
    },
  ];

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <CardTitle>Style engine runtime settings</CardTitle>
          <CardDescription className={AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}>
            Set the maximum time to wait for the model during style extraction. Use a longer timeout for long source texts; shorter timeouts can surface issues sooner for short texts.
          </CardDescription>
        </div>
        <Badge variant="outline">Effective: {limits.effectiveMinutes} min</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid min-w-0 gap-3 md:grid-cols-3">
          {modeOptions.map((mode) => {
            const active = parsedMinutes === mode.value;
            return (
              <button
                key={mode.label}
                type="button"
                className={cn(
                  "min-w-0 rounded-md border p-3 text-left transition-colors",
                  active ? "border-primary bg-primary/10" : "bg-background hover:bg-muted/40",
                )}
                onClick={() => {
                  setFeedback("");
                  setTimeoutMinutes(String(mode.value));
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{mode.label}</div>
                  {active ? <Badge variant="default">Selected</Badge> : null}
                </div>
                <div className={`mt-2 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                  {mode.description}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{mode.value} min</div>
              </button>
            );
          })}
        </div>

        {!isValidTimeout ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Enter a whole number between {limits.minMinutes} and {limits.maxMinutes} minutes.
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-medium text-primary"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((prev) => !prev)}
          >
            Advanced settings
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", advancedOpen ? "rotate-180" : "")} />
          </button>
          <Button
            className="w-full sm:w-auto"
            onClick={() => saveMutation.mutate(parsedMinutes)}
            disabled={settingsQuery.isLoading || saveMutation.isPending || !isValidTimeout}
          >
            {saveMutation.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>

        {advancedOpen ? (
          <div className="space-y-2 rounded-md border bg-muted/20 p-3">
            <div className="text-sm font-medium">Style extraction timeout (minutes)</div>
            <Input
              type="number"
              min={limits.minMinutes}
              max={limits.maxMinutes}
              step={1}
              value={timeoutMinutes}
              onChange={(event) => {
                setFeedback("");
                setTimeoutMinutes(event.target.value);
              }}
            />
            <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              Range: {limits.minMinutes}–{limits.maxMinutes} minutes. Newly submitted and retried style extraction tasks will use this timeout after saving.
            </div>
          </div>
        ) : null}

        {feedback ? <div className={`text-sm text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>{feedback}</div> : null}
      </CardContent>
    </Card>
  );
}
