import type { NovelUsageQuery, NovelUsageSummary } from "@ai-novel/shared/types/llmUsage";

export function formatUsageTokens(value: number | null | undefined): string {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value.toLocaleString("en-US") : "Not provided";
}

export function usageCoverageNotes(summary: Pick<NovelUsageSummary, "recordedCallCount" | "unknownUsageCallCount" | "cacheReportedCallCount" | "partialCallCount">): string[] {
  const notes: string[] = [];
  if (summary.unknownUsageCallCount) notes.push(`Calls with unreported token usage: ${summary.unknownUsageCallCount}. Totals include reported usage only.`);
  if (summary.recordedCallCount && summary.cacheReportedCallCount < summary.recordedCallCount) {
    notes.push(`Cache statistics cover ${summary.cacheReportedCallCount}/${summary.recordedCallCount} calls. Hit and miss totals include reported values only.`);
  }
  if (summary.partialCallCount) notes.push(`${summary.partialCallCount} calls returned partial results; statistics may be incomplete.`);
  return notes;
}

export function usageFiltersFromParams(params: URLSearchParams): NovelUsageQuery {
  const filters: NovelUsageQuery = {};
  for (const key of ["chapterId", "stage", "provider", "model"] as const) {
    const value = params.get(key)?.trim();
    if (value) filters[key] = value;
  }
  const status = params.get("status");
  if (status === "completed" || status === "partial" || status === "failed") filters.status = status;
  return filters;
}

const stages: Record<string, string> = {
  writer: "Chapter writing", chapter_writer: "Chapter writing", chapter_writing: "Chapter writing",
  chapter_acceptance: "Chapter validation", review: "Review", chapter_review: "Chapter review",
  chapter_repair: "Chapter revision", repair: "Chapter revision", chapter_patch: "Targeted revision",
  chapter_artifact_sync: "Chapter reference sync", chapter_summary: "Chapter summary",
  chapter_artifact_delta: "Chapter asset updates", payoff_ledger_reconcile: "Foreshadowing reconciliation", payoff_ledger_planning: "Foreshadowing planning",
  chapter_batch: "Batch chapter writing", production_run: "Manuscript writing",
  story_macro: "Story planning", story_macro_plan: "Story planning", book_contract: "Book objectives",
  world_setup: "Worldbuilding", character_setup: "Character setup", volume_strategy: "Volume planning",
  volume_beat_sheet: "Volume beat sheet", volume_chapter_list: "Chapter outline",
  chapter_detail_bundle: "Chapter tasks and scenes", structured_outline: "Structured outline",
  replan: "Replanning", chapter_local_replan: "Chapter replanning",
};
export function usageStageLabel(stage: string | null): string { return stage ? stages[stage] ?? stage : "Unrecorded writing stage"; }
export function usageStatusLabel(status: string): string {
  return status === "completed" ? "Completed" : status === "partial" ? "Partial" : status === "failed" ? "Failed" : "Unrecorded status";
}
export function usageTime(value: string | null): string {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString("en-US") : "Not recorded";
}

export function formatUsageDuration(ms: number | null | undefined): string {
  return ms == null ? "Not provided" : ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}
export function usageTokensPerSecond(tokens: number | null, durationMs: number | null): string {
  return tokens !== null && durationMs !== null && durationMs > 0 ? (tokens * 1000 / durationMs).toFixed(1) : "Not provided";
}
