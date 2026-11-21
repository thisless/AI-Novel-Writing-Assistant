import type { FailureDiagnostic } from "@ai-novel/shared/types/agent";
import type {
  CreativeHubInterrupt,
  CreativeHubNovelSetupStatus,
  CreativeHubProductionStatus,
  CreativeHubThread,
  CreativeHubTurnSummary,
} from "@ai-novel/shared/types/creativeHub";
import type { WorkspaceTone } from "@/components/workspace";

export type CreativeHubWorkspaceAction =
  | "retry_threads"
  | "retry_state"
  | "retry_thread"
  | "retry_novels"
  | "retry_create_thread"
  | "review_interrupt"
  | "view_activity"
  | "send_prompt"
  | "select_novel"
  | "open_production";

export interface CreativeHubWorkspaceRecommendation {
  tone: WorkspaceTone;
  title: string;
  description: string;
  action: CreativeHubWorkspaceAction;
  actionLabel: string;
  prompt?: string;
}

export interface CreativeHubWorkspacePresentation {
  objectTitle: string;
  stageLabel: string;
  threadStatusLabel: string;
  recommendation: CreativeHubWorkspaceRecommendation;
}

export function formatCreativeHubThreadStatus(
  status: CreativeHubThread["status"] | undefined,
): string {
  if (status === "busy") return "Running";
  if (status === "interrupted") return "Needs review";
  if (status === "error") return "Run error";
  if (status === "idle") return "Waiting for input";
  return "Initializing";
}

function formatSetupStage(stage: CreativeHubNovelSetupStatus["stage"] | undefined): string | null {
  if (stage === "setup_in_progress") return "Complete novel setup";
  if (stage === "ready_for_planning") return "Ready for story planning";
  if (stage === "ready_for_production") return "Ready for novel production";
  return null;
}

function errorText(value: unknown, fallback: string): string | null {
  if (!value) return null;
  if (value instanceof Error && value.message.trim()) return value.message.trim();
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

export function resolveCreativeHubWorkspacePresentation(input: {
  thread?: CreativeHubThread | null;
  currentNovelTitle?: string | null;
  interrupt?: CreativeHubInterrupt | null;
  isRunning: boolean;
  diagnostics?: FailureDiagnostic | null;
  productionStatus?: CreativeHubProductionStatus | null;
  novelSetup?: CreativeHubNovelSetupStatus | null;
  latestTurnSummary?: CreativeHubTurnSummary | null;
  threadsError?: unknown;
  stateError?: unknown;
  threadLoadError?: unknown;
  novelsError?: unknown;
  createThreadError?: unknown;
}): CreativeHubWorkspacePresentation {
  const objectTitle = input.currentNovelTitle?.trim()
    || input.productionStatus?.title?.trim()
    || input.novelSetup?.title?.trim()
    || "No novel linked";
  const stageLabel = input.latestTurnSummary?.currentStage?.trim()
    || input.productionStatus?.currentStage?.trim()
    || formatSetupStage(input.novelSetup?.stage)
    || "Waiting for a creative goal";
  const threadStatusLabel = formatCreativeHubThreadStatus(input.thread?.status);

  const threadsError = errorText(input.threadsError, "Failed to load creative threads.");
  if (threadsError) {
    return {
      objectTitle,
      stageLabel,
      threadStatusLabel,
      recommendation: {
        tone: "danger",
        title: "Reload creative threads",
        description: `${threadsError} Saved novels and thread content will not be changed.`,
        action: "retry_threads",
        actionLabel: "Reload threads",
      },
    };
  }

  const createThreadError = errorText(input.createThreadError, "Failed to create a creative thread.");
  if (createThreadError) {
    return {
      objectTitle,
      stageLabel,
      threadStatusLabel,
      recommendation: {
        tone: "danger",
        title: "Create a new creative thread",
        description: `${createThreadError} Existing novels and creative resources will not be changed.`,
        action: "retry_create_thread",
        actionLabel: "Create thread",
      },
    };
  }

  const stateError = errorText(input.stateError, "Failed to load thread status.")
    || errorText(input.threadLoadError, "Failed to load thread content.");
  if (stateError) {
    return {
      objectTitle,
      stageLabel,
      threadStatusLabel,
      recommendation: {
        tone: "danger",
        title: "Reload current workspace",
        description: `${stateError} The previous thread will stay hidden to avoid confusion.`,
        action: input.threadLoadError ? "retry_thread" : "retry_state",
        actionLabel: "Reload current thread",
      },
    };
  }

  const novelsError = errorText(input.novelsError, "Failed to load novels.");
  if (novelsError) {
    return {
      objectTitle,
      stageLabel,
      threadStatusLabel,
      recommendation: {
        tone: "danger",
        title: "Reload novel list",
        description: `${novelsError} The current thread content will be preserved.`,
        action: "retry_novels",
        actionLabel: "Reload novels",
      },
    };
  }

  if (input.interrupt) {
    return {
      objectTitle,
      stageLabel,
      threadStatusLabel,
      recommendation: {
        tone: "warning",
        title: input.interrupt.title || "Review pending creative action",
        description: input.interrupt.summary || "This action is waiting for your approval before it can continue.",
        action: "review_interrupt",
        actionLabel: "Review pending action",
      },
    };
  }

  if (input.thread?.status === "interrupted" || input.latestTurnSummary?.status === "interrupted") {
    return {
      objectTitle,
      stageLabel,
      threadStatusLabel,
      recommendation: {
        tone: "warning",
        title: "Review pending creative action",
        description: input.latestTurnSummary?.nextSuggestion?.trim()
          || "This thread is waiting for your approval. Review the pending action to continue.",
        action: "view_activity",
        actionLabel: "Review pending action",
      },
    };
  }

  if (input.isRunning || input.thread?.status === "busy") {
    return {
      objectTitle,
      stageLabel,
      threadStatusLabel,
      recommendation: {
        tone: "info",
        title: "AI is working on the current goal",
        description: `Current stage: ${stageLabel}. Status will update as work progresses, and you'll be notified if action is needed.`,
        action: "view_activity",
        actionLabel: "View current status",
      },
    };
  }

  const failedTurn = input.latestTurnSummary?.status === "failed"
    ? input.latestTurnSummary
    : null;
  const failureSummary = input.diagnostics?.failureSummary?.trim()
    || input.productionStatus?.failureSummary?.trim()
    || input.thread?.latestError?.trim()
    || failedTurn?.impactSummary?.trim()
    || (input.thread?.status === "error" ? "The current creative thread has encountered an error." : null);
  if (failureSummary) {
    const recoveryHint = input.diagnostics?.recoveryHint?.trim()
      || input.productionStatus?.recoveryHint?.trim()
      || failedTurn?.nextSuggestion?.trim()
      || "Analyze the current failure and suggest safe recovery steps.";
    return {
      objectTitle,
      stageLabel,
      threadStatusLabel,
      recommendation: {
        tone: "danger",
        title: "Review the current issue",
        description: `${failureSummary} Recovery will continue using existing novel assets and task records.`,
        action: "send_prompt",
        actionLabel: "View failure details",
        prompt: `Explain the failure, execution history, and where to take action: ${recoveryHint}`,
      },
    };
  }

  if (input.novelSetup && input.novelSetup.stage !== "ready_for_production") {
    const prompt = input.novelSetup.recommendedAction?.trim()
      || input.novelSetup.nextQuestion?.trim();
    return {
      objectTitle,
      stageLabel,
      threadStatusLabel,
      recommendation: {
        tone: "warning",
        title: "Complete novel setup",
        description: input.novelSetup.nextQuestion?.trim()
          || "Complete the key details needed for planning before starting novel production.",
        action: prompt ? "send_prompt" : "open_production",
        actionLabel: prompt ? "Continue with AI suggestion" : "Review novel setup",
        ...(prompt ? { prompt } : {}),
      },
    };
  }

  const nextSuggestion = input.latestTurnSummary?.nextSuggestion?.trim();
  if (nextSuggestion) {
    return {
      objectTitle,
      stageLabel,
      threadStatusLabel,
      recommendation: {
        tone: "info",
        title: "Review latest diagnosis",
        description: nextSuggestion,
        action: "send_prompt",
        actionLabel: "View suggestion",
        prompt: `Explain the current status, execution history, and suggested next steps: ${nextSuggestion}`,
      },
    };
  }

  if (objectTitle === "No novel linked") {
    return {
      objectTitle,
      stageLabel,
      threadStatusLabel,
      recommendation: {
        tone: "info",
        title: "Choose a novel to work on",
        description: "Link a novel so AI can access its chapters, world, characters, and production status.",
        action: "select_novel",
        actionLabel: "Choose novel",
      },
    };
  }

  return {
    objectTitle,
    stageLabel,
    threadStatusLabel,
    recommendation: {
      tone: "neutral",
      title: "Describe your creative goal",
      description: "Ask a question, adjust your requirements, or open novel production settings to continue.",
      action: "open_production",
      actionLabel: "Open production settings",
    },
  };
}
