import type { UnifiedTaskDetail } from "@ai-novel/shared/types/task";
import type { DirectorLockScope } from "@ai-novel/shared/types/novelDirector";
import type { NovelEditTakeoverState } from "./components/NovelEditView.types";

export function resolveAutoExecutionScopeLabel(task: UnifiedTaskDetail | null): string {
  const seedPayload = (task?.meta.seedPayload ?? null) as {
    autoExecution?: {
      scopeLabel?: string | null;
      totalChapterCount?: number | null;
    } | null;
  } | null;
  const scopeLabel = seedPayload?.autoExecution?.scopeLabel?.trim();
  if (scopeLabel) {
    return scopeLabel;
  }
  const fallbackCount = Math.max(1, Math.round(seedPayload?.autoExecution?.totalChapterCount ?? 10));
  return `Chapters 1-${fallbackCount}`;
}

export function formatTakeoverCheckpoint(
  checkpoint: string | null | undefined,
  task: UnifiedTaskDetail | null,
): string {
  if (checkpoint === "candidate_selection_required") {
    return "Waiting for novel direction confirmation";
  }
  if (checkpoint === "book_contract_ready") {
    return "Book contract awaiting confirmation";
  }
  if (checkpoint === "character_setup_required") {
    return "Character preparation awaiting review";
  }
  if (checkpoint === "volume_strategy_ready") {
    return "Volume strategy and outline awaiting review";
  }
  if (checkpoint === "chapter_batch_ready") {
    return `Automatic execution paused: ${resolveAutoExecutionScopeLabel(task)}`;
  }
  if (checkpoint === "replan_required") {
    return "Waiting to address replanning suggestions";
  }
  if (checkpoint === "workflow_completed") {
    return "Main workflow complete";
  }
  return "Director workflow in progress";
}

export function buildTakeoverTitle(input: {
  mode: NovelEditTakeoverState["mode"];
  novelTitle: string;
  checkpointType: string | null | undefined;
  scopeLabel: string;
}): string {
  if (
    input.mode === "running"
    && input.checkpointType === "chapter_batch_ready"
  ) {
    return `“${input.novelTitle}” is running automatic execution for ${input.scopeLabel}`;
  }
  if (input.mode === "waiting" || input.mode === "action_required") {
    if (input.checkpointType === "candidate_selection_required") {
      return `“${input.novelTitle}” is waiting for novel direction confirmation`;
    }
    if (input.checkpointType === "character_setup_required") {
      return `“${input.novelTitle}” is waiting for character preparation review`;
    }
    if (input.checkpointType === "volume_strategy_ready") {
      return `“${input.novelTitle}” is waiting for volume strategy and outline review`;
    }
    if (input.checkpointType === "workflow_completed") {
      return `Auto Director completed this run for “${input.novelTitle}”`;
    }
    if (input.checkpointType === "replan_required") {
      return `“${input.novelTitle}” needs replanning`;
    }
  }
  if (input.mode === "failed") {
    if (input.checkpointType === "chapter_batch_ready") {
      return `Automatic execution paused for ${input.scopeLabel} — “${input.novelTitle}”`;
    }
    return `Auto Director was interrupted for “${input.novelTitle}”`;
  }
  if (input.mode === "loading") {
    return `Syncing Auto Director status for “${input.novelTitle}”`;
  }
  return `Auto Director is managing “${input.novelTitle}”`;
}

export function buildTakeoverDescription(input: {
  mode: NovelEditTakeoverState["mode"];
  checkpointType: string | null | undefined;
  reviewScope: DirectorLockScope | null | undefined;
  scopeLabel: string;
}): string {
  if (
    input.mode === "running"
    && input.checkpointType === "chapter_batch_ready"
  ) {
    return `AI is running ${input.scopeLabel} in the background and will continue with review and repair. You can still view and edit manually; changes to the current chapter may be overwritten by later automated results.`;
  }
  if (input.mode === "waiting" || input.mode === "action_required") {
    if (input.checkpointType === "candidate_selection_required") {
      return "Novel direction options are ready. Select or revise an option on the novel direction page before Auto Director can continue.";
    }
    if (input.checkpointType === "character_setup_required") {
      return "Character preparation is ready. Review the main characters, relationships, and current goals before continuing Auto Director.";
    }
    if (input.checkpointType === "volume_strategy_ready") {
      return "Review and refine the volume strategy and outline. Once confirmed, Auto Director will continue with beat sheets, chapter breakdowns, and detailed resources for the selected chapter batch.";
    }
    if (input.checkpointType === "workflow_completed") {
      return `Auto Director has completed chapter execution, review, and repair for ${input.scopeLabel}. Continue writing in chapter execution or finish and exit Director mode.`;
    }
    if (input.checkpointType === "replan_required") {
      return "AI determined that this chapter and nearby chapters need replanning. Existing text will be preserved; nearby chapters will be replanned before generation resumes with unwritten chapters.";
    }
    if (input.reviewScope) {
      return "Auto Director reached a review checkpoint. Review the current stage's output before continuing.";
    }
  }
  if (input.mode === "failed") {
    if (input.checkpointType === "chapter_batch_ready") {
      return `Automatic execution paused for ${input.scopeLabel}. Review execution details or quality repair before resuming.`;
    }
    return "The background Director workflow was interrupted. Review execution details, then resume from the latest checkpoint.";
  }
  if (input.mode === "loading") {
    return "Syncing Auto Director status…";
  }
  return "AI is setting up this novel in the background. You can continue working manually; if both you and Auto Director edit the same content, the latest saved version takes precedence.";
}

export function buildContinueAutoExecutionActionLabel(scopeLabel: string, isPending: boolean): string {
  return isPending ? "Continuing automatic execution…" : `Continue automatic execution for ${scopeLabel}`;
}

export function buildReplanAndContinueActionLabel(isPending: boolean): string {
  return isPending ? "Replanning…" : "Replan and continue";
}

export function buildContinueAutoExecutionToast(scopeLabel: string): string {
  return `Auto Director resumed execution for ${scopeLabel} and will review and repair in the background.`;
}
