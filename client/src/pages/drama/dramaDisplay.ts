import type { DramaSourceType } from "@/api/drama";

export const DRAMA_TRACK_OPTIONS = [
  { value: "counterattack", label: "Comeback" },
  { value: "rebirth_revenge", label: "Rebirth revenge" },
  { value: "war_god", label: "Returning war hero" },
  { value: "live_in_son", label: "Live-in son-in-law" },
  { value: "miracle_doctor", label: "Miracle doctor" },
  { value: "rich_family", label: "Family power struggle" },
  { value: "sweet_love", label: "Sweet romance" },
  { value: "hidden_identity", label: "Secret identity" },
] as const;

export const DRAMA_SOURCE_LABELS: Record<DramaSourceType, string> = {
  novel_import: "Novel import",
  original: "Original drama",
  text_import: "Text import",
};

export function dramaTrackLabel(track?: string | null): string {
  if (!track) {
    return "No genre selected";
  }
  return DRAMA_TRACK_OPTIONS.find((option) => option.value === track)?.label ?? track;
}
