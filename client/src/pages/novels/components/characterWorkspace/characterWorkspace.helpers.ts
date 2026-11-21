import type { Character, CharacterVisibleProfileField } from "@ai-novel/shared/types/novel";
import type { CharacterResourceLedgerItem } from "@ai-novel/shared/types/characterResource";
import { isProtagonistCharacter } from "../characterAssetWorkspace.helpers";

export const VISIBLE_PROFILE_FIELDS: Array<{
  key: CharacterVisibleProfileField;
  label: string;
  placeholder: string;
}> = [
  { key: "appearance", label: "Distinctive appearance", placeholder: "Memorable features such as eyes, hairstyle, or habitual expressions" },
  { key: "physique", label: "Build and bearing", placeholder: "Apparent age, build, posture, and physical condition" },
  { key: "attireStyle", label: "Typical attire", placeholder: "Everyday clothing, visible status, or traces of class or profession" },
  { key: "signatureDetail", label: "Signature details", placeholder: "Signature objects, gestures, habits, scents, or recurring details" },
  { key: "voiceTexture", label: "Voice and speech style", placeholder: "Voice, speaking rhythm, sentence patterns, and tone" },
  { key: "presenceImpression", label: "First impression", placeholder: "The impression readers get when the character first appears or enters a scene" },
];

export function getSecretStatus(selectedCharacter?: Character): string {
  if (!selectedCharacter) {
    return "None";
  }
  if (selectedCharacter.secret?.trim()) {
    return "Has a known secret";
  }
  const runtimeSignal = `${selectedCharacter.currentState ?? ""} ${selectedCharacter.currentGoal ?? ""}`;
  return /秘密|隐瞒|卧底|伪装/.test(runtimeSignal) ? "Key information concealed" : "No known secrets";
}

export function getEmotionSignal(selectedCharacter?: Character): string {
  const runtimeSignal = `${selectedCharacter?.currentState ?? ""} ${selectedCharacter?.currentGoal ?? ""}`;
  if (/愤|怒|焦虑|崩溃|绝望/.test(runtimeSignal)) {
    return "High stress";
  }
  if (/平静|稳|冷静|从容/.test(runtimeSignal)) {
    return "Steady";
  }
  return "Unclear";
}

export function getResourceDisplayMode(character?: Character): {
  label: string;
  helper: string;
  limit: number;
  shouldShowResource: (item: CharacterResourceLedgerItem) => boolean;
} {
  const roleText = `${character?.role ?? ""} ${character?.castRole ?? ""}`;
  if (isProtagonistCharacter(character)) {
    return {
      label: "Protagonist resources",
      helper: "Shows the protagonist's items, clues, credentials, hidden advantages, and resource usage. Future chapters will prioritize these action constraints.",
      limit: 10,
      shouldShowResource: () => true,
    };
  }
  if (/临时|路人|客串|一次性/.test(roleText)) {
    return {
      label: "Minor character resources",
      helper: "Shows only resources that recur across chapters, drive conflict, relate to a setup, or are taken by the protagonist.",
      limit: 5,
      shouldShowResource: (item) => (
        item.narrativeFunction === "promise"
        || item.narrativeFunction === "hidden_card"
        || item.expectedUseEndChapterOrder != null
        || item.status === "transferred"
      ),
    };
  }
  return {
    label: "Key resources for recurring characters",
    helper: "Prioritizes resources that affect actions, relationship leverage, what readers know, or the payoff of a setup.",
    limit: 6,
    shouldShowResource: (item) => item.status !== "stale",
  };
}

export function getResourceStatusLabel(status: CharacterResourceLedgerItem["status"]): string {
  const labels: Record<CharacterResourceLedgerItem["status"], string> = {
    available: "Available",
    hidden: "Hidden",
    borrowed: "Borrowed",
    transferred: "Transferred",
    lost: "Lost",
    consumed: "Consumed",
    damaged: "Damaged",
    destroyed: "Destroyed",
    stale: "No longer relevant",
  };
  return labels[status] ?? status;
}

export function getResourceFunctionLabel(value: CharacterResourceLedgerItem["narrativeFunction"]): string {
  const labels: Record<CharacterResourceLedgerItem["narrativeFunction"], string> = {
    tool: "Tool",
    clue: "Clue",
    weapon: "Weapon",
    proof: "Evidence",
    key: "Key",
    cost: "Cost",
    promise: "Setup",
    hidden_card: "Hidden advantage",
    constraint: "Constraint",
  };
  return labels[value] ?? value;
}
