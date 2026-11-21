import type { Character, CharacterTimeline } from "@ai-novel/shared/types/novel";

const RELATION_POSITIVE_KEYWORDS = ["伙伴", "盟友", "信任", "守护", "亲密", "喜欢", "合作"];
const RELATION_NEGATIVE_KEYWORDS = ["敌对", "对立", "怀疑", "背叛", "利用", "冲突", "压制"];
const TREND_UP_KEYWORDS = ["升温", "缓和", "靠近", "修复", "合作加深", "信任增加"];
const TREND_DOWN_KEYWORDS = ["恶化", "破裂", "紧张", "决裂", "冲突升级", "敌意加深"];

function compactText(input: string | null | undefined): string {
  return (input ?? "").trim();
}

function joinSegments(segments: Array<string | null | undefined>): string {
  return segments
    .map((segment) => compactText(segment))
    .filter((segment) => segment.length > 0)
    .join("; ");
}

function countHits(source: string, keywords: string[]): number {
  return keywords.reduce((count, keyword) => (source.includes(keyword) ? count + 1 : count), 0);
}

export interface QuickCharacterCreatePayload {
  name: string;
  role: string;
  relationToProtagonist?: string;
  storyFunction?: string;
  keywords?: string;
  autoGenerateProfile?: boolean;
}

export interface CharacterRelationRow {
  targetCharacterId: string;
  targetCharacterName: string;
  currentRelation: string;
  trend: string;
  lastChangedChapter: number | null;
  evidence: string;
}

interface GeneratedCharacterProfile {
  personality?: string;
  background?: string;
  development?: string;
  currentState?: string;
  currentGoal?: string;
}

export function buildCharacterProfileFromWizard(payload: QuickCharacterCreatePayload): GeneratedCharacterProfile {
  if (!payload.autoGenerateProfile) {
    return {};
  }

  const keywordList = (payload.keywords ?? "")
    .split(/[，,\s]+/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  const keywordText = keywordList.length > 0 ? keywordList.join(", ") : "To be added";

  const personality = `Core traits: ${keywordText}`;
  const background = joinSegments([
    payload.relationToProtagonist ? `Relationship to protagonist: ${payload.relationToProtagonist}` : "",
    payload.storyFunction ? `Story function: ${payload.storyFunction}` : "",
  ]);
  const development = joinSegments([
    payload.storyFunction ? `Character arc: develop around "${payload.storyFunction}".` : "",
    keywordList.length > 0 ? `Potential conflicts: ${keywordList.slice(0, 3).join(", ")}` : "",
    keywordList.length > 0 ? `Potential foreshadowing: ${keywordList.slice(-2).join(", ")}` : "",
    keywordList.length > 0 ? `Suggested voice: a ${keywordList[0]} tone.` : "",
  ]);

  return {
    personality: personality || undefined,
    background: background || undefined,
    development: development || undefined,
    currentState: payload.relationToProtagonist ? `Relationship developing (${payload.relationToProtagonist})` : "Not yet introduced",
    currentGoal: payload.storyFunction || "Advance a key main-plot beat",
  };
}

function inferCurrentRelation(source: string): string {
  if (!source) {
    return "Undefined";
  }
  const positiveHits = countHits(source, RELATION_POSITIVE_KEYWORDS);
  const negativeHits = countHits(source, RELATION_NEGATIVE_KEYWORDS);
  if (positiveHits > negativeHits) {
    return "Cooperative / close";
  }
  if (negativeHits > positiveHits) {
    return "Opposed / tense";
  }
  return "Complex / to be observed";
}

function inferTrend(source: string): string {
  if (!source) {
    return "To be observed";
  }
  const upHits = countHits(source, TREND_UP_KEYWORDS);
  const downHits = countHits(source, TREND_DOWN_KEYWORDS);
  if (upHits > downHits) {
    return "Improving";
  }
  if (downHits > upHits) {
    return "Worsening";
  }
  return "Stable";
}

function includesCharacterName(source: string, characterName: string): boolean {
  if (!source || !characterName) {
    return false;
  }
  return source.includes(characterName);
}

function buildLatestEvidence(event?: CharacterTimeline): string {
  if (!event) {
    return "No chapter evidence yet";
  }
  const excerpt = compactText(event.content).slice(0, 36);
  return excerpt.length > 0 ? excerpt : event.title;
}

export function buildCharacterRelationRows(
  selectedCharacter: Character | undefined,
  characters: Character[],
  timelineEvents: CharacterTimeline[],
): CharacterRelationRow[] {
  if (!selectedCharacter) {
    return [];
  }

  const selectedText = joinSegments([
    selectedCharacter.background,
    selectedCharacter.development,
    selectedCharacter.currentState,
    selectedCharacter.currentGoal,
    selectedCharacter.personality,
  ]);

  return characters
    .filter((character) => character.id !== selectedCharacter.id)
    .map((character) => {
      const relatedEvents = timelineEvents
        .filter((event) => includesCharacterName(`${event.title} ${event.content}`, character.name))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const latestEvent = relatedEvents[0];
      const relationSource = joinSegments([
        selectedText,
        ...relatedEvents.slice(0, 3).map((event) => `${event.title} ${event.content}`),
      ]);

      return {
        targetCharacterId: character.id,
        targetCharacterName: character.name,
        currentRelation: inferCurrentRelation(relationSource),
        trend: inferTrend(relationSource),
        lastChangedChapter: latestEvent?.chapterOrder ?? null,
        evidence: buildLatestEvidence(latestEvent),
      };
    });
}

export function getLastAppearanceChapter(timelineEvents: CharacterTimeline[]): number | null {
  return timelineEvents.reduce<number | null>((latest, event) => {
    if (typeof event.chapterOrder !== "number") {
      return latest;
    }
    if (latest === null || event.chapterOrder > latest) {
      return event.chapterOrder;
    }
    return latest;
  }, null);
}
