import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { APP_RUNTIME, APP_RUNTIME_IS_PACKAGED } from "@/lib/constants";
import {
  getDesktopDataImportSnapshot,
  importDesktopLegacyDatabase,
  type DesktopDataImportSnapshot,
} from "@/lib/desktop";

interface DesktopLegacyDataImportCardProps {
  forceVisible?: boolean;
  compact?: boolean;
}

function shouldRenderCard(
  snapshot: DesktopDataImportSnapshot | null,
  forceVisible: boolean,
): boolean {
  if (forceVisible) {
    return true;
  }

  if (!snapshot) {
    return false;
  }

  return snapshot.currentDatabaseLikelyFresh || Boolean(snapshot.suggestedSourcePath);
}

export default function DesktopLegacyDataImportCard({
  forceVisible = false,
  compact = false,
}: DesktopLegacyDataImportCardProps) {
  const isSupportedDesktop = APP_RUNTIME === "desktop" && APP_RUNTIME_IS_PACKAGED;
  const [snapshot, setSnapshot] = useState<DesktopDataImportSnapshot | null>(null);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!isSupportedDesktop) {
      return;
    }

    let cancelled = false;
    setIsLoadingSnapshot(true);

    void getDesktopDataImportSnapshot()
      .then((nextSnapshot) => {
        if (!cancelled) {
          setSnapshot(nextSnapshot);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Could not detect legacy data.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSnapshot(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isSupportedDesktop]);

  if (!isSupportedDesktop || !shouldRenderCard(snapshot, forceVisible)) {
    return null;
  }

  const hasSuggestedSource = Boolean(snapshot?.suggestedSourcePath);
  const title = hasSuggestedSource ? "Legacy local database found" : "Import a legacy local database";
  const description = hasSuggestedSource
    ? "The desktop app found a local database used by a previous web or development version. Import it to bring over your novels, API keys, and knowledge base."
    : "The desktop app uses a separate data directory. If you have local data from a previous web or development version, you can import its dev.db file.";

  const importData = async (preferSuggested: boolean) => {
    try {
      setIsImporting(true);
      const result = await importDesktopLegacyDatabase({ preferSuggested });
      if (result?.cancelled) {
        return;
      }
      if (result?.scheduled) {
        toast("Preparing to import legacy data. The app will restart once.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import legacy data.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="border-sky-200 bg-sky-50/80">
      <CardHeader className={compact ? "pb-3" : undefined}>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{title}</CardTitle>
          <Badge variant="outline">Desktop</Badge>
          {snapshot?.currentDatabaseLikelyFresh ? <Badge variant="outline">Current desktop database appears to be empty</Badge> : null}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {snapshot?.suggestedSourcePath ? (
          <div className="rounded-md border border-dashed bg-background/70 p-3 text-sm text-muted-foreground">
            Legacy database found: {snapshot.suggestedSourcePath}
            {snapshot.suggestedSourceLabel ? ` (${snapshot.suggestedSourceLabel})` : ""}
          </div>
        ) : null}

        <div className="rounded-md border border-dashed bg-background/70 p-3 text-sm text-muted-foreground">
          Before import, the current desktop database will be backed up to: {snapshot?.backupDirectory ?? "-"}
        </div>

        <div className="text-xs text-muted-foreground">
          Close the old web or development app before importing to prevent it from writing to the same SQLite file.
        </div>

        <div className="flex flex-wrap gap-3">
          {hasSuggestedSource ? (
            <Button onClick={() => void importData(true)} disabled={isImporting || isLoadingSnapshot}>
              {isImporting ? "Preparing…" : "Import detected data"}
            </Button>
          ) : null}
          <Button
            variant={hasSuggestedSource ? "outline" : "default"}
            onClick={() => void importData(false)}
            disabled={isImporting || isLoadingSnapshot}
          >
            {isImporting ? "Preparing…" : hasSuggestedSource ? "Choose another dev.db" : "Choose a dev.db to import"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
