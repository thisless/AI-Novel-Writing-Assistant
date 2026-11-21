import type {
  VisualAssetKind,
  VisualAssetOrigin,
  VisualAssetScopeKind,
  VisualAssetSourceDomain,
} from "@ai-novel/shared/types/visualAsset";

const KIND_LABELS: Record<VisualAssetKind, string> = {
  character: "Character image",
  cover: "Novel cover",
  illustration: "Illustration",
  comic_character_sheet: "Comic character sheet",
  comic_character_asset: "Comic character asset",
  comic_scene: "Comic scene",
  comic_panel: "Comic panel",
  drama_character_sheet: "Drama character sheet",
  drama_shot_keyframe: "Drama keyframe",
};

const SOURCE_LABELS: Record<VisualAssetSourceDomain, string> = {
  image_asset: "Image generation",
  comic: "Comic creation",
  drama: "Drama creation",
};

const ORIGIN_LABELS: Record<VisualAssetOrigin, string> = {
  generated: "AI-generated",
  uploaded: "Uploaded",
  imported: "Imported",
  unknown: "Source unknown",
};

const SCOPE_LABELS: Record<VisualAssetScopeKind, string> = {
  global: "All projects",
  novel: "Novel",
  book_analysis: "Book analysis",
  comic_project: "Comic project",
  drama_project: "Drama project",
};

export function getVisualAssetKindLabel(kind: VisualAssetKind) {
  return KIND_LABELS[kind];
}

export function getVisualAssetSourceLabel(source: VisualAssetSourceDomain) {
  return SOURCE_LABELS[source];
}

export function getVisualAssetOriginLabel(origin: VisualAssetOrigin) {
  return ORIGIN_LABELS[origin];
}

export function getVisualAssetScopeLabel(kind: VisualAssetScopeKind) {
  return SCOPE_LABELS[kind];
}

export function formatVisualAssetDate(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "Date not recorded";
  }
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", year: "numeric" }).format(date);
}
