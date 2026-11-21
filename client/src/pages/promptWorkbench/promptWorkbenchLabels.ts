import type { NovelMaterialImportance, PromptCatalogItem } from "@/api/promptWorkbench";

export const LOCKED_FIELD_LABELS: Record<string, string> = {
  outputSchema: "Output format",
  postValidate: "Output validation",
  postValidateFailureRecovery: "Validation failure recovery",
  semanticRetryPolicy: "Semantic retry policy",
  taskType: "Task type",
  mode: "Output mode",
  contextPolicy: "Context policy",
  toolCatalog: "Tool catalog",
  approvalBoundary: "Approval boundary",
};

export const SLOT_KIND_LABELS: Record<string, string> = {
  replace: "Replace",
  append: "Append constraint",
  choice: "Option",
  toggle: "Toggle",
  token: "Inline value",
};

export const CONTEXT_GROUP_LABELS: Record<string, string> = {
  book_contract: "Book contract",
  chapter_boundary: "Chapter boundaries",
  chapter_mission: "Chapter mission",
  character_dynamics: "Character dynamics",
  character_hard_facts: "Character facts",
  character_resource_context: "Character resources",
  continuation_constraints: "Continuation constraints",
  custom_slot: "Custom constraints",
  historical_issues: "Previous review issues",
  incremental_round_context: "Incremental generation round",
  local_state: "Current situation",
  narrative_progress_hint: "Narrative progress",
  obligation_contract: "Obligation contract",
  open_conflicts: "Open conflicts",
  opening_constraints: "Opening constraints",
  participant_subset: "Participating characters",
  payoff_directives: "Foreshadowing directives",
  payoff_ledger: "Foreshadowing ledger",
  previous_chapter_hook: "Previous chapter hook",
  previous_chapter_tail: "Previous chapter ending",
  rag_context: "Retrieved context",
  recent_chapters: "Recent chapter summaries",
  repair_boundaries: "Revision boundaries",
  repair_issues: "Revision issues",
  state_goal: "State and goal",
  story_macro: "Story macro plan",
  structure_obligations: "Structural obligations",
  style_contract: "Style contract",
  timeline_context: "Timeline",
  volume_window: "Volume progress",
  world_rules: "World rules",
  world_slice: "Worldbuilding excerpt",
};

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  novel: "Novel",
  chapter: "Chapter",
  plan: "Plan",
  state: "State",
  character: "Character",
  world: "Worldbuilding",
  style: "Style",
  audit: "Review",
  task: "Task",
};

export const MESSAGE_ROLE_LABELS: Record<string, string> = {
  system: "System",
  human: "User",
  assistant: "Assistant",
  ai: "Assistant",
};

export const TASK_TYPE_LABELS: Record<string, string> = {
  writer: "Writing",
  light_review: "Light review",
  critical_review: "Full review",
  repair: "Revision",
  summary: "Summary",
  planning: "Planning",
  translation: "Translation",
  analysis: "Analysis",
  classification: "Classification",
};

export const OUTPUT_TYPE_LABELS: Record<string, string> = {
  structured: "Structured output",
  text: "Text output",
};

export const ENTRYPOINT_OPTIONS = [
  { value: "creative_hub", label: "Creative Hub" },
  { value: "auto_director", label: "Auto Director" },
  { value: "chapter_pipeline", label: "Chapter pipeline" },
  { value: "manual_test", label: "Manual test" },
];

export const MANAGEMENT_STATUS_LABELS: Record<PromptCatalogItem["managementStatus"], string> = {
  complete: "Metadata complete",
  missing_context_requirements: "Context requirements missing",
  missing_slots: "Slot declarations missing",
  missing_advanced_template: "Advanced template missing",
};

export const MATERIAL_IMPORTANCE_LABELS: Record<NovelMaterialImportance, string> = {
  must: "Required",
  high: "Important",
  medium: "Supporting",
  low: "Reference",
};

export const CONTEXT_STATUS_LABELS = {
  selected: "Included",
  dropped: "Truncated",
  summarized: "Summarized",
  available: "Available",
} as const;

export const LOCKED_CONTEXT_GROUPS = new Set([
  "chapter_mission",
  "character_hard_facts",
  "obligation_contract",
  "style_contract",
  "local_state",
  "timeline_context",
  "previous_chapter_hook",
  "volume_window",
  "participant_subset",
]);

export function statusBadgeVariant(status: PromptCatalogItem["managementStatus"]) {
  return status === "complete" ? "default" : "secondary";
}

export function capabilityLabels(prompt: PromptCatalogItem): string[] {
  return [
    prompt.capabilities.hasOutputSchema ? "Schema" : null,
    prompt.capabilities.hasPostValidate ? "PostValidate" : null,
    prompt.capabilities.hasSemanticRetryPolicy ? "SemanticRetry" : null,
    prompt.capabilities.hasRepairPolicy ? "Repair" : null,
    prompt.capabilities.hasStructuredOutputHint ? "OutputHint" : null,
    prompt.capabilities.supportsAdvancedTemplate ? "Advanced template" : null,
  ].filter(Boolean) as string[];
}
