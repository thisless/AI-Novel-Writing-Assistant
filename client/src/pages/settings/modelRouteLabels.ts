import type { ModelRouteTaskType } from "@ai-novel/shared/types/novel";

export const MODEL_ROUTE_LABELS: Record<ModelRouteTaskType, { title: string; description: string }> = {
  planner: {
    title: "Outline planning",
    description: "Understand the writing goal, then plan how this part should progress.",
  },
  writer: {
    title: "Lead writing",
    description: "Generate the chapter manuscript in full.",
  },
  review: {
    title: "General review",
    description: "Review plot, pacing, and style to identify quality issues in the draft.",
  },
  light_review: {
    title: "Quick review",
    description: "Quickly check whether a chapter is ready to proceed with a lightweight post-draft review.",
  },
  critical_review: {
    title: "Critical review",
    description: "Check for issues that could affect book-wide continuity; suited to high-risk reviews and rechecks.",
  },
  repair: {
    title: "Chapter revision",
    description: "Revise the manuscript based on review findings so the chapter can move forward.",
  },
  replan: {
    title: "Window replanning",
    description: "When a local revision is not enough, reset the goals and transitions for affected chapters.",
  },
  state_resolution: {
    title: "State resolution",
    description: "Assess whether a proposed chapter state is reliable and reduce manual confirmations by Auto Director.",
  },
  summary: {
    title: "Story summary",
    description: "Turn long chapters into recaps, summaries, and key developments.",
  },
  fact_extraction: {
    title: "Continuity check",
    description: "Organize worldbuilding, timelines, and key facts to reduce inconsistencies.",
  },
  chat: {
    title: "Writing companion",
    description: "Handle everyday conversations and turn the results into practical writing guidance.",
  },
};
