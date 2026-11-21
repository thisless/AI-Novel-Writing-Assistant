import { useState } from "react";
import { BookOpen, Download, Sparkles } from "lucide-react";
import type {
  NovelWorldGenerateInput,
  NovelWorldImportInput,
  NovelWorldManualInput,
} from "@ai-novel/shared/types/novelWorld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SelectControl from "@/components/common/SelectControl";

export interface WorldOption {
  id: string;
  name: string;
}

interface NovelWorldSourcePanelProps {
  worldOptions: WorldOption[];
  selectedWorldId: string;
  isImporting: boolean;
  isGenerating: boolean;
  isCreatingManual: boolean;
  onImport: (payload: NovelWorldImportInput) => void;
  onCreateManual: (payload?: NovelWorldManualInput) => void;
  onGenerate: (payload: NovelWorldGenerateInput) => void;
}

type WorldSetupMode = "generate" | "import" | "manual";

function WorldSetupChoice({
  icon: Icon,
  title,
  description,
  selected,
  onSelect,
}: {
  icon: typeof BookOpen;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        "rounded-md border p-3 text-left transition-colors",
        selected ? "border-primary bg-primary/5" : "border-border/70 bg-background hover:bg-muted/40",
      ].join(" ")}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        {title}
      </div>
      <div className="mt-2 text-xs leading-5 text-muted-foreground">{description}</div>
    </button>
  );
}

export default function NovelWorldSourcePanel(props: NovelWorldSourcePanelProps) {
  const [selectedImportWorldId, setSelectedImportWorldId] = useState(props.selectedWorldId);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [manualWorldTitle, setManualWorldTitle] = useState("");
  const [manualWorldSummary, setManualWorldSummary] = useState("");
  const [worldSetupMode, setWorldSetupMode] = useState<WorldSetupMode>("generate");

  return (
    <>
      <div id="novel-world-source" className="rounded-lg border border-border/70 bg-muted/20 p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">Choose a world source</div>
            <div className="mt-1 text-sm leading-6 text-muted-foreground">
              Choose where this novel's world comes from. New worlds are also saved to the world library and linked to this novel.
            </div>
          </div>
          <Badge variant="outline">Novel copy</Badge>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <WorldSetupChoice
            icon={Sparkles}
            title="Generate for this novel"
            description="Create a world based on the title, summary, selling points, and genre when you don't have a defined setting yet."
            selected={worldSetupMode === "generate"}
            onSelect={() => setWorldSetupMode("generate")}
          />
          <WorldSetupChoice
            icon={Download}
            title="Import from library"
            description="Copy a reusable world from the library for this novel, then choose whether to sync changes manually."
            selected={worldSetupMode === "import"}
            onSelect={() => setWorldSetupMode("import")}
          />
          <WorldSetupChoice
            icon={BookOpen}
            title="Create a custom outline"
            description="Start with a blank world guide and gradually add rules, forces, and locations."
            selected={worldSetupMode === "manual"}
            onSelect={() => setWorldSetupMode("manual")}
          />
        </div>
      </div>

      {worldSetupMode === "import" ? (
        <div className="rounded-lg border border-border/70 bg-background p-4">
          <div className="text-sm font-medium text-foreground">Import from library</div>
          <div className="mt-1 text-sm leading-6 text-muted-foreground">
            Importing creates a copy of the world guide. This novel uses the copy; the source in the world library is not changed.
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <SelectControl
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={selectedImportWorldId}
              onChange={(event) => setSelectedImportWorldId(event.target.value)}
            >
              <option value="">Select a world</option>
              {props.worldOptions.map((world) => (
                <option key={world.id} value={world.id}>{world.name}</option>
              ))}
            </SelectControl>
            <Button
              type="button"
              onClick={() => props.onImport({
                worldId: selectedImportWorldId,
                syncEnabled,
                syncDirection: syncEnabled ? "bidirectional" : "none",
              })}
              disabled={!selectedImportWorldId || props.isImporting}
            >
              <Download className="size-4" />
              {props.isImporting ? "Importing…" : "Import as novel world"}
            </Button>
          </div>
          <label className="mt-3 flex items-start gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="mt-1"
              checked={syncEnabled}
              onChange={(event) => setSyncEnabled(event.target.checked)}
            />
            <span>Sync remains available after import. Differences are shown for review; neither the novel world nor library source is overwritten automatically.</span>
          </label>
        </div>
      ) : null}

      {worldSetupMode === "generate" ? (
        <div className="rounded-lg border border-border/70 bg-background p-4">
          <div className="text-sm font-medium text-foreground">Generate a world for this novel</div>
          <div className="mt-1 text-sm leading-6 text-muted-foreground">
            Generate a world using the title, summary, selling points, reader promise, and genre. It's also saved to the world library for reuse.
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => props.onGenerate({})}
              disabled={props.isGenerating || props.isCreatingManual}
            >
              <Sparkles className="size-4" />
              {props.isGenerating ? "Generating…" : "Generate novel world"}
            </Button>
          </div>
        </div>
      ) : null}

      {worldSetupMode === "manual" ? (
        <div className="rounded-lg border border-border/70 bg-background p-4">
          <div className="text-sm font-medium text-foreground">Create a custom novel world</div>
          <div className="mt-1 text-sm leading-6 text-muted-foreground">
            Create a blank world guide, saved to the world library, then add core rules, main forces, story locations, and key tensions in the world workspace.
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">World name</span>
              <input
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={manualWorldTitle}
                maxLength={80}
                placeholder="For example: The Violet Realm"
                onChange={(event) => setManualWorldTitle(event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-foreground">One-sentence overview</span>
              <input
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={manualWorldSummary}
                maxLength={300}
                placeholder="For example: A frontier empire where both magic and power come at a cost."
                onChange={(event) => setManualWorldSummary(event.target.value)}
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => props.onCreateManual({
                title: manualWorldTitle.trim() || undefined,
                coverSummary: manualWorldSummary.trim() || undefined,
              })}
              disabled={props.isCreatingManual || props.isGenerating}
            >
              <BookOpen className="size-4" />
              {props.isCreatingManual ? "Creating…" : "Create custom novel world"}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
