const INTENT_LABELS: Record<string, string> = {
  social_opening: "Casual greeting",
  list_novels: "List novels",
  list_worlds: "List worlds",
  query_task_status: "Check task status",
  create_novel: "Create a novel",
  select_novel_workspace: "Switch novel workspace",
  bind_world_to_novel: "Link a world to a novel",
  unbind_world_from_novel: "Unlink a world from a novel",
  produce_novel: "Novel production",
  query_novel_production_status: "Check production status",
  query_novel_title: "Check novel title",
  query_chapter_content: "Read chapter content",
  query_progress: "Check writing progress",
  inspect_failure_reason: "Diagnose a failure",
  write_chapter: "Write a chapter",
  rewrite_chapter: "Rewrite a chapter",
  save_chapter_draft: "Save chapter draft",
  start_pipeline: "Start pipeline",
  inspect_characters: "Review character plans",
  inspect_timeline: "Review timeline",
  inspect_world: "Review world",
  search_knowledge: "Search the Knowledge Library",
  ideate_novel_setup: "Suggest novel setup options",
  general_chat: "General conversation",
  unknown: "Unrecognized intent",
};

const PLANNER_SOURCE_LABELS: Record<string, string> = {
  llm: "Model-detected",
  unknown: "Unknown source",
};

function formatBilingualLabel(label: string, rawValue: string) {
  return `${label} (${rawValue})`;
}

export function getIntentDisplayLabel(intent: unknown): string {
  const rawValue = typeof intent === "string" && intent.trim() ? intent.trim() : "unknown";
  const label = INTENT_LABELS[rawValue] ?? "Unmapped intent";
  return formatBilingualLabel(label, rawValue);
}

export function getPlannerSourceDisplayLabel(source: unknown): string {
  const rawValue = typeof source === "string" && source.trim() ? source.trim() : "unknown";
  const label = PLANNER_SOURCE_LABELS[rawValue] ?? "Unmapped source";
  return formatBilingualLabel(label, rawValue);
}
