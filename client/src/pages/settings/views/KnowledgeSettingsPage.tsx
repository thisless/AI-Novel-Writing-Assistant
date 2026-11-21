import { useQuery } from "@tanstack/react-query";
import { Database, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { getRagSettings } from "@/api/settings";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import StyleEngineRuntimeSettingsCard from "../components/StyleEngineRuntimeSettingsCard";
import { SettingsShell } from "../components/SettingsShell";

export default function KnowledgeSettingsPage() {
  const ragQuery = useQuery({ queryKey: queryKeys.settings.rag, queryFn: getRagSettings });
  const rag = ragQuery.data?.data;
  return (
    <SettingsShell title="Knowledge & Style" description="These enhancements help AI understand your reference materials and style, but you can start writing without them.">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" />Knowledge Retrieval</CardTitle>
          <CardDescription>
            {ragQuery.isLoading ? "Loading retrieval status…" : rag?.enabled ? `Reference retrieval is enabled, using ${rag.embeddingModel || "the default embedding model"}.` : "Reference retrieval is disabled. Novel and chapter generation will continue to work normally."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Manage the embedding model, knowledge base URL, index, and retrieval settings together on the retrieval configuration page.</p>
          <Button asChild variant="outline"><Link to="/knowledge?tab=settings">Configure retrieval<ExternalLink className="h-4 w-4" /></Link></Button>
        </CardContent>
      </Card>
      <StyleEngineRuntimeSettingsCard />
    </SettingsShell>
  );
}
