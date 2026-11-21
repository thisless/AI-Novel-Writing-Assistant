import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_NOVEL_COVER_NEGATIVE_PROMPT,
  buildNovelCoverNegativePrompt,
  buildNovelCoverTitleInstruction,
} from "@ai-novel/shared/imagePrompt";
import {
  buildNovelCoverDraftContext,
  buildNovelCoverDraftSourcePrompt,
} from "./novelCoverDraft.ts";

const baseBasicForm = {
  title: "雾港审判局",
  penName: "雾港夜行",
  description: "黑雾侵城后，主角被迫成为审判者。",
  targetAudience: "喜欢都市悬疑和高压追更感的读者",
  bookSellingPoint: "审判升级与迷雾悬案并行",
  competingFeel: "冷峻、压迫、强悬念",
  first30ChapterPromise: "前 30 章先破第一案，再掀开黑雾交易链",
  commercialTagsText: "强冲突，都市奇诡，强冲突，持续追更",
  genreId: "genre-urban",
  primaryStoryModeId: "mode-judge",
  secondaryStoryModeId: "mode-case",
  worldId: "world-fog",
  status: "draft",
  writingMode: "original",
  projectMode: "co_pilot",
  narrativePov: "third_person",
  pacePreference: "fast",
  styleTone: "冷峻克制",
  emotionIntensity: "high",
  aiFreedom: "medium",
  postGenerationStyleReviewEnabled: true,
  defaultChapterLength: 2800,
  estimatedChapterCount: 80,
  projectStatus: "not_started",
  storylineStatus: "not_started",
  outlineStatus: "not_started",
  resourceReadyScore: 20,
  continuationSourceType: "novel",
  sourceNovelId: "",
  sourceKnowledgeDocumentId: "",
  continuationBookAnalysisId: "",
  continuationBookAnalysisSections: [],
};

test("novel cover draft context reuses basic info and world slice labels", () => {
  const context = buildNovelCoverDraftContext({
    basicForm: baseBasicForm,
    genreOptions: [{ id: "genre-urban", label: "都市异能", path: "都市 / 都市异能" }],
    storyModeOptions: [
      { id: "mode-judge", name: "审判升级流", label: "审判升级流", path: "爽文 / 审判升级流" },
      { id: "mode-case", name: "悬案追凶流", label: "悬案追凶流", path: "悬疑 / 悬案追凶流" },
    ],
    worldOptions: [{ id: "world-fog", name: "雾港" }],
    worldSliceView: {
      hasWorld: true,
      worldId: "world-fog",
      worldName: "雾港",
      slice: {
        coreWorldFrame: "高压雾港里，审判机构与地下交易同时运作。",
      },
      overrides: {},
      availableRules: [],
      availableForces: [],
      availableLocations: [],
      storyInputSource: "story_macro",
      isStale: false,
    },
  });

  assert.equal(context.title, "雾港审判局");
  assert.equal(context.penName, "雾港夜行");
  assert.deepEqual(context.commercialTags, ["强冲突", "都市奇诡", "持续追更"]);
  assert.equal(context.genreLabel, "都市 / 都市异能");
  assert.equal(context.primaryStoryModeLabel, "爽文 / 审判升级流");
  assert.equal(context.secondaryStoryModeLabel, "悬疑 / 悬案追凶流");
  assert.equal(context.worldSummary, "高压雾港里，审判机构与地下交易同时运作。");
  assert.equal(context.narrativePovLabel, "Third person");
  assert.equal(context.pacePreferenceLabel, "Fast-paced");
  assert.equal(context.emotionIntensityLabel, "High emotional intensity");
});

test("novel cover draft source prompt includes beginner-facing cover cues", () => {
  const prompt = buildNovelCoverDraftSourcePrompt({
    basicForm: baseBasicForm,
    genreOptions: [{ id: "genre-urban", label: "都市异能", path: "都市 / 都市异能" }],
    storyModeOptions: [
      { id: "mode-judge", name: "审判升级流", label: "审判升级流", path: "爽文 / 审判升级流" },
      { id: "mode-case", name: "悬案追凶流", label: "悬案追凶流", path: "悬疑 / 悬案追凶流" },
    ],
    worldOptions: [{ id: "world-fog", name: "雾港" }],
    worldSliceView: {
      hasWorld: true,
      worldId: "world-fog",
      worldName: "雾港",
      slice: {
        coreWorldFrame: "高压雾港里，审判机构与地下交易同时运作。",
      },
      overrides: {},
      availableRules: [],
      availableForces: [],
      availableLocations: [],
      storyInputSource: "story_macro",
      isStale: false,
    },
  });

  assert.match(prompt, /Main image for the novel cover: 雾港审判局/);
  assert.match(prompt, /Target audience: 喜欢都市悬疑和高压追更感的读者/);
  assert.match(prompt, /Commercial tags: 强冲突, 都市奇诡, 持续追更/);
  assert.match(prompt, /World atmosphere: 高压雾港里，审判机构与地下交易同时运作。/);
  assert.match(prompt, /Author pen name: 雾港夜行/);
  assert.match(prompt, /Cover goal: Emphasize the book's strongest visual appeal and create a complete vertical novel cover with the exact title "雾港审判局" and author pen name "雾港夜行"./);
});


test("novel cover draft source prompt omits pen name when it is not filled", () => {
  const prompt = buildNovelCoverDraftSourcePrompt({
    basicForm: { ...baseBasicForm, penName: "   " },
    genreOptions: [],
    storyModeOptions: [],
    worldOptions: [],
  });

  assert.match(prompt, /Main image for the novel cover: 雾港审判局/);
  assert.doesNotMatch(prompt, /作者笔名/);
  assert.match(prompt, /create a complete vertical novel cover with the exact title "雾港审判局"/);
  assert.doesNotMatch(prompt, /作者笔名“/);
});

test("cover prompts use English instructions while preserving Chinese title text", () => {
  const titleInstruction = buildNovelCoverTitleInstruction("雾港审判局", "雾港夜行");
  assert.match(titleInstruction, /Clearly display only the title "雾港审判局" and author pen name "雾港夜行"/);
  assert.match(titleInstruction, /Render both in Simplified Chinese/);

  const withPenName = buildNovelCoverNegativePrompt(DEFAULT_NOVEL_COVER_NEGATIVE_PROMPT, "雾港夜行");
  assert.doesNotMatch(withPenName, /author name/);
  assert.match(withPenName, /gibberish/);

  const legacyNegativePrompt = buildNovelCoverNegativePrompt("乱码，作者名，水印", "雾港夜行");
  assert.equal(legacyNegativePrompt, "乱码, 水印");
});
