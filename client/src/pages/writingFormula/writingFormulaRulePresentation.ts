import type {
  CharacterRules,
  LanguageRules,
  NarrativeRules,
  RhythmRules,
} from "@ai-novel/shared/types/styleEngine";

export type RuleSection = "narrativeRules" | "characterRules" | "languageRules" | "rhythmRules";
type RuleObject = NarrativeRules | CharacterRules | LanguageRules | RhythmRules;

export interface RuleEntry {
  key: string;
  label: string;
  value: string;
}

const FIELD_ORDER: Record<RuleSection, string[]> = {
  narrativeRules: [
    "summary",
    "progressionMode",
    "sceneUnitPattern",
    "multiPov",
    "looping",
    "endingStyle",
    "povSwitchStyle",
  ],
  characterRules: [
    "summary",
    "dialogueStyle",
    "emotionExpression",
    "defenseMechanisms",
    "allowSelfReflection",
    "facePriority",
  ],
  languageRules: [
    "summary",
    "register",
    "roughness",
    "sentenceVariation",
    "allowIncompleteSentences",
    "allowSwearing",
    "allowUselessDetails",
  ],
  rhythmRules: [
    "summary",
    "pace",
    "paragraphDensity",
    "allowFragmentedFlow",
    "actionOverExplanation",
  ],
};

const FIELD_LABELS: Record<RuleSection, Record<string, string>> = {
  narrativeRules: {
    summary: "Overall progression",
    progressionMode: "Progression mode",
    sceneUnitPattern: "Scene unit",
    multiPov: "Multiple POVs",
    looping: "Recurring hooks",
    endingStyle: "Ending style",
    povSwitchStyle: "POV switching",
  },
  characterRules: {
    summary: "Character expression summary",
    dialogueStyle: "Dialogue style",
    emotionExpression: "Emotional expression",
    defenseMechanisms: "Defense mechanisms",
    allowSelfReflection: "Self-reflection",
    facePriority: "Saving face",
  },
  languageRules: {
    summary: "Language and texture summary",
    register: "Language register",
    roughness: "Roughness",
    sentenceVariation: "Sentence variation",
    allowIncompleteSentences: "Incomplete sentences",
    allowSwearing: "Profanity and colloquialisms",
    allowUselessDetails: "Everyday details",
  },
  rhythmRules: {
    summary: "Pacing summary",
    pace: "Progression speed",
    paragraphDensity: "Paragraph density",
    allowFragmentedFlow: "Fragmented progression",
    actionOverExplanation: "Action over explanation",
  },
};

const FIELD_VALUE_MAPS: Record<string, Record<string, string>> = {
  progressionMode: {
    time_sequence: "Chronological progression",
    goal_driven: "Goal-driven progression",
    mystery_escalation: "Escalating mystery",
    relationship_push_pull: "Relationship push and pull",
    multi_thread: "Interwoven storylines",
    scene_immersion: "Immersive scenes",
    fact_driven: "Fact-driven progression",
    contrast_driven: "Contrast-driven progression",
  },
  endingStyle: {
    unresolved: "Leave the central dilemma unresolved",
    hook: "End with a hook",
    suspense: "End on suspense",
    emotional_hook: "End with an emotional hook",
    cross_hook: "End with a cross-thread hook",
    soft_open: "End on a gentle opening",
    pressure_continue: "Carry pressure forward",
    bitter_aftertaste: "Leave a bitter aftertaste",
  },
  povSwitchStyle: {
    controlled: "Controlled switching",
  },
  emotionExpression: {
    behavior_only: "Expressed through actions only",
    dialogue_and_action: "Expressed through dialogue and actions",
    reaction_only: "Expressed mainly through reactions",
    subtext: "Expressed through subtext",
    mixed: "Expressed through dialogue, actions, and reactions",
    light_behavior: "Expressed through subtle actions and reactions",
    suppressed: "Suppressed rather than stated directly",
    deadpan: "Expressed through deadpan reactions",
  },
  dialogueStyle: {
    short_colloquial: "Short, colloquial lines",
    direct: "Direct and blunt",
    restrained: "Restrained",
    subtext_heavy: "Rich in subtext",
    distinct_by_role: "Distinct voices by character",
    daily_natural: "Natural and conversational",
    informational: "Restrained, information-focused dialogue",
    deadpan_colloquial: "Deadpan and colloquial",
  },
  register: {
    colloquial: "Colloquial",
    direct: "Direct and clear",
    restrained: "Restrained",
    natural: "Natural and conversational",
    flexible: "Varies by character",
    professional: "Professional and restrained",
  },
  sentenceVariation: {
    high: "High variation",
    medium: "Moderate variation",
    medium_high: "Moderately high variation",
  },
  pace: {
    medium_fast: "Moderately fast",
    fast: "Fast",
    medium: "Moderate",
    medium_slow: "Moderately slow",
    balanced: "Balanced",
    slow: "Slow",
  },
  paragraphDensity: {
    high: "High density",
    medium: "Moderate density",
    medium_high: "Moderately high density",
  },
};

function compactText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

function humanizeUnknownToken(value: string): string {
  return value.replace(/_/g, " ").trim();
}

function formatBooleanValue(key: string, value: boolean): string {
  if (key === "multiPov") {
    return value ? "Allow POV changes" : "Prefer a single POV";
  }
  if (key === "looping") {
    return value ? "Allow recurring hooks" : "Prefer linear progression";
  }
  if (key === "allowSelfReflection") {
    return value ? "Allow explicit self-reflection" : "Avoid direct self-reflection";
  }
  if (key === "facePriority") {
    return value ? "Prioritize saving face" : "Do not force characters to save face";
  }
  if (key === "allowIncompleteSentences") {
    return value ? "Allow sentence fragments" : "Prefer complete sentences";
  }
  if (key === "allowSwearing") {
    return value ? "Allow some profanity" : "Avoid profanity";
  }
  if (key === "allowUselessDetails") {
    return value ? "Allow everyday details" : "Reduce irrelevant details";
  }
  if (key === "allowFragmentedFlow") {
    return value ? "Allow fragmented progression" : "Prefer complete progression";
  }
  if (key === "actionOverExplanation") {
    return value ? "Prioritize action over explanation" : "Prioritize explanation over action";
  }
  return value ? "Yes" : "No";
}

function formatArrayValue(value: unknown[]): string {
  return value
    .map((item) => {
      if (typeof item === "string") {
        return humanizeUnknownToken(item);
      }
      return String(item);
    })
    .filter(Boolean)
    .join(" / ");
}

export function formatRuleFieldLabel(section: RuleSection, key: string): string {
  return FIELD_LABELS[section][key] ?? humanizeUnknownToken(key);
}

export function formatRuleFieldValue(section: RuleSection, key: string, value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return formatBooleanValue(key, value);
  }

  if (typeof value === "number") {
    if (key === "roughness") {
      return `${Math.round(value * 100)} / 100`;
    }
    return String(value);
  }

  if (Array.isArray(value)) {
    return formatArrayValue(value);
  }

  if (typeof value === "string") {
    const normalized = compactText(value);
    if (!normalized) {
      return "";
    }
    return FIELD_VALUE_MAPS[key]?.[normalized] ?? normalized;
  }

  return "";
}

export function buildReadableRuleEntries(section: RuleSection, rules: RuleObject | Record<string, unknown>): RuleEntry[] {
  const record = rules as Record<string, unknown>;
  const keySet = new Set<string>([
    ...FIELD_ORDER[section],
    ...Object.keys(record),
  ]);

  return Array.from(keySet)
    .map((key) => ({
      key,
      label: formatRuleFieldLabel(section, key),
      value: formatRuleFieldValue(section, key, record[key]),
    }))
    .filter((entry) => Boolean(entry.value))
    .sort((left, right) => {
      const leftIndex = FIELD_ORDER[section].indexOf(left.key);
      const rightIndex = FIELD_ORDER[section].indexOf(right.key);
      const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
      const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
      return normalizedLeft - normalizedRight;
    });
}

export function buildReadableRuleSummary(
  section: RuleSection,
  rules: RuleObject | Record<string, unknown>,
  fallback: string,
): string {
  const entries = buildReadableRuleEntries(section, rules);
  if (entries.length === 0) {
    return fallback;
  }

  return entries
    .slice(0, 3)
    .map((entry) => (entry.key === "summary" ? entry.value : `${entry.label}：${entry.value}`))
    .join("；");
}
