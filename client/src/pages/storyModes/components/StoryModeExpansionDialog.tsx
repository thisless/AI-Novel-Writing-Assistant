import { Check, Layers3, Sparkles } from "lucide-react";
import type { StoryModeOption, StoryModeTreeDraft } from "@/api/storyMode";
import LLMSelector from "@/components/common/LLMSelector";
import SelectControl from "@/components/common/SelectControl";
import { Button } from "@/components/ui/button";
import { AppDialogContent, Dialog } from "@/components/ui/dialog";

interface StoryModeExpansionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rootOptions: StoryModeOption[];
  parentId: string;
  onParentIdChange: (id: string) => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  count: number;
  onCountChange: (value: number) => void;
  candidates: StoryModeTreeDraft[];
  selectedIndexes: number[];
  onToggle: (index: number) => void;
  onGenerate: () => void;
  onSave: () => void;
  isGenerating: boolean;
  isSaving: boolean;
}

export default function StoryModeExpansionDialog({
  open,
  onOpenChange,
  rootOptions,
  parentId,
  onParentIdChange,
  prompt,
  onPromptChange,
  count,
  onCountChange,
  candidates,
  selectedIndexes,
  onToggle,
  onGenerate,
  onSave,
  isGenerating,
  isSaving,
}: StoryModeExpansionDialogProps) {
  const canGenerate = !isGenerating;
  const canSave = selectedIndexes.length > 0 && !isSaving;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent
        className="max-w-3xl"
        title="Expand progression modes"
        description="Build on existing modes to discover new directions that can be used in your writing."
        footer={(
          <>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" onClick={onSave} disabled={!canSave}>
              {isSaving ? "Saving..." : `Add to library${selectedIndexes.length ? ` (${selectedIndexes.length})` : ""}`}
            </Button>
          </>
        )}
      >
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-5 border-b border-border pb-5 lg:border-b-0 lg:border-r lg:pr-6 lg:pb-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Layers3 className="h-4 w-4 text-primary" aria-hidden="true" />
              Expansion scope
            </div>
            <p className="text-xs leading-5 text-muted-foreground">If no root mode is selected, AI will find gaps in the library and suggest new root progression modes.</p>
            <SelectControl value={parentId} onChange={(event) => onParentIdChange(event.target.value)} className="w-full">
              <option value="">Entire library (suggest new root modes)</option>
              {rootOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </SelectControl>
            <LLMSelector compact={false} showBadge={false} showHelperText={false} className="[&>div:first-child]:grid [&>div:first-child]:grid-cols-1 [&>div:first-child>*]:!w-full" />
            <label className="space-y-2 text-sm">
              <span className="font-medium">Number of suggestions</span>
              <SelectControl value={count} onChange={(event) => onCountChange(Number(event.target.value))} className="w-full">
                <option value={2}>2 directions</option><option value={3}>3 directions</option><option value={4}>4 directions</option><option value={5}>5 directions</option>
              </SelectControl>
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Expansion preferences (optional)</span>
              <textarea
                rows={5}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                value={prompt}
                onChange={(event) => onPromptChange(event.target.value)}
                placeholder="For example: Emphasize management rewards and reduce combat-only progression."
              />
            </label>
            <Button type="button" className="w-full" onClick={onGenerate} disabled={!canGenerate}>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {isGenerating ? "Generating suggestions..." : "Suggest new directions"}
            </Button>
          </aside>
          <main className="min-w-0">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Suggested progression modes</h3>
                <p className="mt-1 text-xs text-muted-foreground">Choose which directions to add to the library. They will be nested under the selected root mode.</p>
              </div>
              {candidates.length ? <span className="text-xs text-muted-foreground">Selected {selectedIndexes.length}/{candidates.length}</span> : null}
            </div>
            {candidates.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Select a root mode or keep “Entire library,” then choose “Suggest new directions.”</div>
            ) : (
              <div className="mt-5 space-y-3">
                {candidates.map((candidate, index) => {
                  const selected = selectedIndexes.includes(index);
                  return (
                    <button key={`${candidate.name}-${index}`} type="button" onClick={() => onToggle(index)} className={`w-full rounded-xl border p-4 text-left transition ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`} aria-pressed={selected}>
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>
                          {selected ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium text-foreground">{candidate.name}</span>
                          <span className="mt-1 block text-sm leading-5 text-muted-foreground">{candidate.description || candidate.profile.coreDrive}</span>
                          <span className="mt-2 block text-xs leading-5 text-muted-foreground">Progression units: {candidate.profile.progressionUnits.join(", ") || "Not specified"} · Reward: {candidate.profile.readerReward || "Not specified"}</span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </AppDialogContent>
    </Dialog>
  );
}
