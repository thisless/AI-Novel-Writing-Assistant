import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getRagSettings } from "@/api/settings";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

export default function SettingsNavigationCards(props: {
  mode?: "all" | "routes" | "knowledge";
}) {
  const { mode = "all" } = props;
  const ragSettingsQuery = useQuery({
    queryKey: queryKeys.settings.rag,
    queryFn: getRagSettings,
  });
  const ragSettings = ragSettingsQuery.data?.data;
  const ragProvider = useMemo(
    () => ragSettings?.providers.find((item) => item.provider === ragSettings.embeddingProvider),
    [ragSettings],
  );

  return (
    <>
      {mode === "all" || mode === "knowledge" ? (
        <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Knowledge base embeddings</CardTitle>
          <CardDescription className={AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}>
            You can start writing without this. Enabling it improves retrieval of worldbuilding, references, and context for long-form writing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid min-w-0 gap-3 md:grid-cols-2">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Embedding provider</div>
              <div className={`mt-1 font-medium ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>{ragProvider?.name ?? ragSettings?.embeddingProvider ?? "-"}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Embedding model</div>
              <div className={`mt-1 font-medium ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>{ragSettings?.embeddingModel ?? "-"}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Connection status</span>
            <Badge variant={ragProvider?.isConfigured ? "default" : "outline"}>
              {ragProvider?.isConfigured ? "API key available" : "API key missing"}
            </Badge>
            <Badge variant={ragProvider?.isActive ? "default" : "outline"}>
              {ragProvider?.isActive ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <Button asChild className={AUTO_DIRECTOR_MOBILE_CLASSES.fullWidthAction}>
            <Link to="/settings/knowledge">Open Knowledge & Style</Link>
          </Button>
        </CardContent>
        </Card>
      ) : null}

      {mode === "all" || mode === "routes" ? (
        <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Model routing</CardTitle>
          <CardDescription className={AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}>
            Choose available models for novel setup, chapter planning, manuscript generation, and review.
          </CardDescription>
        </CardHeader>
        <CardContent className={AUTO_DIRECTOR_MOBILE_CLASSES.settingsEntryActionRow}>
          <div className={`min-w-0 text-sm text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            When routes are healthy, Auto Director and chapter generation automatically select a model for each task.
          </div>
          <Button asChild className={AUTO_DIRECTOR_MOBILE_CLASSES.fullWidthAction}>
            <Link to="/settings/model-routes">Manage model routes</Link>
          </Button>
        </CardContent>
        </Card>
      ) : null}
    </>
  );
}
