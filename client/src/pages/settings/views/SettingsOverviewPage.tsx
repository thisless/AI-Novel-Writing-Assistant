import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpenCheck, Bot, Database, MonitorCog, Route } from "lucide-react";
import { Link } from "react-router-dom";
import {
  getAPIKeySettings,
  getModelRoutes,
  getRagSettings,
  getStyleEngineRuntimeSettings,
  testModelRouteConnectivity,
} from "@/api/settings";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SettingsReadinessCard, { buildSettingsReadinessItems } from "../components/SettingsReadinessCard";
import { SettingsShell } from "../components/SettingsShell";
import { APP_RUNTIME } from "@/lib/constants";

const entries = [
  { to: "/settings/models", title: "Models & Providers", label: "Models & Providers", description: "Add providers, choose models, and manage connections.", icon: Bot },
  { to: "/settings/model-routes", title: "Model Routing", label: "Model Routing", description: "Choose models for different writing tasks and check connection status.", icon: Route },
  { to: "/settings/director", title: "Auto Director", label: "Auto Director", description: "Set issue handling, confirmation preferences, and reminders.", icon: BookOpenCheck },
  { to: "/settings/knowledge", title: "Knowledge & Style", label: "Knowledge & Style", description: "Use reference materials and style preferences in future writing.", icon: Database },
  { to: "/settings/maintenance", title: "Desktop & Maintenance", label: "Desktop & Maintenance", description: "View updates and data maintenance for this device.", icon: MonitorCog },
];

export default function SettingsOverviewPage() {
  const providersQuery = useQuery({ queryKey: queryKeys.settings.apiKeys, queryFn: getAPIKeySettings });
  const routesQuery = useQuery({ queryKey: queryKeys.settings.modelRoutes, queryFn: getModelRoutes });
  const connectivityQuery = useQuery({
    queryKey: queryKeys.settings.modelRouteConnectivity,
    queryFn: testModelRouteConnectivity,
    enabled: routesQuery.isSuccess,
    refetchOnWindowFocus: false,
  });
  const ragQuery = useQuery({ queryKey: queryKeys.settings.rag, queryFn: getRagSettings });
  const styleQuery = useQuery({ queryKey: queryKeys.settings.styleEngineRuntime, queryFn: getStyleEngineRuntimeSettings });
  const items = useMemo(() => buildSettingsReadinessItems({
    providers: providersQuery.data?.data ?? [],
    modelRoutes: routesQuery.data?.data,
    modelRouteConnectivity: connectivityQuery.data?.data,
    ragSettings: ragQuery.data?.data,
    styleSettings: styleQuery.data?.data,
    isModelRoutesChecking: connectivityQuery.isPending || connectivityQuery.isFetching,
    isStyleSettingsLoaded: styleQuery.isSuccess,
  }), [connectivityQuery.data?.data, connectivityQuery.isFetching, connectivityQuery.isPending, providersQuery.data?.data, ragQuery.data?.data, routesQuery.data?.data, styleQuery.data?.data, styleQuery.isSuccess]);
  const configuredProvider = providersQuery.data?.data?.find((item) => item.isConfigured && item.isActive);
  const routeCount = routesQuery.data?.data?.routes.filter((route) => route.provider && route.model).length ?? 0;
  const rag = ragQuery.data?.data;

  return (
    <SettingsShell title="Settings" description="Review your writing environment and open the settings you want to adjust.">
      <SettingsReadinessCard items={items} />
      <div className="grid gap-4 md:grid-cols-2">
        {entries.map(({ to, title, label, description, icon: Icon }) => {
          const summary = title === "Models & Providers"
            ? configuredProvider ? `${configuredProvider.name} · ${configuredProvider.currentModel || "No model selected"}` : "No text model configured"
            : title === "Model Routing"
              ? `${routeCount} task routes configured`
            : title === "Knowledge & Style"
              ? rag?.enabled ? `Reference retrieval enabled · ${rag.embeddingModel || "No embedding model selected"}` : "Optional enhancement; you can start writing without it"
              : title === "Desktop & Maintenance"
                ? APP_RUNTIME === "desktop" ? "Check for desktop updates and review legacy local data" : "No desktop maintenance is needed on the web"
                : "Set confirmation preferences, issue handling, and notifications";
          return (
            <Card key={to} className="min-w-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Icon className="h-4 w-4" />{label}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-3">
                <p className="text-sm text-muted-foreground">{summary}</p>
                <Button asChild variant="outline" size="sm" className="shrink-0"><Link to={to}>Open<ArrowRight className="h-4 w-4" /></Link></Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </SettingsShell>
  );
}
