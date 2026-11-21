import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, CircleAlert, CircleDashed, Loader2 } from "lucide-react";
import type {
  APIKeyStatus,
  ModelRouteConnectivityResponse,
  ModelRoutesResponse,
  RagSettingsStatus,
  StyleEngineRuntimeSettingsStatus,
} from "@/api/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

export type SettingsReadinessItem = {
  key: "model" | "routes" | "rag" | "style";
  title: string;
  description: string;
  state: "ready" | "warning" | "optional" | "checking";
};

function getReadinessIcon(state: SettingsReadinessItem["state"]) {
  if (state === "ready") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  }
  if (state === "checking") {
    return <Loader2 className="h-4 w-4 animate-spin text-amber-600" />;
  }
  if (state === "optional") {
    return <CircleDashed className="h-4 w-4 text-sky-600" />;
  }
  return <CircleAlert className="h-4 w-4 text-amber-600" />;
}

function getReadinessBadge(state: SettingsReadinessItem["state"]) {
  switch (state) {
    case "ready":
      return "Ready";
    case "checking":
      return "Checking";
    case "optional":
      return "Optional";
    case "warning":
      return "Needs attention";
  }
}

export function buildSettingsReadinessItems(input: {
  providers: APIKeyStatus[];
  ragSettings?: RagSettingsStatus | null;
  styleSettings?: StyleEngineRuntimeSettingsStatus | null;
  modelRoutes?: ModelRoutesResponse | null;
  modelRouteConnectivity?: ModelRouteConnectivityResponse | null;
  isModelRoutesChecking: boolean;
  isStyleSettingsLoaded: boolean;
}): SettingsReadinessItem[] {
  const {
    providers,
    ragSettings,
    styleSettings,
    modelRoutes,
    modelRouteConnectivity,
    isModelRoutesChecking,
    isStyleSettingsLoaded,
  } = input;
  const runnableProviders = providers.filter((item) => item.isConfigured && item.isActive && item.currentModel);
  const currentRagProvider = ragSettings?.providers.find((item) => item.provider === ragSettings.embeddingProvider);
  const routeStatuses = modelRouteConnectivity?.statuses ?? [];
  const failedRouteCount = routeStatuses.filter(
    (item) => (item.plain && !item.plain.ok) || (item.structured && !item.structured.ok),
  ).length;
  const hasRoutes = (modelRoutes?.routes ?? []).length > 0;
  const styleTimeout = styleSettings?.styleExtractionTimeoutMs;
  const styleReady = Boolean(styleSettings)
    && typeof styleTimeout === "number"
    && styleTimeout >= styleSettings!.minStyleExtractionTimeoutMs
    && styleTimeout <= styleSettings!.maxStyleExtractionTimeoutMs;

  return [
    {
      key: "model",
      title: "Writing model",
      state: runnableProviders.length > 0 ? "ready" : "warning",
      description: runnableProviders.length > 0
        ? `Ready to use ${runnableProviders[0].name} for manuscript writing and planning.`
        : "Configure an available model to start a novel and generate chapters.",
    },
    {
      key: "routes",
      title: "Model routes",
      state: isModelRoutesChecking ? "checking" : hasRoutes && failedRouteCount === 0 ? "ready" : "warning",
      description: isModelRoutesChecking
        ? "Checking model compatibility for novel setup, chapter planning, writing, and review."
        : hasRoutes && failedRouteCount === 0
          ? "Writing tasks have usable routes. The workflow will select a model for each task."
          : "Some writing tasks still need their model routes configured or fixed.",
    },
    {
      key: "rag",
      title: "Knowledge enhancement",
      state: ragSettings?.enabled && currentRagProvider?.isConfigured && currentRagProvider?.isActive ? "ready" : "optional",
      description: ragSettings?.enabled && currentRagProvider?.isConfigured && currentRagProvider?.isActive
        ? "Knowledge retrieval is enabled and can help maintain continuity in reference materials and worldbuilding for long-form writing."
        : "You can start writing without this. Enabling it improves retrieval of worldbuilding, references, and context.",
    },
    {
      key: "style",
      title: "Style engine",
      state: !isStyleSettingsLoaded ? "checking" : styleReady ? "ready" : "warning",
      description: styleReady
        ? "The style extraction timeout is within the allowed range and can be used to learn from writing samples."
        : "Make sure the style extraction timeout is within the allowed range.",
    },
  ];
}

export default function SettingsReadinessCard(props: {
  items: SettingsReadinessItem[];
}) {
  const { items } = props;
  const modelItem = items.find((item) => item.key === "model");
  const routesItem = items.find((item) => item.key === "routes");
  const hasModel = modelItem?.state === "ready";
  const hasHealthyRoutes = routesItem?.state === "ready";
  const blockingCount = items.filter((item) => item.key !== "rag" && item.state === "warning").length;
  const canStart = hasModel && hasHealthyRoutes && blockingCount === 0;
  const primaryAction = !hasModel
    ? { label: "Configure a writing model", to: "/settings/models" }
    : !hasHealthyRoutes
      ? { label: "Check model routes", to: "/settings/models" }
      : { label: "Create a novel", to: "/novels/create" };

  return (
    <Card className="min-w-0 overflow-hidden border-primary/20 bg-primary/5">
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <CardTitle>Writing readiness check</CardTitle>
          <CardDescription className={AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}>
            First, make sure the models and routes required to start writing are available. Knowledge retrieval is an enhancement you can configure later.
          </CardDescription>
        </div>
        <Button asChild className={AUTO_DIRECTOR_MOBILE_CLASSES.fullWidthAction}>
          <Link to={primaryAction.to}>
            {primaryAction.label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <div key={item.key} className="min-w-0 rounded-md border bg-background/80 p-3">
              <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {getReadinessIcon(item.state)}
                  <div className="min-w-0 font-medium">{item.title}</div>
                </div>
                <Badge variant={item.state === "ready" ? "default" : "outline"}>
                  {getReadinessBadge(item.state)}
                </Badge>
              </div>
              <div className={`text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                {item.description}
              </div>
            </div>
          ))}
        </div>
        <div className={`text-sm ${canStart ? "text-emerald-700" : "text-muted-foreground"} ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
          {canStart
            ? "The core writing workflow is ready. You can create a novel or continue working on one."
            : "Address the items marked “Needs attention” before using Auto Director or generating chapters for a more reliable workflow."}
        </div>
      </CardContent>
    </Card>
  );
}
