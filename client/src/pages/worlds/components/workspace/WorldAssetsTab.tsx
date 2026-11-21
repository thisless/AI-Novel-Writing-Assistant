import { useState, type Dispatch, type SetStateAction } from "react";
import { GitCompareArrows, GitFork, Map, Network, Workflow } from "lucide-react";
import type { World, WorldSnapshot } from "@ai-novel/shared/types/world";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import KnowledgeBindingPanel from "@/components/knowledge/KnowledgeBindingPanel";
import SelectControl from "@/components/common/SelectControl";

interface WorldLibraryItem {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  worldType?: string | null;
  usageCount: number;
  sourceWorldId?: string | null;
}

interface WorldAssetsTabProps {
  worldId: string;
  world?: World;
  selectedLayerPrimaryField: "background" | "magicSystem" | "politics" | "cultures" | "history" | "conflicts";
  libraryKeyword: string;
  setLibraryKeyword: Dispatch<SetStateAction<string>>;
  libraryCategory: string;
  setLibraryCategory: Dispatch<SetStateAction<string>>;
  publishName: string;
  setPublishName: Dispatch<SetStateAction<string>>;
  publishCategory: string;
  setPublishCategory: Dispatch<SetStateAction<string>>;
  publishDescription: string;
  setPublishDescription: Dispatch<SetStateAction<string>>;
  snapshotLabel: string;
  setSnapshotLabel: Dispatch<SetStateAction<string>>;
  diffFrom: string;
  setDiffFrom: Dispatch<SetStateAction<string>>;
  diffTo: string;
  setDiffTo: Dispatch<SetStateAction<string>>;
  importFormat: "json" | "markdown" | "text";
  setImportFormat: Dispatch<SetStateAction<"json" | "markdown" | "text">>;
  importContent: string;
  setImportContent: Dispatch<SetStateAction<string>>;
  libraryItems: WorldLibraryItem[];
  snapshots: WorldSnapshot[];
  diffChanges: Array<{ field: string; before: string | null; after: string | null }>;
  createSnapshotPending: boolean;
  publishPending: boolean;
  importPending: boolean;
  onRefreshLibrary: () => void;
  onInjectLibraryField: (libraryId: string) => void;
  onInjectLibraryStructure: (libraryId: string, targetCollection: "forces" | "locations") => void;
  onPublishLibrary: () => void;
  onCreateSnapshot: () => void;
  onRestoreSnapshot: (snapshotId: string) => void;
  onDiffSnapshots: () => void;
  onExport: (format: "markdown" | "json") => Promise<void>;
  onImport: () => void;
}

type AssetTool = "visualAssets" | "references" | "library" | "snapshots" | "export" | "import";

const WORLD_ASSET_PRESETS = [
  {
    icon: Map,
    title: "World map",
    description: "Show how characters move through regions, roads, borders, and story locations—and where conflicts may erupt.",
    readiness: "Add story settings, location risks, and areas controlled by major powers first.",
  },
  {
    icon: Network,
    title: "Power map",
    description: "Visualize powers, factions, allies, enemies, and vassal relationships.",
    readiness: "Add major powers, their current goals, and the pressures between them first.",
  },
  {
    icon: GitFork,
    title: "World timeline",
    description: "Track major events, disasters, dynastic changes, and shifting conditions over time.",
    readiness: "Add the core conflict, shared consequences, and key historical milestones first.",
  },
  {
    icon: GitCompareArrows,
    title: "Character relationship map",
    description: "Connect characters to powers, locations, resources, and taboos to reduce inconsistencies.",
    readiness: "Add character affiliations, faction pressures, and key locations first.",
  },
  {
    icon: Workflow,
    title: "Power system tree",
    description: "Organize power sources, progression paths, costs, and taboo boundaries into a hierarchy.",
    readiness: "Add the core rules, costs, and limits that cannot be crossed first.",
  },
];

function AssetToolButton({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        "shrink-0 rounded-full px-4 py-2 text-sm transition-colors",
        selected ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
      ].join(" ")}
      onClick={onClick}
      title={description}
    >
      {label}
    </button>
  );
}

export default function WorldAssetsTab(props: WorldAssetsTabProps) {
  const [activeTool, setActiveTool] = useState<AssetTool>("visualAssets");
  const {
    selectedLayerPrimaryField,
    libraryKeyword,
    setLibraryKeyword,
    libraryCategory,
    setLibraryCategory,
    publishName,
    setPublishName,
    publishCategory,
    setPublishCategory,
    publishDescription,
    setPublishDescription,
    snapshotLabel,
    setSnapshotLabel,
    diffFrom,
    setDiffFrom,
    diffTo,
    setDiffTo,
    importFormat,
    setImportFormat,
    importContent,
    setImportContent,
    libraryItems,
    snapshots,
    diffChanges,
    createSnapshotPending,
    publishPending,
    importPending,
    onRefreshLibrary,
    onInjectLibraryField,
    onInjectLibraryStructure,
    onPublishLibrary,
    onCreateSnapshot,
    onRestoreSnapshot,
    onDiffSnapshots,
    onExport,
    onImport,
  } = props;

  return (
    <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">World resources and versions</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Manage references, reusable assets, version snapshots, and imports and exports. World maps and graphs are also accessed here.</p>
        </div>

        <div className="flex gap-1 overflow-x-auto rounded-full bg-muted/30 p-1">
          <AssetToolButton
            label="Maps and graphs"
            description="World visualization tools."
            selected={activeTool === "visualAssets"}
            onClick={() => setActiveTool("visualAssets")}
          />
          <AssetToolButton
            label="References"
            description="Link references that support the worldbuilding."
            selected={activeTool === "references"}
            onClick={() => setActiveTool("references")}
          />
          <AssetToolButton
            label="World library"
            description="Reuse saved locations, powers, resources, and other assets."
            selected={activeTool === "library"}
            onClick={() => setActiveTool("library")}
          />
          <AssetToolButton
            label="Snapshots"
            description="Save versions and compare changes between snapshots."
            selected={activeTool === "snapshots"}
            onClick={() => setActiveTool("snapshots")}
          />
          <AssetToolButton
            label="Export"
            description="Copy as Markdown or JSON."
            selected={activeTool === "export"}
            onClick={() => setActiveTool("export")}
          />
          <AssetToolButton
            label="Import"
            description="Create a world from text, Markdown, or JSON."
            selected={activeTool === "import"}
            onClick={() => setActiveTool("import")}
          />
        </div>

        {activeTool === "visualAssets" ? (
          <div className="rounded-3xl border border-border/35 bg-card/70 p-5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="font-medium">World asset planning</div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">
                  Maps, power maps, timelines, and system trees build on the world handbook. Organize the rules, powers, locations, and tensions before creating visual assets.
                </div>
              </div>
              <Badge variant="secondary" className="border-0 bg-muted/60 font-normal">Planned</Badge>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {WORLD_ASSET_PRESETS.map((asset) => {
                const Icon = asset.icon;
                return (
                  <div key={asset.title} className="rounded-2xl bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                      {asset.title}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-muted-foreground">{asset.description}</div>
                    <div className="mt-3 rounded-xl bg-background/70 p-3 text-xs leading-5 text-muted-foreground">
                      {asset.readiness}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {activeTool === "references" ? (
          <div className="rounded-3xl border border-border/35 bg-card/70 p-5">
            <div className="mb-3 font-medium">References</div>
            <KnowledgeBindingPanel targetType="world" targetId={props.worldId} title="References" />
          </div>
        ) : null}

        {activeTool === "library" ? (
          <div className="space-y-4 rounded-3xl border border-border/35 bg-card/70 p-5">
            <div className="font-medium">World library</div>
            <div className="grid gap-2 md:grid-cols-3">
              <Input
                placeholder="Search keywords"
                value={libraryKeyword}
                onChange={(event) => setLibraryKeyword(event.target.value)}
              />
              <SelectControl
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={libraryCategory}
                onChange={(event) => setLibraryCategory(event.target.value)}
              >
                <option value="all">All categories</option>
                <option value="terrain">Geography and terrain</option>
                <option value="race">Species</option>
                <option value="power_system">Power system</option>
                <option value="organization">Organizations and powers</option>
                <option value="resource">Resources</option>
                <option value="event">Events</option>
                <option value="artifact">Artifacts</option>
                <option value="custom">Custom</option>
              </SelectControl>
              <Button variant="outline" onClick={onRefreshLibrary}>
                Refresh
              </Button>
            </div>
            <div className="space-y-3 rounded-2xl bg-muted/20 p-4">
              <div className="text-xs font-semibold text-muted-foreground">
                Save current settings to the world library
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <Input
                  placeholder="Asset name"
                  value={publishName}
                  onChange={(event) => setPublishName(event.target.value)}
                />
                <SelectControl
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={publishCategory}
                  onChange={(event) => setPublishCategory(event.target.value)}
                >
                  <option value="custom">Custom</option>
                  <option value="terrain">Geography and terrain</option>
                  <option value="race">Species</option>
                  <option value="power_system">Power system</option>
                  <option value="organization">Organizations and powers</option>
                  <option value="resource">Resources</option>
                  <option value="event">Events</option>
                  <option value="artifact">Artifacts</option>
                </SelectControl>
                <Button onClick={onPublishLibrary} disabled={publishPending}>
                  {publishPending ? "Saving…" : "Save asset"}
                </Button>
              </div>
              <textarea
                className="min-h-[80px] w-full rounded-md border bg-background p-2 text-sm"
                value={publishDescription}
                onChange={(event) => setPublishDescription(event.target.value)}
                placeholder="Optional description (defaults to the current layer if left blank)"
              />
            </div>
            {libraryItems.map((item) => (
              <div key={item.id} className="space-y-3 rounded-2xl border border-border/35 p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div>{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.category} / Uses: {item.usageCount}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => onInjectLibraryField(item.id)}>
                    Add to current layer ({selectedLayerPrimaryField})
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onInjectLibraryStructure(item.id, "forces")}>
                    Add to power handbook
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onInjectLibraryStructure(item.id, "locations")}>
                    Add to location handbook
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {activeTool === "snapshots" ? (
          <div className="space-y-4 rounded-3xl border border-border/35 bg-card/70 p-5">
          <div className="font-medium">Version snapshots</div>
          <div className="flex gap-2">
            <Input
              placeholder="Snapshot label (optional)"
              value={snapshotLabel}
              onChange={(event) => setSnapshotLabel(event.target.value)}
            />
            <Button onClick={onCreateSnapshot} disabled={createSnapshotPending}>
              Create snapshot
            </Button>
          </div>
          {snapshots.map((snapshot) => (
            <div key={snapshot.id} className="flex items-center justify-between rounded-2xl bg-muted/20 p-3 text-sm">
              <div>
                {snapshot.label ?? snapshot.id.slice(0, 8)} / {new Date(snapshot.createdAt).toLocaleString()}
              </div>
              <Button size="sm" variant="outline" onClick={() => onRestoreSnapshot(snapshot.id)}>
                Restore
              </Button>
            </div>
          ))}
          <div className="grid gap-2 md:grid-cols-3">
            <SelectControl
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={diffFrom}
              onChange={(event) => setDiffFrom(event.target.value)}
            >
              <option value="">Starting snapshot</option>
              {snapshots.map((snapshot) => (
                <option key={`from-${snapshot.id}`} value={snapshot.id}>
                  {snapshot.label ?? snapshot.id.slice(0, 8)}
                </option>
              ))}
            </SelectControl>
            <SelectControl
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={diffTo}
              onChange={(event) => setDiffTo(event.target.value)}
            >
              <option value="">Target snapshot</option>
              {snapshots.map((snapshot) => (
                <option key={`to-${snapshot.id}`} value={snapshot.id}>
                  {snapshot.label ?? snapshot.id.slice(0, 8)}
                </option>
              ))}
            </SelectControl>
            <Button onClick={onDiffSnapshots} disabled={!diffFrom || !diffTo}>
              Compare
            </Button>
          </div>
          {diffChanges.map((change) => (
            <div key={change.field} className="rounded-2xl bg-muted/20 p-3 text-xs">
              {change.field}: {change.before ?? "Empty"} {"->"} {change.after ?? "Empty"}
            </div>
          ))}
          </div>
        ) : null}

        {activeTool === "export" ? (
          <div className="space-y-3 rounded-3xl border border-border/35 bg-card/70 p-5">
          <div className="font-medium">Export backup</div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void onExport("markdown")}>
              Export Markdown (copy to clipboard)
            </Button>
            <Button variant="secondary" onClick={() => void onExport("json")}>
              Export JSON (copy to clipboard)
            </Button>
          </div>
          </div>
        ) : null}

        {activeTool === "import" ? (
          <div className="space-y-3 rounded-3xl border border-border/35 bg-card/70 p-5">
          <div className="font-medium">Import text</div>
          <SelectControl
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={importFormat}
            onChange={(event) => setImportFormat(event.target.value as "json" | "markdown" | "text")}
          >
            <option value="text">Plain text</option>
            <option value="markdown">Markdown</option>
            <option value="json">JSON</option>
          </SelectControl>
          <textarea
            className="min-h-[160px] w-full rounded-md border bg-background p-2 text-sm"
            value={importContent}
            onChange={(event) => setImportContent(event.target.value)}
            placeholder="Paste content to import"
          />
          <Button onClick={onImport} disabled={importPending || !importContent.trim()}>
            {importPending ? "Importing…" : "Import as new world"}
          </Button>
          </div>
        ) : null}
    </section>
  );
}
