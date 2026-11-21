export interface CharacterImagePromptCharacterContext {
  name: string;
  role: string;
  personality: string;
  appearance?: string | null;
  background: string;
}

export interface BuildCharacterImagePromptInput {
  prompt: string;
  stylePreset?: string | null;
  character: CharacterImagePromptCharacterContext;
}

export interface NovelCoverImagePromptNovelContext {
  title: string;
  penName?: string | null;
  description?: string | null;
  targetAudience?: string | null;
  bookSellingPoint?: string | null;
  competingFeel?: string | null;
  first30ChapterPromise?: string | null;
  commercialTags?: string[] | null;
  genreLabel?: string | null;
  primaryStoryModeLabel?: string | null;
  secondaryStoryModeLabel?: string | null;
  worldName?: string | null;
  worldSummary?: string | null;
  styleTone?: string | null;
  narrativePovLabel?: string | null;
  pacePreferenceLabel?: string | null;
  emotionIntensityLabel?: string | null;
}

export interface BuildNovelCoverImagePromptInput {
  prompt: string;
  stylePreset?: string | null;
  novel: NovelCoverImagePromptNovelContext;
}

export const DEFAULT_NOVEL_COVER_STYLE_PRESET = "Cinematic illustration, atmospheric, highly recognizable, suitable as the main image for a web-novel cover";
export const DEFAULT_NOVEL_COVER_NEGATIVE_PROMPT = "gibberish, incorrect title, repeated text, subtitle, author name, slogan, watermark, logo, low resolution, blurry, deformed, extra limbs";

function joinLabelValues(label: string, values: Array<string | null | undefined>): string {
  const normalized = values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  return normalized.length > 0 ? `${label}: ${normalized.join(" / ")}` : "";
}

const AUTHOR_NAME_NEGATIVE_TOKENS = [
  "author name",
  "author pen name",
  "author signature",
  "作者名",
  "笔名",
  "作者署名",
];

export function buildNovelCoverNegativePrompt(
  input: string | null | undefined,
  penName?: string | null,
): string {
  const normalized = input?.trim() || DEFAULT_NOVEL_COVER_NEGATIVE_PROMPT;
  if (!penName?.trim()) {
    return normalized;
  }
  const filtered = normalized
    .split(/[，,]/u)
    .map((item) => item.trim())
    .filter((item) => item && !AUTHOR_NAME_NEGATIVE_TOKENS.includes(item));
  return filtered.join(", ");
}

export function buildNovelCoverTitleInstruction(title: string, penName?: string | null): string {
  const normalizedPenName = penName?.trim();
  if (normalizedPenName) {
    return `Clearly display only the title "${title}" and author pen name "${normalizedPenName}" in the image. Render both in Simplified Chinese, without changing, omitting, adding, or corrupting any characters. Make the title the primary visual element, and place the pen name below it or in an open area at the bottom, legible and without obscuring the subject. Do not generate subtitles, slogans, labels, watermarks, or logos beyond the title and pen name.`;
  }
  return `Clearly display only the title "${title}" in the image, rendered in Simplified Chinese without changing, omitting, adding, or corrupting any characters. Do not generate subtitles, author names, slogans, labels, watermarks, or logos beyond the title.`;
}

export function buildDefaultCharacterImageSourceDescription(character: {
  name: string;
  role?: string | null;
  appearance?: string | null;
  personality?: string | null;
}): string {
  const blocks = [
    `Character portrait: ${character.name}`,
    character.role ? `Role: ${character.role}` : "",
    character.appearance ? `Appearance and build: ${character.appearance}` : "",
    character.personality ? `Personality: ${character.personality}` : "",
  ];
  return blocks.filter(Boolean).join("\n");
}

export function buildCharacterImagePrompt(input: BuildCharacterImagePromptInput): string {
  const blocks = [
    input.prompt.trim(),
    input.stylePreset?.trim() ? `Style preset: ${input.stylePreset.trim()}` : "",
    `Character name: ${input.character.name}`,
    `Character role: ${input.character.role}`,
    `Personality: ${input.character.personality}`,
    `Appearance: ${input.character.appearance ?? "Not specified"}`,
    `Background: ${input.character.background}`,
  ];
  return blocks.filter(Boolean).join("\n");
}

export function buildDefaultNovelCoverSourceDescription(novel: NovelCoverImagePromptNovelContext): string {
  const blocks = [
    `Main image for the novel cover: ${novel.title}`,
    novel.description?.trim() ? `Synopsis: ${novel.description.trim()}` : "",
    novel.targetAudience?.trim() ? `Target audience: ${novel.targetAudience.trim()}` : "",
    novel.bookSellingPoint?.trim() ? `Core selling point: ${novel.bookSellingPoint.trim()}` : "",
    novel.competingFeel?.trim() ? `Reading experience: ${novel.competingFeel.trim()}` : "",
    novel.first30ChapterPromise?.trim() ? `First 30 chapters payoff: ${novel.first30ChapterPromise.trim()}` : "",
    novel.commercialTags?.length ? `Commercial tags: ${novel.commercialTags.join(", ")}` : "",
    novel.genreLabel?.trim() ? `Genre foundation: ${novel.genreLabel.trim()}` : "",
    joinLabelValues("Story modes", [novel.primaryStoryModeLabel, novel.secondaryStoryModeLabel]),
    novel.worldSummary?.trim()
      ? `World atmosphere: ${novel.worldSummary.trim()}`
      : novel.worldName?.trim()
        ? `World atmosphere: ${novel.worldName.trim()}`
        : "",
    novel.styleTone?.trim() ? `Style keywords: ${novel.styleTone.trim()}` : "",
    joinLabelValues("Narrative and pacing", [novel.narrativePovLabel, novel.pacePreferenceLabel, novel.emotionIntensityLabel]),
    novel.penName?.trim() ? `Author pen name: ${novel.penName.trim()}` : "",
    novel.penName?.trim()
      ? `Cover goal: Emphasize the book's strongest visual appeal and create a complete vertical novel cover with the exact title "${novel.title}" and author pen name "${novel.penName.trim()}".`
      : `Cover goal: Emphasize the book's strongest visual appeal and create a complete vertical novel cover with the exact title "${novel.title}".`,
  ];
  return blocks.filter(Boolean).join("\n");
}

export function buildNovelCoverImagePrompt(input: BuildNovelCoverImagePromptInput): string {
  const blocks = [
    input.prompt.trim(),
    input.stylePreset?.trim() ? `Style preset: ${input.stylePreset.trim()}` : "",
    input.novel.penName?.trim()
      ? "Cover goal: vertical Chinese web-novel cover with readable title and author pen-name typography."
      : "Cover goal: vertical Chinese web-novel cover with readable title typography.",
    `Project title: ${input.novel.title}`,
    `Required title text: ${input.novel.title}`,
    input.novel.penName?.trim() ? `Required author pen name text: ${input.novel.penName.trim()}` : "",
    buildNovelCoverTitleInstruction(input.novel.title, input.novel.penName),
    `Story premise: ${input.novel.description?.trim() || "Not specified"}`,
    `Target audience: ${input.novel.targetAudience?.trim() || "Not specified"}`,
    `Core selling point: ${input.novel.bookSellingPoint?.trim() || "Not specified"}`,
    `Reading feel: ${input.novel.competingFeel?.trim() || "Not specified"}`,
    `First 30 chapter payoff: ${input.novel.first30ChapterPromise?.trim() || "Not specified"}`,
    `Commercial tags: ${input.novel.commercialTags?.join(", ") || "Not specified"}`,
    `Genre: ${input.novel.genreLabel?.trim() || "Not specified"}`,
    `Primary story mode: ${input.novel.primaryStoryModeLabel?.trim() || "Not specified"}`,
    `Secondary story mode: ${input.novel.secondaryStoryModeLabel?.trim() || "Not specified"}`,
    `World frame: ${input.novel.worldSummary?.trim() || input.novel.worldName?.trim() || "Not specified"}`,
    `Tone keywords: ${input.novel.styleTone?.trim() || "Not specified"}`,
    `Narrative point of view: ${input.novel.narrativePovLabel?.trim() || "Not specified"}`,
    `Pacing preference: ${input.novel.pacePreferenceLabel?.trim() || "Not specified"}`,
    `Emotion intensity: ${input.novel.emotionIntensityLabel?.trim() || "Not specified"}`,
  ];
  return blocks.filter(Boolean).join("\n");
}
