import { Check, Layers3, RotateCcw, Sparkles } from "lucide-react";
import type { StoryModeTreeDraft } from "@/api/storyMode";
import LLMSelector from "@/components/common/LLMSelector";
import SelectControl from "@/components/common/SelectControl";
import { Button } from "@/components/ui/button";
import { AppDialogContent, Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import StoryModeProfileFields from "./StoryModeProfileFields";

interface StoryModeCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCreatingChild: boolean;
  selectedParentLabel: string;
  generationPrompt: string;
  onGenerationPromptChange: (value: string) => void;
  childDerivationCount: number;
  onChildDerivationCountChange: (value: number) => void;
  draft: StoryModeTreeDraft;
  onDraftChange: (updater: (draft: StoryModeTreeDraft) => StoryModeTreeDraft) => void;
  generatedChildCandidates: StoryModeTreeDraft[];
  selectedGeneratedChildIndexes: number[];
  activeGeneratedChildIndex: number | null;
  onApplyGeneratedChild: (draft: StoryModeTreeDraft, index: number) => void;
  onToggleGeneratedChildSelection: (index: number) => void;
  onGenerate: () => void;
  onReset: () => void;
  isGenerating: boolean;
  onSaveCurrent: () => void;
  isSavingCurrent: boolean;
  onSaveSelectedChildren: () => void;
  isSavingSelectedChildren: boolean;
}

function fieldClassName(): string {
  return "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";
}

export default function StoryModeCreateDialog({
  open,
  onOpenChange,
  isCreatingChild,
  selectedParentLabel,
  generationPrompt,
  onGenerationPromptChange,
  childDerivationCount,
  onChildDerivationCountChange,
  draft,
  onDraftChange,
  generatedChildCandidates,
  selectedGeneratedChildIndexes,
  activeGeneratedChildIndex,
  onApplyGeneratedChild,
  onToggleGeneratedChildSelection,
  onGenerate,
  onReset,
  isGenerating,
  onSaveCurrent,
  isSavingCurrent,
  onSaveSelectedChildren,
  isSavingSelectedChildren,
}: StoryModeCreateDialogProps) {
  const hasGeneratedCandidates = isCreatingChild && generatedChildCandidates.length > 0;
  const canGenerate = isCreatingChild || generationPrompt.trim().length > 0;
  const saveDisabled = isSavingCurrent || isSavingSelectedChildren || !draft.name.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent
        className="h-[min(90vh,840px)] max-w-6xl"
        bodyClassName="overflow-y-auto p-0 lg:overflow-hidden"
        headerClassName="px-5 py-4 sm:px-6"
        title={isCreatingChild ? "Add progression mode subcategory" : "New progression mode"}
        description={isCreatingChild
          ? "Create one or more focused progression modes under the current parent. AI can suggest options for you to review before saving."
          : "Define what keeps the story moving and delivers on reader expectations. Enter the details or have AI draft them first."}
        footerClassName="flex-col-reverse gap-2 px-5 py-3 sm:flex-row sm:px-6"
        footer={(
          <>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {hasGeneratedCandidates ? (
              <Button
                type="button"
                variant="outline"
                onClick={onSaveSelectedChildren}
                disabled={isSavingSelectedChildren || selectedGeneratedChildIndexes.length === 0}
              >
                {isSavingSelectedChildren
                  ? "Saving..."
                  : `Save selected subcategories (${selectedGeneratedChildIndexes.length})`}
              </Button>
            ) : null}
            <Button type="button" onClick={onSaveCurrent} disabled={saveDisabled}>
              {isSavingCurrent ? "Saving..." : isCreatingChild ? "Save subcategory" : "Save progression mode"}
            </Button>
          </>
        )}
      >
        <div className="grid min-h-full lg:h-full lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="border-b border-border bg-muted/20 px-5 py-5 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Layers3 className="h-4 w-4" aria-hidden="true" />
                  Create under
                </div>
                <div className="mt-2 text-sm font-semibold text-foreground">{selectedParentLabel}</div>
              </div>

              <div className="border-t border-border pt-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Draft with AI
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {isCreatingChild
                    ? "Describe the subcategory you want, or leave this blank to have AI derive one from the parent."
                    : "Describe how this mode creates ongoing goals, obstacles, and milestone rewards."}
                </p>
              </div>

              <LLMSelector
                compact={false}
                showBadge={false}
                showHelperText={false}
                className="[&>div:first-child]:grid [&>div:first-child]:grid-cols-1 [&>div:first-child>*]:!w-full"
              />

              {isCreatingChild ? (
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-foreground">Number of candidates</span>
                  <SelectControl
                    className="w-full"
                    value={childDerivationCount}
                    onChange={(event) => onChildDerivationCountChange(Number(event.target.value))}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                  </SelectControl>
                </label>
              ) : null}

              <label className="space-y-2 text-sm">
                <span className="font-medium text-foreground">Draft instructions</span>
                <textarea
                  rows={6}
                  className={fieldClassName()}
                  value={generationPrompt}
                  onChange={(event) => onGenerationPromptChange(event.target.value)}
                  placeholder={isCreatingChild
                    ? "For example: Add a settlement-building subcategory, with rewards from expanding influence and accumulating resources."
                    : "For example: The protagonist gains resources by managing a settlement, meeting construction goals and growing their influence at each stage."}
                />
              </label>

              <div className="flex gap-2">
                <Button
                  type="button"
                  className="min-w-0 flex-1"
                  onClick={onGenerate}
                  disabled={!canGenerate || isGenerating}
                >
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  {isGenerating ? "Drafting..." : "Generate draft"}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  title="Clear current draft"
                  aria-label="Clear current draft"
                  onClick={onReset}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>

              {hasGeneratedCandidates ? (
                <div className="border-t border-border pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-foreground">AI suggestions</div>
                    <div className="text-xs text-muted-foreground">
                      Selected {selectedGeneratedChildIndexes.length}/{generatedChildCandidates.length}
                    </div>
                  </div>
                  <div className="mt-3 divide-y divide-border border-y border-border">
                    {generatedChildCandidates.map((candidate, index) => {
                      const selected = selectedGeneratedChildIndexes.includes(index);
                      const active = activeGeneratedChildIndex === index;
                      return (
                        <div key={`${candidate.name}-${index}`} className="flex items-start gap-3 py-3">
                          <button
                            type="button"
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                              selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"
                            }`}
                            aria-label={`${selected ? "Deselect " : "Select "}${candidate.name}`}
                            aria-pressed={selected}
                            onClick={() => onToggleGeneratedChildSelection(index)}
                          >
                            {selected ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                          </button>
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => onApplyGeneratedChild(candidate, index)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-medium text-foreground">{candidate.name}</span>
                              {active ? <span className="shrink-0 text-xs text-primary">Editing</span> : null}
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {candidate.description?.trim() || candidate.profile.coreDrive}
                            </p>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </aside>

          <main className="min-w-0 px-5 py-5 lg:min-h-0 lg:overflow-y-auto lg:px-7 lg:py-6">
            <div className="mx-auto max-w-3xl space-y-7">
              <section>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Content draft</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      The name and core drive tell AI how to recognize and apply this progression mode.
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={onReset}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Clear
                  </Button>
                </div>

                <div className="mt-5 grid gap-4">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-foreground">Name</span>
                    <Input
                      value={draft.name}
                      placeholder="For example: Faction management"
                      onChange={(event) => onDraftChange((previous) => ({ ...previous, name: event.target.value }))}
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-foreground">One-line description</span>
                    <textarea
                      rows={2}
                      className={fieldClassName()}
                      value={draft.description ?? ""}
                      placeholder="Explain what drives this mode forward and what experience it offers readers."
                      onChange={(event) => onDraftChange((previous) => ({ ...previous, description: event.target.value }))}
                    />
                  </label>
                </div>
              </section>

              {!isCreatingChild && draft.children.length > 0 ? (
                <section className="border-t border-border pt-6">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">Subcategories to create</h3>
                    <span className="text-xs text-muted-foreground">{draft.children.length}</span>
                  </div>
                  <div className="mt-3 divide-y divide-border border-y border-border">
                    {draft.children.map((child, index) => (
                      <div key={`${child.name}-${index}`} className="grid gap-1 py-3 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4">
                        <div className="text-sm font-medium text-foreground">{child.name || `Untitled subcategory ${index + 1}`}</div>
                        <div className="text-sm leading-5 text-muted-foreground">
                          {child.description?.trim() || child.profile.coreDrive || "Description needed"}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <StoryModeProfileFields
                value={draft.profile}
                onChange={(profile) => onDraftChange((previous) => ({ ...previous, profile }))}
              />

              <details className="border-t border-border pt-5">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  Advanced: additional prompt instructions
                </summary>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Use this only for additional writing constraints. It can be left blank for most progression modes.
                </p>
                <textarea
                  rows={4}
                  className={`mt-3 ${fieldClassName()}`}
                  value={draft.template ?? ""}
                  placeholder="Add writing instructions specific to this progression mode."
                  onChange={(event) => onDraftChange((previous) => ({ ...previous, template: event.target.value }))}
                />
              </details>
            </div>
          </main>
        </div>
      </AppDialogContent>
    </Dialog>
  );
}
