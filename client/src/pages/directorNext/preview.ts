import type { DashboardView, DirectorTimelineEvent } from "@/api/directorNext";

export const previewStates = [
  { id: "running", label: "In progress", mode: "running", headline: "Generating “Target Volume Pace Board”", pauseKind: null },
  { id: "waiting_gate", label: "Awaiting confirmation", mode: "waiting_gate", headline: "Confirm “Character lineup” to continue", pauseKind: null },
  { id: "manual", label: "Paused with progress saved", mode: "paused", headline: "Paused. Resume from saved progress when you're ready.", pauseKind: "manual_recovery" },
  { id: "replan", label: "Paused for replanning", mode: "paused", headline: "Replan before continuing.", pauseKind: "replan" },
  { id: "safety", label: "Paused for a risk", mode: "paused", headline: "A risk was detected. Paused while you review it.", pauseKind: "safety" },
  { id: "failed", label: "Interrupted", mode: "failed", headline: "Writing was interrupted. Continue from the existing content.", pauseKind: null },
  { id: "completed", label: "Range complete", mode: "completed", headline: "Writing in the authorized range is complete.", pauseKind: null },
] as const;

export function previewView(id: string): DashboardView {
  const state = previewStates.find((item) => item.id === id) ?? previewStates[0];
  return {
    runId: "preview", novelId: "preview", mode: state.mode, driver: "auto", headline: state.headline,
    detail: state.id === "safety" ? "The usage limit for this authorization has been reached. Review the settings before deciding what to do next." : null,
    nextActionGuidance: state.mode === "completed" ? "Review the next chapter range and submit the writing task." : state.mode === "waiting_gate" ? "Open this stage's results, review them, and confirm to continue." : state.mode === "paused" ? "Review why the run paused, then resume from saved progress." : "Wait while AI works through the authorized range.",
    chapterProgress: null, nextLaunchRange: null,
    progress: { done: state.id === "completed" ? 10 : 4, total: 10, source: "artifact_ledger" },
    debts: { count: 2, chapterOrders: [3, 5] },
    availableActions: state.mode === "completed" ? [] : state.mode === "waiting_gate"
      ? [{ id: "review", label: "Review “Character lineup”", kind: "navigate", primary: true, target: "/lab/director/preview?state=waiting_gate" }]
      : state.mode === "paused"
        ? [{ id: "resume", label: state.id === "replan" ? "Replan and continue" : "Resume from saved progress", kind: "command", primary: true, command: "resume" }]
        : state.mode === "failed"
          ? [{ id: "open_run", label: "Continue from existing content", kind: "command", primary: true, command: "open_run" }]
          : [{ id: "cancel", label: "Cancel this run", kind: "command", primary: false, command: "cancel" }],
    sourceRoute: "/lab/director/preview", sourceTrace: { controlStatus: state.mode, controlVersion: 4, pauseKind: state.pauseKind, planVersion: "director-next-production-v1" },
  };
}

export const previewTimeline: DirectorTimelineEvent[] = [
  { seq: 1, type: "command_accepted", payload: {}, createdAt: "2026-10-02T01:00:00Z" },
  { seq: 2, type: "step_finished", payload: {}, createdAt: "2026-10-02T01:03:00Z" },
  { seq: 3, type: "quality_debt_recorded", payload: {}, createdAt: "2026-10-02T01:04:00Z" },
];
