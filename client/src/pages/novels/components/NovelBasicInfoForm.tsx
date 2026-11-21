import type { ReactNode } from "react";
import type { BookAnalysisSectionKey } from "@ai-novel/shared/types/bookAnalysis";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AI_FREEDOM_OPTIONS,
  BASIC_INFO_FIELD_HINTS,
  DEFAULT_ESTIMATED_CHAPTER_COUNT,
  EMOTION_OPTIONS,
  PACE_OPTIONS,
  POV_OPTIONS,
  PROJECT_MODE_OPTIONS,
  PROJECT_STATUS_OPTIONS,
  PUBLICATION_STATUS_OPTIONS,
  WRITING_MODE_OPTIONS,
  WRITING_PLATFORM_OPTIONS,
  type NovelBasicFormState,
} from "../novelBasicInfo.shared";
import {
  FieldLabel,
  SectionBlock,
  SelectionCard,
  findOptionSummary,
} from "./basicInfoForm/BasicInfoFormPrimitives";
import BookPositioningStudio from "./basicInfoForm/BookPositioningStudio";
import CollapsibleSummary from "./CollapsibleSummary";
import { ContinuationSourceSection } from "./basicInfoForm/ContinuationSourceSection";
import SelectControl from "@/components/common/SelectControl";

interface WorldOption {
  id: string;
  name: string;
}

interface GenreOption {
  id: string;
  label: string;
  path: string;
}

interface StoryModeOption {
  id: string;
  name: string;
  label: string;
  path: string;
  description?: string | null;
  profile: {
    coreDrive: string;
    readerReward: string;
  };
}

interface NovelBasicInfoFormProps {
  basicForm: NovelBasicFormState;
  genreOptions: GenreOption[];
  storyModeOptions: StoryModeOption[];
  worldOptions: WorldOption[];
  sourceNovelOptions: Array<{ id: string; title: string }>;
  sourceKnowledgeOptions: Array<{ id: string; title: string }>;
  sourceNovelBookAnalysisOptions: Array<{
    id: string;
    title: string;
    documentTitle: string;
    documentVersionNumber: number;
  }>;
  isLoadingSourceNovelBookAnalyses: boolean;
  availableBookAnalysisSections: Array<{ key: BookAnalysisSectionKey; title: string }>;
  onFormChange: (patch: Partial<NovelBasicFormState>) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitLabel: string;
  showPublicationStatus?: boolean;
  titleQuickFill?: ReactNode;
  framingQuickFill?: ReactNode;
  projectQuickStart?: ReactNode;
  resourceRecommendation?: ReactNode;
  coverSection?: ReactNode;
}

export default function NovelBasicInfoForm(props: NovelBasicInfoFormProps) {
  const {
    basicForm,
    genreOptions,
    storyModeOptions,
    worldOptions,
    sourceNovelOptions,
    sourceKnowledgeOptions,
    sourceNovelBookAnalysisOptions,
    isLoadingSourceNovelBookAnalyses,
    availableBookAnalysisSections,
    onFormChange,
    onSubmit,
    isSubmitting,
    submitLabel,
    showPublicationStatus = true,
    titleQuickFill,
    framingQuickFill,
    projectQuickStart,
    resourceRecommendation,
    coverSection,
  } = props;

  const continuationSourceMissing = basicForm.writingMode === "continuation"
    && (
      (basicForm.continuationSourceType === "novel" && !basicForm.sourceNovelId)
      || (basicForm.continuationSourceType === "knowledge_document" && !basicForm.sourceKnowledgeDocumentId)
    );

  const continuationAnalysisSectionMissing = basicForm.writingMode === "continuation"
    && Boolean(basicForm.continuationBookAnalysisId)
    && basicForm.continuationBookAnalysisSections.length === 0;

  const hasSelectedContinuationSource = basicForm.continuationSourceType === "novel"
    ? Boolean(basicForm.sourceNovelId)
    : Boolean(basicForm.sourceKnowledgeDocumentId);
  const primaryStoryMode = storyModeOptions.find((item) => item.id === basicForm.primaryStoryModeId);
  const secondaryStoryMode = storyModeOptions.find((item) => item.id === basicForm.secondaryStoryModeId);

  return (
    <div className="space-y-4">
      <section className="space-y-5">
        <BookPositioningStudio
          basicForm={basicForm}
          onFormChange={onFormChange}
          titleQuickFill={titleQuickFill}
          framingQuickFill={framingQuickFill}
          projectQuickStart={projectQuickStart}
        />

        <div className="space-y-2">
          <FieldLabel hint={BASIC_INFO_FIELD_HINTS.writingMode}>Writing mode</FieldLabel>
          <div className="grid gap-3 md:grid-cols-2">
            {WRITING_MODE_OPTIONS.map((option) => (
              <SelectionCard
                key={option.value}
                option={option}
                selected={basicForm.writingMode === option.value}
                onSelect={(value) => onFormChange({ writingMode: value })}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1 pt-1 text-sm leading-6 text-muted-foreground">
          <div className="font-medium text-foreground">Genre and story mode</div>
          <div>
            Genre describes what kind of story this is, such as fantasy, urban, or alternate history. Story mode describes what drives the plot and delivers its rewards, such as progression, invincibility, or slice-of-life growth.
          </div>
        </div>

        {resourceRecommendation}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <FieldLabel htmlFor="basic-genre" hint={BASIC_INFO_FIELD_HINTS.genreId}>Genre</FieldLabel>
            <SelectControl
              id="basic-genre"
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={basicForm.genreId}
              onChange={(event) => onFormChange({ genreId: event.target.value })}
            >
              <option value="">Let AI recommend a genre</option>
              {genreOptions.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {genre.path}
                </option>
              ))}
            </SelectControl>
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="basic-default-length" hint={BASIC_INFO_FIELD_HINTS.defaultChapterLength}>
              Default chapter length
            </FieldLabel>
            <Input
              id="basic-default-length"
              type="number"
              min={500}
              max={10000}
              value={basicForm.defaultChapterLength}
              onChange={(event) => onFormChange({ defaultChapterLength: Number(event.target.value || 0) || 2800 })}
            />
            <div className="text-xs text-muted-foreground">We recommend starting with 2,500–3,500 words. You can adjust this for individual chapters later.</div>
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="basic-estimated-chapters" hint={BASIC_INFO_FIELD_HINTS.estimatedChapterCount}>
              Estimated chapter count
            </FieldLabel>
            <Input
              id="basic-estimated-chapters"
              type="number"
              min={1}
              max={2000}
              value={basicForm.estimatedChapterCount}
              onChange={(event) => onFormChange({
                estimatedChapterCount: Math.max(
                  1,
                  Math.min(2000, Number(event.target.value || 0) || DEFAULT_ESTIMATED_CHAPTER_COUNT),
                ),
              })}
            />
            <div className="text-xs text-muted-foreground">Used as the default range for outlines, beats, and the pipeline. You can adjust it later.</div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel htmlFor="basic-primary-story-mode" hint={BASIC_INFO_FIELD_HINTS.primaryStoryModeId}>
              Primary story mode
            </FieldLabel>
            <SelectControl
              id="basic-primary-story-mode"
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={basicForm.primaryStoryModeId}
              onChange={(event) => onFormChange({ primaryStoryModeId: event.target.value })}
            >
              <option value="">Let AI recommend a primary story mode</option>
              {storyModeOptions.map((storyMode) => (
                <option key={storyMode.id} value={storyMode.id}>
                  {storyMode.path}
                </option>
              ))}
            </SelectControl>
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="basic-secondary-story-mode" hint={BASIC_INFO_FIELD_HINTS.secondaryStoryModeId}>
              Secondary story mode
            </FieldLabel>
            <SelectControl
              id="basic-secondary-story-mode"
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={basicForm.secondaryStoryModeId}
              onChange={(event) => onFormChange({ secondaryStoryModeId: event.target.value })}
            >
              <option value="">No secondary story mode</option>
              {storyModeOptions.map((storyMode) => (
                <option
                  key={storyMode.id}
                  value={storyMode.id}
                  disabled={storyMode.id === basicForm.primaryStoryModeId}
                >
                  {storyMode.path}
                </option>
              ))}
            </SelectControl>
          </div>
        </div>

        {primaryStoryMode || secondaryStoryMode ? (
          <div className="grid gap-3 md:grid-cols-2">
            {primaryStoryMode ? (
              <div className="rounded-lg bg-muted/15 p-3">
                <div className="text-sm font-semibold text-foreground">Primary story mode summary</div>
                <div className="mt-1 text-sm text-foreground">{primaryStoryMode.name}</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  {primaryStoryMode.description || primaryStoryMode.profile.coreDrive}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">Core drive: {primaryStoryMode.profile.coreDrive}</div>
              </div>
            ) : null}
            {secondaryStoryMode ? (
              <div className="rounded-lg bg-muted/15 p-3">
                <div className="text-sm font-semibold text-foreground">Secondary story mode summary</div>
                <div className="mt-1 text-sm text-foreground">{secondaryStoryMode.name}</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  {secondaryStoryMode.description || secondaryStoryMode.profile.coreDrive}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">Additional reader reward: {secondaryStoryMode.profile.readerReward}</div>
              </div>
            ) : null}
          </div>
        ) : null}

        {coverSection}
      </section>

      <details className="group border-t border-border/60 pt-4">
        <summary className="cursor-pointer list-none">
          <CollapsibleSummary
            title="Advanced narrative and AI collaboration settings"
            description="These settings affect future writing and the level of AI automation, but you don't need to decide on them right away."
          />
        </summary>

        <div className="mt-4 space-y-4">
          <div className="space-y-3 pt-1">
            <div className="text-sm font-semibold text-foreground">Reference world</div>
            <div className="mt-1 text-xs leading-5 text-muted-foreground">
              This is only an initial reference. Import, generate, and sync world details from “Novel world” in the workspace after creation.
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="basic-world" hint={BASIC_INFO_FIELD_HINTS.worldId}>Reference world</FieldLabel>
              <SelectControl
                id="basic-world"
                className="w-full rounded-md border bg-background p-2 text-sm"
                value={basicForm.worldId}
                onChange={(event) => onFormChange({ worldId: event.target.value })}
              >
                <option value="">No reference world</option>
                {worldOptions.map((world) => (
                  <option key={world.id} value={world.id}>
                    {world.name}
                  </option>
                ))}
              </SelectControl>
            </div>
          </div>

          <SectionBlock
            title="Narrative experience"
            description="These settings shape how readers experience the story and affect the tone, density, and pacing of chapter plans."
            surface="none"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="basic-writing-platform" hint="Changes apply to future planning, writing, review, and revisions. Existing text will not be rewritten.">Target platform</FieldLabel>
                <SelectControl
                  id="basic-writing-platform"
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={basicForm.writingPlatformPreference}
                  onChange={(event) => onFormChange({ writingPlatformPreference: event.target.value as NovelBasicFormState["writingPlatformPreference"] })}
                >
                  {WRITING_PLATFORM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </SelectControl>
                <div className="text-xs text-muted-foreground">{findOptionSummary(WRITING_PLATFORM_OPTIONS, basicForm.writingPlatformPreference)}</div>
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="basic-pov" hint={BASIC_INFO_FIELD_HINTS.narrativePov}>Point of view</FieldLabel>
                <SelectControl
                  id="basic-pov"
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={basicForm.narrativePov}
                  onChange={(event) => onFormChange({ narrativePov: event.target.value as NovelBasicFormState["narrativePov"] })}
                >
                  {POV_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </SelectControl>
                <div className="text-xs text-muted-foreground">{findOptionSummary(POV_OPTIONS, basicForm.narrativePov)}</div>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="basic-pace" hint={BASIC_INFO_FIELD_HINTS.pacePreference}>Pacing preference</FieldLabel>
                <SelectControl
                  id="basic-pace"
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={basicForm.pacePreference}
                  onChange={(event) => onFormChange({ pacePreference: event.target.value as NovelBasicFormState["pacePreference"] })}
                >
                  {PACE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </SelectControl>
                <div className="text-xs text-muted-foreground">{findOptionSummary(PACE_OPTIONS, basicForm.pacePreference)}</div>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="basic-emotion" hint={BASIC_INFO_FIELD_HINTS.emotionIntensity}>Emotional intensity</FieldLabel>
                <SelectControl
                  id="basic-emotion"
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={basicForm.emotionIntensity}
                  onChange={(event) => onFormChange({ emotionIntensity: event.target.value as NovelBasicFormState["emotionIntensity"] })}
                >
                  {EMOTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </SelectControl>
                <div className="text-xs text-muted-foreground">{findOptionSummary(EMOTION_OPTIONS, basicForm.emotionIntensity)}</div>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="basic-style-tone" hint={BASIC_INFO_FIELD_HINTS.styleTone}>Style keywords</FieldLabel>
                <Input
                  id="basic-style-tone"
                  value={basicForm.styleTone}
                  placeholder="For example: austere, restrained, darkly humorous"
                  onChange={(event) => onFormChange({ styleTone: event.target.value })}
                />
              </div>
            </div>
          </SectionBlock>

          <SectionBlock
            title="AI collaboration"
            description="Define how you and AI share the work and how much the system can automate."
            surface="none"
          >
            <div className="space-y-2">
              <FieldLabel hint={BASIC_INFO_FIELD_HINTS.projectMode}>Project mode</FieldLabel>
              <div className="grid gap-3 md:grid-cols-2">
                {PROJECT_MODE_OPTIONS.map((option) => (
                  <SelectionCard
                    key={option.value}
                    option={option}
                    selected={basicForm.projectMode === option.value}
                    onSelect={(value) => onFormChange({ projectMode: value })}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="basic-ai-freedom" hint={BASIC_INFO_FIELD_HINTS.aiFreedom}>AI creative freedom</FieldLabel>
                <SelectControl
                  id="basic-ai-freedom"
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={basicForm.aiFreedom}
                  onChange={(event) => onFormChange({ aiFreedom: event.target.value as NovelBasicFormState["aiFreedom"] })}
                >
                  {AI_FREEDOM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </SelectControl>
                <div className="text-xs text-muted-foreground">{findOptionSummary(AI_FREEDOM_OPTIONS, basicForm.aiFreedom)}</div>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="basic-resource-score" hint={BASIC_INFO_FIELD_HINTS.resourceReadyScore}>
                  Resource readiness
                </FieldLabel>
                <Input
                  id="basic-resource-score"
                  type="number"
                  min={0}
                  max={100}
                  value={basicForm.resourceReadyScore}
                  onChange={(event) => onFormChange({
                    resourceReadyScore: Math.max(0, Math.min(100, Number(event.target.value || 0))),
                  })}
                />
                <div className="text-xs text-muted-foreground">0 means you're just getting started; 100 means the setting, characters, and plans are well developed.</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 py-1 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <FieldLabel htmlFor="basic-post-generation-style-review" hint={BASIC_INFO_FIELD_HINTS.postGenerationStyleReviewEnabled}>
                  Check and revise text for AI patterns
                </FieldLabel>
                <div className="text-xs leading-5 text-muted-foreground">
                  When enabled, chapter reviews will check for AI-like writing patterns. Issues are revised according to the current writing strategy; other suggestions remain as quality notes.
                </div>
              </div>
              <Switch
                id="basic-post-generation-style-review"
                aria-label="Check and revise text for AI patterns"
                checked={basicForm.postGenerationStyleReviewEnabled}
                onCheckedChange={(checked) => onFormChange({ postGenerationStyleReviewEnabled: checked })}
              />
            </div>
          </SectionBlock>
        </div>
      </details>

      {basicForm.writingMode === "continuation" ? (
        <details className="group border-t border-border/60 pt-4" open>
          <summary className="cursor-pointer list-none">
            <CollapsibleSummary
              title="Continuation source"
              description="Continuation mode requires a source, so these settings are expanded by default."
              collapsedLabel="Show settings"
              expandedLabel="Hide settings"
            />
          </summary>
          <div className="mt-4">
            <ContinuationSourceSection
              basicForm={basicForm}
              sourceNovelOptions={sourceNovelOptions}
              sourceKnowledgeOptions={sourceKnowledgeOptions}
              sourceNovelBookAnalysisOptions={sourceNovelBookAnalysisOptions}
              isLoadingSourceNovelBookAnalyses={isLoadingSourceNovelBookAnalyses}
              availableBookAnalysisSections={availableBookAnalysisSections}
              hasSelectedContinuationSource={hasSelectedContinuationSource}
              onFormChange={onFormChange}
            />
          </div>
        </details>
      ) : null}

      <details className="group border-t border-border/60 pt-4">
        <summary className="cursor-pointer list-none">
          <CollapsibleSummary
            title="Project status and progress"
            description="These fields support project management and workflow decisions; you don't need to set them right away."
            collapsedLabel="Show fields"
            expandedLabel="Hide fields"
          />
        </summary>
        <div className="mt-4">
          <SectionBlock
            title="Production status and progress"
            description="These statuses support project management and workflow decisions. Adjust them as the project progresses."
            surface="none"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="basic-project-status">Project status</FieldLabel>
                <SelectControl
                  id="basic-project-status"
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={basicForm.projectStatus}
                  onChange={(event) => onFormChange({ projectStatus: event.target.value as NovelBasicFormState["projectStatus"] })}
                >
                  {PROJECT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </SelectControl>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="basic-storyline-status">Storyline status</FieldLabel>
                <SelectControl
                  id="basic-storyline-status"
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={basicForm.storylineStatus}
                  onChange={(event) => onFormChange({ storylineStatus: event.target.value as NovelBasicFormState["storylineStatus"] })}
                >
                  {PROJECT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </SelectControl>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="basic-outline-status">Outline status</FieldLabel>
                <SelectControl
                  id="basic-outline-status"
                  className="w-full rounded-md border bg-background p-2 text-sm"
                  value={basicForm.outlineStatus}
                  onChange={(event) => onFormChange({ outlineStatus: event.target.value as NovelBasicFormState["outlineStatus"] })}
                >
                  {PROJECT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </SelectControl>
              </div>

              {showPublicationStatus ? (
                <div className="space-y-2">
                  <FieldLabel hint={BASIC_INFO_FIELD_HINTS.status}>Publication status</FieldLabel>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {PUBLICATION_STATUS_OPTIONS.map((option) => (
                      <SelectionCard
                        key={option.value}
                        option={option}
                        selected={basicForm.status === option.value}
                        onSelect={(value) => onFormChange({ status: value })}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </SectionBlock>
        </div>
      </details>

      {continuationSourceMissing ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
          Select a source before saving basic information in continuation mode.
        </div>
      ) : null}

      {continuationAnalysisSectionMissing ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800">
          Select source-analysis chapters to include with the analysis results.
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || continuationSourceMissing || continuationAnalysisSectionMissing || !basicForm.title.trim()}
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </div>
  );
}
