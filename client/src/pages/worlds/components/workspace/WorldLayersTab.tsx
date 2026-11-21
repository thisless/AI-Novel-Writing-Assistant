import type { Dispatch, SetStateAction } from "react";
import type { World } from "@ai-novel/shared/types/world";
import { Button } from "@/components/ui/button";
import StreamOutput from "@/components/common/StreamOutput";
import {
  LAYERS,
  LAYER_STATUS_LABELS,
  pickLayerFieldText,
  type LayerKey,
  type RefineAttribute,
  REFINE_ATTRIBUTE_OPTIONS,
} from "./worldWorkspaceShared";
import SelectControl from "@/components/common/SelectControl";

interface WorldLayersTabProps {
  world?: World;
  selectedLayer: LayerKey;
  setSelectedLayer: (layer: LayerKey) => void;
  layerDrafts: Partial<Record<LayerKey, string>>;
  setLayerDrafts: Dispatch<SetStateAction<Partial<Record<LayerKey, string>>>>;
  layerStates: Record<string, { status: string; updatedAt: string }>;
  isInitialLayerGeneration: boolean;
  generateAllPending: boolean;
  generateLayerPending: boolean;
  generateLayerVariable?: LayerKey;
  saveLayerPending: boolean;
  saveLayerVariable?: { layerKey: LayerKey; content: string };
  confirmLayerPending: boolean;
  confirmLayerVariable?: LayerKey;
  onGenerateAll: () => void;
  onGenerateLayer: (layer: LayerKey) => void;
  onSaveLayer: (payload: { layerKey: LayerKey; content: string }) => void;
  onConfirmLayer: (layer: LayerKey) => void;
  refineAttribute: RefineAttribute;
  setRefineAttribute: (value: RefineAttribute) => void;
  refineMode: "replace" | "alternatives";
  setRefineMode: (value: "replace" | "alternatives") => void;
  refineLevel: "light" | "deep";
  setRefineLevel: (value: "light" | "deep") => void;
  onStartRefine: () => void;
  refineStreaming: boolean;
  refineContent: string;
  onAbortRefine: () => void;
}

export default function WorldLayersTab(props: WorldLayersTabProps) {
  const {
    world,
    selectedLayer,
    setSelectedLayer,
    layerDrafts,
    setLayerDrafts,
    layerStates,
    isInitialLayerGeneration,
    generateAllPending,
    generateLayerPending,
    generateLayerVariable,
    saveLayerPending,
    saveLayerVariable,
    confirmLayerPending,
    confirmLayerVariable,
    onGenerateAll,
    onGenerateLayer,
    onSaveLayer,
    onConfirmLayer,
    refineAttribute,
    setRefineAttribute,
    refineMode,
    setRefineMode,
    refineLevel,
    setRefineLevel,
    onStartRefine,
    refineStreaming,
    refineContent,
    onAbortRefine,
  } = props;
  const selectedLayerMeta = LAYERS.find((layer) => layer.key === selectedLayer) ?? LAYERS[0];
  const worldRecord = world as unknown as Record<string, unknown> | undefined;
  const hasSelectedDraft = Object.prototype.hasOwnProperty.call(layerDrafts, selectedLayerMeta.key);
  const selectedLayerValue = hasSelectedDraft
    ? (layerDrafts[selectedLayerMeta.key] ?? "")
    : pickLayerFieldText(selectedLayerMeta.key, worldRecord);
  const selectedLayerStatus = layerStates[selectedLayerMeta.key]?.status ?? "pending";
  const isGeneratingSelectedLayer = generateLayerPending && generateLayerVariable === selectedLayerMeta.key;
  const isSavingSelectedLayer =
    saveLayerPending && saveLayerVariable?.layerKey === selectedLayerMeta.key;
  const isConfirmingSelectedLayer =
    confirmLayerPending && confirmLayerVariable === selectedLayerMeta.key;

  return (
    <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">AI layer summaries</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Condense the world handbook into six writing summaries for quick use in planning and drafting.</p>
        </div>

        <div className="flex flex-col gap-3 rounded-3xl bg-primary/[0.055] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-medium">{isInitialLayerGeneration ? "Generate six writing summaries" : "Update six writing summaries"}</div>
            <div className="mt-1 text-xs leading-5 text-muted-foreground">
              {isInitialLayerGeneration
                ? "AI will extract six layers from the handbook: foundation, power, society, culture, history, and conflict."
                : "After updating the handbook, regenerate all summaries or revise a single layer."}
            </div>
          </div>
          <Button className="shrink-0 rounded-full" onClick={onGenerateAll} disabled={generateAllPending || !world}>
            {generateAllPending ? "Organizing…" : isInitialLayerGeneration ? "Generate all six with AI" : "Regenerate all six"}
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-2 rounded-3xl bg-muted/20 p-3">
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground">Select a layer</div>
            <div className="space-y-2">
              {LAYERS.map((layer) => {
                const layerStatus = layerStates[layer.key]?.status ?? "pending";
                const hasDraft = Object.prototype.hasOwnProperty.call(layerDrafts, layer.key);

                return (
                  <button
                    key={layer.key}
                    type="button"
                    className={[
                      "w-full rounded-2xl px-3 py-2.5 text-left text-sm transition-colors",
                      selectedLayer === layer.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/60",
                    ].join(" ")}
                    onClick={() => setSelectedLayer(layer.key)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{layer.label}</span>
                      {hasDraft ? <span className="text-xs text-primary">Draft</span> : null}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {LAYER_STATUS_LABELS[layerStatus] ?? layerStatus}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-border/35 bg-card/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium">{selectedLayerMeta.label}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Status: {LAYER_STATUS_LABELS[selectedLayerStatus] ?? selectedLayerStatus}
                </div>
              </div>
              {hasSelectedDraft ? <div className="text-xs text-primary">Unsaved draft</div> : null}
            </div>
            <textarea
              className="min-h-[300px] w-full rounded-2xl border border-border/45 bg-background/80 p-4 text-sm leading-6"
              value={selectedLayerValue}
              onChange={(event) =>
                setLayerDrafts((prev) => ({
                  ...prev,
                  [selectedLayerMeta.key]: event.target.value,
                }))
              }
            />
            <div className="flex flex-wrap gap-2">
              <Button
                className="rounded-full"
                onClick={() => {
                  if (isInitialLayerGeneration) {
                    onGenerateAll();
                    return;
                  }
                  onGenerateLayer(selectedLayerMeta.key);
                }}
                disabled={generateAllPending || generateLayerPending || !world}
              >
                {isInitialLayerGeneration
                  ? generateAllPending
                    ? "Generating all six…"
                    : "Generate all six with AI"
                  : isGeneratingSelectedLayer
                    ? "Rewriting…"
                    : "Organize this layer with AI"}
              </Button>
              <Button
                className="rounded-full"
                variant="secondary"
                onClick={() => onSaveLayer({ layerKey: selectedLayerMeta.key, content: selectedLayerValue })}
                disabled={saveLayerPending || generateAllPending || !selectedLayerValue.trim()}
              >
                {isSavingSelectedLayer ? "Saving…" : "Save layer"}
              </Button>
              <Button
                className="rounded-full"
                variant="outline"
                onClick={() => onConfirmLayer(selectedLayerMeta.key)}
                disabled={confirmLayerPending || generateAllPending}
              >
                {isConfirmingSelectedLayer ? "Confirming…" : "Confirm layer"}
              </Button>
            </div>
          </div>
        </div>

        <details className="group rounded-3xl bg-muted/20 p-5">
          <summary className="cursor-pointer list-none marker:hidden">
            <div className="font-medium">Refine current content with AI</div>
            <div className="mt-1 text-xs text-muted-foreground">Expand this section to adjust the wording, depth, or explore alternatives.</div>
          </summary>
          <div className="mt-4 grid gap-2 md:grid-cols-4">
            <SelectControl
              className="rounded-xl border border-border/45 bg-background p-2 text-sm"
              value={refineAttribute}
              onChange={(event) => setRefineAttribute(event.target.value as RefineAttribute)}
            >
              {REFINE_ATTRIBUTE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </SelectControl>
            <SelectControl
              className="rounded-xl border border-border/45 bg-background p-2 text-sm"
              value={refineMode}
              onChange={(event) => setRefineMode(event.target.value as "replace" | "alternatives")}
            >
              <option value="replace">Improve by replacing</option>
              <option value="alternatives">Suggest alternatives</option>
            </SelectControl>
            <SelectControl
              className="rounded-xl border border-border/45 bg-background p-2 text-sm"
              value={refineLevel}
              onChange={(event) => setRefineLevel(event.target.value as "light" | "deep")}
            >
              <option value="light">Light</option>
              <option value="deep">Deep</option>
            </SelectControl>
            <Button className="rounded-full" onClick={onStartRefine} disabled={refineStreaming}>
              {refineStreaming ? "Refining…" : selectedLayer === "foundation" ? "Refine world foundation" : "Refine this layer"}
            </Button>
          </div>
          <StreamOutput content={refineContent} isStreaming={refineStreaming} onAbort={onAbortRefine} />
        </details>
    </section>
  );
}
