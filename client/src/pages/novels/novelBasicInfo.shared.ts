import type { BookAnalysisSectionKey } from "@ai-novel/shared/types/bookAnalysis";
import { formatCommercialTagsInput, normalizeCommercialTags } from "@ai-novel/shared/types/novelFraming";
import type { WritingPlatformPreference } from "@ai-novel/shared/types/writingPlatform";
import type { PowerSystemPreference } from "@ai-novel/shared/types/novelResourceRecommendation";

export interface NovelBasicFormState {
  title: string;
  penName: string;
  description: string;
  targetAudience: string;
  bookSellingPoint: string;
  competingFeel: string;
  first30ChapterPromise: string;
  commercialTagsText: string;
  genreId: string;
  primaryStoryModeId: string;
  secondaryStoryModeId: string;
  worldId: string;
  status: "draft" | "published";
  writingMode: "original" | "continuation";
  projectMode: "ai_led" | "co_pilot" | "draft_mode" | "auto_pipeline";
  readerChannelPreference: "ai_judge" | "male_oriented" | "female_oriented" | "general";
  powerSystemPreference: PowerSystemPreference;
  writingPlatformPreference: WritingPlatformPreference;
  narrativePov: "first_person" | "third_person" | "mixed";
  pacePreference: "slow" | "balanced" | "fast";
  styleTone: string;
  emotionIntensity: "low" | "medium" | "high";
  aiFreedom: "low" | "medium" | "high";
  postGenerationStyleReviewEnabled: boolean;
  defaultChapterLength: number;
  estimatedChapterCount: number;
  userPreferredVolumeCount?: number;
  estimatedChapterCountSource?: "default" | "user";
  projectStatus: "not_started" | "in_progress" | "completed" | "rework" | "blocked";
  storylineStatus: "not_started" | "in_progress" | "completed" | "rework" | "blocked";
  outlineStatus: "not_started" | "in_progress" | "completed" | "rework" | "blocked";
  resourceReadyScore: number;
  continuationSourceType: "novel" | "knowledge_document";
  sourceNovelId: string;
  sourceKnowledgeDocumentId: string;
  continuationBookAnalysisId: string;
  continuationBookAnalysisSections: BookAnalysisSectionKey[];
  referenceBookAnalysisId: string;
  referenceBookAnalysisSections: BookAnalysisSectionKey[];
}

export interface BasicInfoOption<T extends string> {
  value: T;
  label: string;
  summary: string;
  recommended?: boolean;
}

export const DEFAULT_ESTIMATED_CHAPTER_COUNT = 80;

export const WRITING_MODE_OPTIONS: BasicInfoOption<NovelBasicFormState["writingMode"]>[] = [
  {
    value: "original",
    label: "Original",
    summary: "Build the world, characters, and main story from scratch. Recommended for most new projects.",
    recommended: true,
  },
  {
    value: "continuation",
    label: "Continuation",
    summary: "Continue from an existing novel or knowledge document. Existing settings and source-analysis content will be prioritized.",
  },
];

export const PROJECT_MODE_OPTIONS: BasicInfoOption<NovelBasicFormState["projectMode"]>[] = [
  {
    value: "co_pilot",
    label: "AI co-pilot",
    summary: "You set the direction while AI provides suggestions and drafts. Best for early development and frequent hands-on decisions.",
    recommended: true,
  },
  {
    value: "ai_led",
    label: "AI-led",
    summary: "AI drives the workflow while you review key checkpoints. Best for projects with clear goals.",
  },
  {
    value: "draft_mode",
    label: "Draft-first",
    summary: "Quickly produce text and explore the direction with fewer structural constraints. Best for testing a story idea.",
  },
  {
    value: "auto_pipeline",
    label: "Pipeline-first",
    summary: "For projects with developed settings that can move through planning, generation, review, and repair in sequence.",
  },
];

export const READER_CHANNEL_OPTIONS: BasicInfoOption<NovelBasicFormState["readerChannelPreference"]>[] = [
  {
    value: "ai_judge",
    label: "Let AI decide",
    summary: "Let AI infer the likely readership from the genre, selling points, and initial idea. Recommended as the default.",
    recommended: true,
  },
  {
    value: "male_oriented",
    label: "Male-oriented",
    summary: "Emphasizes goals, progression, competition, satisfying payoffs, and external events.",
  },
  {
    value: "female_oriented",
    label: "Female-oriented",
    summary: "Emphasizes relationships, emotional stakes, character choices, and nuanced payoffs.",
  },
  {
    value: "general",
    label: "General / unrestricted",
    summary: "No specific readership preference. Let AI plan around the story and your description of its audience.",
  },
];

export const POWER_SYSTEM_OPTIONS: BasicInfoOption<NovelBasicFormState["powerSystemPreference"]>[] = [
  {
    value: "ai_recommend",
    label: "AI recommendation",
    summary: "AI decides whether the story needs a power system. If not, it won't invent ranks or force progression into the plot.",
    recommended: true,
  },
  {
    value: "none",
    label: "None",
    summary: "No ranks or progression system. Conflict comes from character choices, relationships, information, and real-world constraints.",
  },
  {
    value: "soft",
    label: "Flexible power differences",
    summary: "Allow differences in ability, costs, and counters without a fixed ranking system.",
  },
  {
    value: "ranked",
    label: "Defined ranks",
    summary: "Create a structured ranking system with clear limits and costs to guide character growth and plot progression.",
  },
];

export const WRITING_PLATFORM_OPTIONS: BasicInfoOption<NovelBasicFormState["writingPlatformPreference"]>[] = [
  { value: "ai_recommend", label: "AI recommendation", summary: "AI recommends a platform style based on the story experience, audience, and long-term progression.", recommended: true },
  { value: "fanqie_free", label: "Fanqie free web fiction", summary: "Fast hooks, short mobile-friendly paragraphs, high conflict, and clear rewards." },
  { value: "qidian_male", label: "Qidian (male-oriented)", summary: "Growth goals, changing resources and abilities, steady progression, and foreshadowing payoffs." },
  { value: "jinjiang_female", label: "Jinjiang (female-oriented)", summary: "Character relationships, emotional cause and effect, distinct voices, and evolving relationship dynamics." },
];

export const POV_OPTIONS: BasicInfoOption<NovelBasicFormState["narrativePov"]>[] = [
  {
    value: "third_person",
    label: "Third person",
    summary: "A reliable choice for ensemble casts and complex plots.",
    recommended: true,
  },
  {
    value: "first_person",
    label: "First person",
    summary: "Immersive but limits available information. Best for stories centered on a strong protagonist's perspective.",
  },
  {
    value: "mixed",
    label: "Mixed perspectives",
    summary: "More flexible but harder to manage. Best for well-developed projects.",
  },
];

export const PACE_OPTIONS: BasicInfoOption<NovelBasicFormState["pacePreference"]>[] = [
  {
    value: "balanced",
    label: "Balanced",
    summary: "Balances progression and setup. Recommended as the default.",
    recommended: true,
  },
  {
    value: "slow",
    label: "Slow",
    summary: "Emphasizes setup, atmosphere, and emotional development.",
  },
  {
    value: "fast",
    label: "Fast",
    summary: "Emphasizes event-driven storytelling, hooks, and continuous momentum.",
  },
];

export const EMOTION_OPTIONS: BasicInfoOption<NovelBasicFormState["emotionIntensity"]>[] = [
  {
    value: "medium",
    label: "Moderate emotional intensity",
    summary: "Keeps emotional highs and lows without overwhelming the story. Recommended as the default.",
    recommended: true,
  },
  {
    value: "low",
    label: "Low emotional intensity",
    summary: "More restrained. Best for calm or analytical stories.",
  },
  {
    value: "high",
    label: "High emotional intensity",
    summary: "Emphasizes emotional peaks, conflict, and high-impact scenes.",
  },
];

export const AI_FREEDOM_OPTIONS: BasicInfoOption<NovelBasicFormState["aiFreedom"]>[] = [
  {
    value: "medium",
    label: "Moderate freedom",
    summary: "Let AI add details and advance parts of the story within the established setting. Recommended as the default.",
    recommended: true,
  },
  {
    value: "low",
    label: "Low freedom",
    summary: "Follow the setting and plan closely. Best for maintaining control during early development.",
  },
  {
    value: "high",
    label: "High freedom",
    summary: "Let AI proactively expand the plot and details. Best for stable projects in mid-to-late development.",
  },
];

export const PUBLICATION_STATUS_OPTIONS: BasicInfoOption<NovelBasicFormState["status"]>[] = [
  {
    value: "draft",
    label: "Draft",
    summary: "Still in development. Recommended for most projects.",
    recommended: true,
  },
  {
    value: "published",
    label: "Published",
    summary: "For finished work or work released to the public.",
  },
];

export const PROJECT_STATUS_OPTIONS: Array<{ value: NovelBasicFormState["projectStatus"]; label: string }> = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "rework", label: "Needs rework" },
  { value: "blocked", label: "Blocked" },
];

export const BASIC_INFO_FIELD_HINTS = {
  penName: "The pen name appears on the cover. Leave this blank to show only the title; a name won't be invented.",
  writingMode: "Choose whether to start from scratch or continue an existing work. This determines which context sources are prioritized.",
  targetAudience: "Describe who this book is primarily for. A professional audience profile isn't necessary; a simple description is enough.",
  bookSellingPoint: "Describe what makes the book compelling, such as relationship tension, a satisfying comeback, suspense, or a fresh premise.",
  competingFeel: "Describe the kind of reading experience this may remind readers of; don't name a work to imitate.",
  first30ChapterPromise: "Describe what readers should see, enjoy, or believe by the end of the first 30 chapters.",
  commercialTagsText: "Enter 3–6 comma-separated tags, such as comeback, high conflict, suspense, or workplace rivalry.",
  projectMode: "Choose how you and AI work together. This affects which steps run automatically and which need your approval.",
  readerChannelPreference: "Helps AI choose default rewards, emotional focus, and relationship emphasis. Keep the AI recommendation if you're unsure.",
  powerSystemPreference: "Choose whether the story needs defined abilities or progression. Contemporary, mystery, and romance stories may not need one.",
  narrativePov: "Sets the default point of view for chapter generation and affects how information is revealed.",
  pacePreference: "Sets the balance between setup and forward momentum, affecting scene density and hook strength.",
  emotionIntensity: "Sets the frequency of emotional peaks and conflict in generated text. Higher isn't always better.",
  aiFreedom: "Sets how far AI may depart from the existing plan and setting. Low or moderate freedom is recommended early on.",
  postGenerationStyleReviewEnabled: "Chapter reviews check effective writing techniques and anti-AI rules; revisions follow the current writing strategy. When disabled, generation still uses those writing and anti-AI prompts.",
  defaultChapterLength: "A reference length for planning and generation, not a hard limit. A common recommendation is 2,500–3,500 words.",
  estimatedChapterCount: "The estimated total chapter count, used as a reference for structured outlines, story beats, and pipeline defaults. It isn't a hard limit.",
  resourceReadyScore: "Indicates how complete the setting, characters, and story materials are. Higher scores are better suited to automated production.",
  styleTone: "Enter a few keywords, such as austere, restrained, or darkly humorous. These affect the generated prose style.",
  genreId: "Genre describes what kind of story this is, such as xianxia, urban fiction, or alternate history. It affects planning, titles, and selling points; choose it early when possible.",
  primaryStoryModeId: "The primary story mode describes what drives the plot and delivers its rewards, such as progression, invincibility, or slice-of-life growth. Future planning and generation prioritize it.",
  secondaryStoryModeId: "The secondary mode adds flavor, such as small-business elements in a healing slice-of-life story. It must not override the primary mode.",
  worldId: "Select a reference world to help initialize this novel. Generation prioritizes content from the Novel world card above.",
  status: "Marks the work's lifecycle. It doesn't affect basic writing features, but does affect lists and project management.",
  continuationSourceType: "Choose whether to continue from an existing novel or a document in the knowledge base.",
  continuationBookAnalysis: "Source analysis provides high-priority structured context to help continuation projects maintain a consistent style and setting.",
} satisfies Record<string, string>;

export function createDefaultNovelBasicFormState(): NovelBasicFormState {
  return {
    title: "",
    penName: "",
    description: "",
    targetAudience: "",
    bookSellingPoint: "",
    competingFeel: "",
    first30ChapterPromise: "",
    commercialTagsText: "",
    genreId: "",
    primaryStoryModeId: "",
    secondaryStoryModeId: "",
    worldId: "",
    status: "draft",
    writingMode: "original",
    projectMode: "co_pilot",
    readerChannelPreference: "ai_judge",
    powerSystemPreference: "ai_recommend",
    writingPlatformPreference: "ai_recommend",
    narrativePov: "third_person",
    pacePreference: "balanced",
    styleTone: "",
    emotionIntensity: "medium",
    aiFreedom: "medium",
    postGenerationStyleReviewEnabled: true,
    defaultChapterLength: 2800,
    estimatedChapterCount: DEFAULT_ESTIMATED_CHAPTER_COUNT,
    estimatedChapterCountSource: "default",
    projectStatus: "not_started",
    storylineStatus: "not_started",
    outlineStatus: "not_started",
    resourceReadyScore: 0,
    continuationSourceType: "novel",
    sourceNovelId: "",
    sourceKnowledgeDocumentId: "",
    continuationBookAnalysisId: "",
    continuationBookAnalysisSections: [],
    referenceBookAnalysisId: "",
    referenceBookAnalysisSections: [],
  };
}

export function patchNovelBasicForm(
  previous: NovelBasicFormState,
  patch: Partial<NovelBasicFormState>,
): NovelBasicFormState {
  const next = { ...previous, ...patch };
  if (patch.estimatedChapterCount !== undefined && patch.estimatedChapterCountSource === undefined) {
    next.estimatedChapterCountSource = "user";
  }
  if (
    next.primaryStoryModeId
    && next.secondaryStoryModeId
    && next.primaryStoryModeId === next.secondaryStoryModeId
  ) {
    next.secondaryStoryModeId = "";
  }
  if (next.writingMode === "original") {
    next.sourceNovelId = "";
    next.sourceKnowledgeDocumentId = "";
    next.continuationBookAnalysisId = "";
    next.continuationBookAnalysisSections = [];
  } else {
    next.referenceBookAnalysisId = "";
    next.referenceBookAnalysisSections = [];
    if (next.continuationSourceType === "novel") {
      next.sourceKnowledgeDocumentId = "";
    } else if (next.continuationSourceType === "knowledge_document") {
      next.sourceNovelId = "";
    }
  }
  if (
    patch.continuationSourceType !== undefined
    && patch.continuationSourceType !== previous.continuationSourceType
    && patch.continuationBookAnalysisId === undefined
  ) {
    next.continuationBookAnalysisId = "";
    next.continuationBookAnalysisSections = [];
  }
  if (
    next.continuationSourceType === "novel"
    && patch.sourceNovelId !== undefined
    && patch.sourceNovelId !== previous.sourceNovelId
    && patch.continuationBookAnalysisId === undefined
  ) {
    next.continuationBookAnalysisId = "";
    next.continuationBookAnalysisSections = [];
  }
  if (
    next.continuationSourceType === "knowledge_document"
    && patch.sourceKnowledgeDocumentId !== undefined
    && patch.sourceKnowledgeDocumentId !== previous.sourceKnowledgeDocumentId
    && patch.continuationBookAnalysisId === undefined
  ) {
    next.continuationBookAnalysisId = "";
    next.continuationBookAnalysisSections = [];
  }
  if (patch.continuationBookAnalysisId !== undefined && !patch.continuationBookAnalysisId) {
    next.continuationBookAnalysisSections = [];
  }
  return next;
}

export function buildNovelCreatePayload(basicForm: NovelBasicFormState) {
  const commercialTags = normalizeCommercialTags(basicForm.commercialTagsText);
  return {
    title: basicForm.title.trim(),
    penName: basicForm.penName.trim() || undefined,
    description: basicForm.description.trim() || undefined,
    targetAudience: basicForm.targetAudience.trim() || undefined,
    bookSellingPoint: basicForm.bookSellingPoint.trim() || undefined,
    competingFeel: basicForm.competingFeel.trim() || undefined,
    first30ChapterPromise: basicForm.first30ChapterPromise.trim() || undefined,
    commercialTags: commercialTags.length > 0 ? commercialTags : undefined,
    genreId: basicForm.genreId || undefined,
    primaryStoryModeId: basicForm.primaryStoryModeId || undefined,
    secondaryStoryModeId: basicForm.secondaryStoryModeId || undefined,
    worldId: basicForm.worldId || undefined,
    writingMode: basicForm.writingMode,
    projectMode: basicForm.projectMode,
    narrativePov: basicForm.narrativePov,
    pacePreference: basicForm.pacePreference,
    styleTone: basicForm.styleTone.trim() || undefined,
    emotionIntensity: basicForm.emotionIntensity,
    aiFreedom: basicForm.aiFreedom,
    postGenerationStyleReviewEnabled: basicForm.postGenerationStyleReviewEnabled,
    defaultChapterLength: basicForm.defaultChapterLength,
    estimatedChapterCount: basicForm.estimatedChapterCount,
    projectStatus: basicForm.projectStatus,
    storylineStatus: basicForm.storylineStatus,
    outlineStatus: basicForm.outlineStatus,
    resourceReadyScore: basicForm.resourceReadyScore,
    sourceNovelId: basicForm.writingMode === "continuation" && basicForm.continuationSourceType === "novel"
      ? (basicForm.sourceNovelId || undefined)
      : undefined,
    sourceKnowledgeDocumentId: basicForm.writingMode === "continuation" && basicForm.continuationSourceType === "knowledge_document"
      ? (basicForm.sourceKnowledgeDocumentId || undefined)
      : undefined,
    continuationBookAnalysisId: basicForm.writingMode === "continuation"
      && (
        (basicForm.continuationSourceType === "novel" && Boolean(basicForm.sourceNovelId))
        || (basicForm.continuationSourceType === "knowledge_document" && Boolean(basicForm.sourceKnowledgeDocumentId))
      )
      ? (basicForm.continuationBookAnalysisId || undefined)
      : undefined,
    continuationBookAnalysisSections:
      basicForm.writingMode === "continuation"
        && (
          (basicForm.continuationSourceType === "novel" && Boolean(basicForm.sourceNovelId))
          || (basicForm.continuationSourceType === "knowledge_document" && Boolean(basicForm.sourceKnowledgeDocumentId))
        )
        && basicForm.continuationBookAnalysisId
        ? (basicForm.continuationBookAnalysisSections.length > 0 ? basicForm.continuationBookAnalysisSections : undefined)
        : undefined,
    referenceBookAnalysisId:
      basicForm.writingMode === "original" ? (basicForm.referenceBookAnalysisId || undefined) : undefined,
    referenceBookAnalysisSections:
      basicForm.writingMode === "original" && basicForm.referenceBookAnalysisId
        ? (basicForm.referenceBookAnalysisSections.length > 0 ? basicForm.referenceBookAnalysisSections : undefined)
        : undefined,
  };
}

export function buildNovelUpdatePayload(basicForm: NovelBasicFormState) {
  const commercialTags = normalizeCommercialTags(basicForm.commercialTagsText);
  return {
    title: basicForm.title,
    penName: basicForm.penName.trim() || null,
    description: basicForm.description,
    targetAudience: basicForm.targetAudience.trim() || null,
    bookSellingPoint: basicForm.bookSellingPoint.trim() || null,
    competingFeel: basicForm.competingFeel.trim() || null,
    first30ChapterPromise: basicForm.first30ChapterPromise.trim() || null,
    commercialTags: commercialTags.length > 0 ? commercialTags : null,
    genreId: basicForm.genreId || null,
    primaryStoryModeId: basicForm.primaryStoryModeId || null,
    secondaryStoryModeId: basicForm.secondaryStoryModeId || null,
    worldId: basicForm.worldId || null,
    status: basicForm.status,
    writingMode: basicForm.writingMode,
    projectMode: basicForm.projectMode,
    narrativePov: basicForm.narrativePov,
    pacePreference: basicForm.pacePreference,
    styleTone: basicForm.styleTone || null,
    emotionIntensity: basicForm.emotionIntensity,
    aiFreedom: basicForm.aiFreedom,
    postGenerationStyleReviewEnabled: basicForm.postGenerationStyleReviewEnabled,
    defaultChapterLength: basicForm.defaultChapterLength,
    estimatedChapterCount: basicForm.estimatedChapterCount,
    projectStatus: basicForm.projectStatus,
    storylineStatus: basicForm.storylineStatus,
    outlineStatus: basicForm.outlineStatus,
    resourceReadyScore: basicForm.resourceReadyScore,
    sourceNovelId: basicForm.writingMode === "continuation" && basicForm.continuationSourceType === "novel"
      ? (basicForm.sourceNovelId || null)
      : null,
    sourceKnowledgeDocumentId: basicForm.writingMode === "continuation" && basicForm.continuationSourceType === "knowledge_document"
      ? (basicForm.sourceKnowledgeDocumentId || null)
      : null,
    continuationBookAnalysisId: basicForm.writingMode === "continuation"
      && (
        (basicForm.continuationSourceType === "novel" && Boolean(basicForm.sourceNovelId))
        || (basicForm.continuationSourceType === "knowledge_document" && Boolean(basicForm.sourceKnowledgeDocumentId))
      )
      ? (basicForm.continuationBookAnalysisId || null)
      : null,
    continuationBookAnalysisSections:
      basicForm.writingMode === "continuation"
        && (
          (basicForm.continuationSourceType === "novel" && Boolean(basicForm.sourceNovelId))
          || (basicForm.continuationSourceType === "knowledge_document" && Boolean(basicForm.sourceKnowledgeDocumentId))
        )
        && basicForm.continuationBookAnalysisId
        ? (basicForm.continuationBookAnalysisSections.length > 0 ? basicForm.continuationBookAnalysisSections : null)
        : null,
    referenceBookAnalysisId:
      basicForm.writingMode === "original" ? (basicForm.referenceBookAnalysisId || null) : null,
    referenceBookAnalysisSections:
      basicForm.writingMode === "original" && basicForm.referenceBookAnalysisId
        ? (basicForm.referenceBookAnalysisSections.length > 0 ? basicForm.referenceBookAnalysisSections : null)
        : null,
  };
}

export { formatCommercialTagsInput };
