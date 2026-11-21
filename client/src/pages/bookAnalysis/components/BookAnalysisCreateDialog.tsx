import {
  BOOK_ANALYSIS_PRESETS,
  DEFAULT_BOOK_ANALYSIS_BUDGET_TOKENS,
  type BookAnalysisPreset,
  type BookAnalysisSectionKey,
} from "@ai-novel/shared/types/bookAnalysis";
import type { DocumentChapter, KnowledgeDocumentDetail, KnowledgeDocumentSummary } from "@ai-novel/shared/types/knowledge";
import LLMSelector from "@/components/common/LLMSelector";
import BookAnalysisSourceRangePicker from "./BookAnalysisSourceRangePicker";
import { Button } from "@/components/ui/button";
import { AppDialogContent, Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { LLMConfigState } from "../bookAnalysis.types";
import type { BookAnalysisMode, BookAnalysisSourceRangeDraft, NovelOption } from "../hooks/bookAnalysisWorkspace.types";
import SelectControl from "@/components/common/SelectControl";

interface BookAnalysisCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysisMode: BookAnalysisMode;
  selectedDocumentId: string;
  selectedVersionId: string;
  selectedDiagnosisNovelId: string;
  userFocusInstruction: string;
  selectedSourceRange: BookAnalysisSourceRangeDraft;
  budgetTokens: number | null;
  analysisPreset: BookAnalysisPreset;
  llmConfig: LLMConfigState;
  documentOptions: KnowledgeDocumentSummary[];
  versionOptions: KnowledgeDocumentDetail["versions"];
  sourceDocument?: KnowledgeDocumentDetail;
  sourceChapters: DocumentChapter[];
  sourceChaptersRequested: boolean;
  sourceChaptersLoading: boolean;
  sourceChaptersError: string;
  novelOptions: NovelOption[];
  createPending: boolean;
  createDiagnosisPending: boolean;
  onModeChange: (mode: BookAnalysisMode) => void;
  onSelectDocument: (documentId: string) => void;
  onSelectVersion: (versionId: string) => void;
  onSelectDiagnosisNovel: (novelId: string) => void;
  onUserFocusInstructionChange: (instruction: string) => void;
  onSourceRangeChange: (range: BookAnalysisSourceRangeDraft) => void;
  onBudgetTokensChange: (budgetTokens: number | null) => void;
  onRequestSourceChapters: () => void;
  onAnalysisPresetChange: (preset: BookAnalysisPreset) => void;
  onLlmConfigChange: (config: LLMConfigState) => void;
  onCreate: () => void;
  onCreateDiagnosis: () => void;
}

const ESTIMATED_SEGMENT_CHARS = 10_000;
const MAX_ESTIMATED_SEGMENTS = 12;

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function getBookAnalysisScaleLabel(charCount: number): { label: string; tone: string } {
  if (charCount >= 300_000) {
    return { label: "Large", tone: "Consider a more cost-effective model or a smaller source range." };
  }
  if (charCount >= 100_000) {
    return { label: "Medium", tone: "Suitable for standard analysis. Generation time and token usage increase with the number of chapters." };
  }
  return { label: "Small", tone: "Suitable for a quick review of structure, characters, and writing style." };
}

const sectionTitles: Record<BookAnalysisSectionKey, string> = {
  overview: "Overview",
  plot_structure: "Plot structure",
  timeline: "Story timeline",
  character_system: "Character system",
  worldbuilding: "Worldbuilding & setting",
  themes: "Themes",
  style_technique: "Style & technique",
  market_highlights: "Commercial appeal",
};

const presetLabels: Record<BookAnalysisPreset, { title: string; summary: string }> = {
  quick: {
    title: "Quick analysis",
    summary: "Review the work's positioning, main plot, characters, and writing style first. A lower-cost way to decide whether to analyze it in depth.",
  },
  standard: {
    title: "Standard analysis",
    summary: "Covers most details useful for creative reference. Skips the timeline by default and suits most web-fiction analyses.",
  },
  complete: {
    title: "Complete analysis",
    summary: "Generates every analysis section, including the story timeline. Suitable for long-form continuation, imitation, or in-depth review.",
  },
};

function getPresetSectionTitles(sectionKeys: readonly BookAnalysisSectionKey[]): string {
  return sectionKeys
    .map((key) => sectionTitles[key])
    .join(", ");
}

export default function BookAnalysisCreateDialog(props: BookAnalysisCreateDialogProps) {
  const {
    open,
    onOpenChange,
    analysisMode,
    selectedDocumentId,
    selectedVersionId,
    selectedDiagnosisNovelId,
    userFocusInstruction,
    selectedSourceRange,
    budgetTokens,
    analysisPreset,
    llmConfig,
    documentOptions,
    versionOptions,
    sourceDocument,
    sourceChapters,
    sourceChaptersRequested,
    sourceChaptersLoading,
    sourceChaptersError,
    novelOptions,
    createPending,
    createDiagnosisPending,
    onModeChange,
    onSelectDocument,
    onSelectVersion,
    onSelectDiagnosisNovel,
    onUserFocusInstructionChange,
    onSourceRangeChange,
    onBudgetTokensChange,
    onRequestSourceChapters,
    onAnalysisPresetChange,
    onLlmConfigChange,
    onCreate,
    onCreateDiagnosis,
  } = props;

  const isDiagnosisMode = analysisMode === "diagnosis";
  const selectedSourceVersion = sourceDocument?.versions.find((version) => version.id === selectedVersionId)
    ?? sourceDocument?.versions.find((version) => version.isActive)
    ?? sourceDocument?.versions[0];
  const sourceCharCount = selectedSourceVersion?.charCount ?? selectedSourceVersion?.content.length ?? 0;
  const sortedSourceChapters = [...sourceChapters].sort((a, b) => a.chapterIndex - b.chapterIndex);
  const rangeStartChapter = selectedSourceRange
    ? sortedSourceChapters.find((chapter) => chapter.chapterIndex === selectedSourceRange.startChapterIndex)
    : null;
  const rangeEndChapter = selectedSourceRange
    ? sortedSourceChapters.find((chapter) => chapter.chapterIndex === selectedSourceRange.endChapterIndex)
    : null;
  const selectedRangeCharCount = rangeStartChapter && rangeEndChapter
    ? Math.max(0, rangeEndChapter.endOffset - rangeStartChapter.startOffset)
    : sourceCharCount;
  const effectiveSourceCharCount = selectedSourceRange ? selectedRangeCharCount : sourceCharCount;
  const sourceRangeValid = !selectedSourceRange || Boolean(rangeStartChapter && rangeEndChapter && selectedRangeCharCount > 0);
  const estimatedSegmentCount = effectiveSourceCharCount > 0
    ? Math.min(MAX_ESTIMATED_SEGMENTS, Math.max(1, Math.ceil(effectiveSourceCharCount / ESTIMATED_SEGMENT_CHARS)))
    : 0;
  const selectedPreset = BOOK_ANALYSIS_PRESETS.find((preset) => preset.key === analysisPreset) ?? BOOK_ANALYSIS_PRESETS[1];
  const estimatedSectionCount = selectedPreset.sectionKeys.length;
  const estimatedLlmCalls = estimatedSegmentCount > 0 ? estimatedSegmentCount + estimatedSectionCount : 0;
  const scale = getBookAnalysisScaleLabel(effectiveSourceCharCount);

  const canSubmit = isDiagnosisMode
    ? Boolean(selectedDiagnosisNovelId) && !createDiagnosisPending
    : Boolean(selectedDocumentId) && sourceRangeValid && !createPending;
  const submitting = isDiagnosisMode ? createDiagnosisPending : createPending;
  const submitLabel = isDiagnosisMode
    ? (createDiagnosisPending ? "Creating diagnosis…" : "Create diagnostic analysis")
    : (createPending ? "Creating…" : "Create analysis");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent
        title="New book analysis"
        description="Choose a document and analysis range. The new task will appear in the analysis list on the right."
        className="max-w-4xl"
        footer={
          <div className="flex w-full items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!canSubmit}
              onClick={isDiagnosisMode ? onCreateDiagnosis : onCreate}
            >
              {submitLabel}
            </Button>
          </div>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/20 p-1">
              <Button
                type="button"
                size="sm"
                variant={analysisMode === "reference" ? "default" : "ghost"}
                onClick={() => onModeChange("reference")}
              >
                Analyze a reference
              </Button>
              <Button
                type="button"
                size="sm"
                variant={isDiagnosisMode ? "default" : "ghost"}
                onClick={() => onModeChange("diagnosis")}
              >
                Diagnose a draft
              </Button>
            </div>

            {isDiagnosisMode ? (
              <div className="space-y-2">
                <div className="text-sm font-medium">Novel to diagnose</div>
                <SelectControl
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={selectedDiagnosisNovelId}
                  onChange={(event) => onSelectDiagnosisNovel(event.target.value)}
                >
                  <option value="">Select a novel</option>
                  {novelOptions.map((novel) => (
                    <option key={novel.id} value={novel.id}>
                      {novel.title}
                    </option>
                  ))}
                </SelectControl>
                <div className="rounded-md border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
                  The current chapter text will be exported as a new knowledge document for diagnostic analysis.
                </div>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Knowledge document</div>
                  <SelectControl
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={selectedDocumentId}
                    onChange={(event) => onSelectDocument(event.target.value)}
                  >
                    <option value="">Select a document</option>
                    {documentOptions.map((document) => (
                      <option key={document.id} value={document.id}>
                        {document.title}
                      </option>
                    ))}
                  </SelectControl>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Document version</div>
                  <SelectControl
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={selectedVersionId}
                    onChange={(event) => onSelectVersion(event.target.value)}
                    disabled={!selectedDocumentId}
                  >
                    <option value="">Use the currently active version</option>
                    {versionOptions.map((version) => (
                      <option key={version.id} value={version.id}>
                        v{version.versionNumber} {version.isActive ? "(Current)" : ""}
                      </option>
                    ))}
                  </SelectControl>
                </div>
              </div>
                <BookAnalysisSourceRangePicker
                  selectedRange={selectedSourceRange}
                  sourceChapters={sourceChapters}
                  sourceCharCount={sourceCharCount}
                  sourceSelected={Boolean(selectedDocumentId)}
                  chaptersRequested={sourceChaptersRequested}
                  chaptersLoading={sourceChaptersLoading}
                  chaptersError={sourceChaptersError}
                  onRangeChange={onSourceRangeChange}
                  onRequestChapters={onRequestSourceChapters}
                />
              </>
            )}

            <div className="space-y-2">
              <div className="text-sm font-medium">Model</div>
              <LLMSelector
                value={llmConfig}
                onChange={(next) =>
                  onLlmConfigChange({
                    provider: next.provider,
                    model: next.model,
                    temperature: next.temperature ?? llmConfig.temperature,
                    maxTokens: next.maxTokens ?? llmConfig.maxTokens,
                  })
                }
                showParameters
              />
              <div className="grid gap-2 rounded-md border bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center">
                <div>
                  <div className="text-sm font-medium">Budget limit</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">
                    Leave blank to use the server default. The task stops when usage reaches the limit; completed sections are kept.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1000}
                    max={10000000}
                    step={1000}
                    placeholder={DEFAULT_BOOK_ANALYSIS_BUDGET_TOKENS.toLocaleString("en-US")}
                    value={budgetTokens ?? ""}
                    onChange={(event) => {
                      if (!event.target.value) {
                        onBudgetTokensChange(null);
                        return;
                      }
                      const next = Number(event.target.value);
                      onBudgetTokensChange(Number.isFinite(next) ? Math.max(1000, Math.min(10000000, Math.floor(next))) : null);
                    }}
                    className="text-right font-mono tabular-nums"
                  />
                  <span className="shrink-0 text-xs text-muted-foreground">tokens</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Analysis scope</div>
              <div className="grid gap-2 sm:grid-cols-3">
                {BOOK_ANALYSIS_PRESETS.map((preset) => {
                  const selected = preset.key === analysisPreset;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      className={`rounded-md border p-3 text-left transition-colors ${
                        selected ? "border-primary bg-primary/5" : "hover:bg-muted/30"
                      }`}
                      onClick={() => onAnalysisPresetChange(preset.key)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium">{presetLabels[preset.key].title}</div>
                        <div className="text-xs text-muted-foreground">{preset.sectionKeys.length} sections</div>
                      </div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">{presetLabels[preset.key].summary}</div>
                      <div className="mt-2 text-xs leading-5 text-muted-foreground">
                        Includes: {getPresetSectionTitles(preset.sectionKeys)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Focus for this analysis</div>
              <textarea
                className="min-h-[92px] w-full rounded-md border bg-background p-3 text-sm"
                value={userFocusInstruction}
                onChange={(event) => onUserFocusInstructionChange(event.target.value)}
                placeholder={isDiagnosisMode
                  ? "For example, focus on reader retention in the first three chapters, protagonist motivation, or foreshadowing payoffs."
                  : "For example, focus on ensemble cast dynamics, the protagonist's voice, or commercial hooks."}
              />
            </div>
          </div>

          <aside className="space-y-3">
            <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-xs leading-5 text-foreground">
              {isDiagnosisMode
                ? "Diagnosis uses model tokens based on the novel's length. More chapters usually mean longer analysis and higher token usage. Choose a suitable range for this review."
                : "Analysis uses model tokens based on the book's length. Longer books usually take more time and tokens. Confirm the document range before starting."}
            </div>

            {!isDiagnosisMode && selectedSourceVersion ? (
              <div className="rounded-md border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
                <div className="font-medium text-foreground">Estimated analysis size: {scale.label}</div>
                <div className="mt-1">
                  About {formatCount(effectiveSourceCharCount)} characters, divided into an estimated {estimatedSegmentCount} source segments and
                  about {estimatedLlmCalls} model calls.
                </div>
                <div className="mt-1">{scale.tone}</div>
              </div>
            ) : null}

            {!isDiagnosisMode && sourceDocument ? (
              <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                Versions: {sourceDocument.versions.length} | Existing analyses: {sourceDocument.bookAnalysisCount}
              </div>
            ) : null}
          </aside>
        </div>
      </AppDialogContent>
    </Dialog>
  );
}
