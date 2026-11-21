import type { SSEFrame } from "@ai-novel/shared/types/api";
import type { ChapterRuntimePackage } from "@ai-novel/shared/types/chapterRuntime";
import type { AuditReport, Chapter, StoryStateSnapshot } from "@ai-novel/shared/types/novel";
import { Link } from "react-router-dom";
import AiButton from "@/components/common/AiButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ChapterExecutionStatusFlow from "./ChapterExecutionStatusFlow";
import {
  chapterHasPreparationAssets,
  chapterStatusLabel,
  chapterSuggestedActionLabel,
  PrimaryActionButton,
  type PrimaryAction,
  type ChapterExecutionBackgroundActivity,
  resolveDisplayedChapterStatus,
  resolveChapterExecutionFlow,
} from "./chapterExecution.shared";
import SelectControl from "@/components/common/SelectControl";

interface ChapterExecutionActionPanelProps {
  novelId: string;
  selectedChapter: Chapter | undefined;
  hasCharacters: boolean;
  strategy: {
    runMode: "fast" | "polish";
    wordSize: "short" | "medium" | "long";
    conflictLevel: number;
    pace: "slow" | "balanced" | "fast";
    aiFreedom: "low" | "medium" | "high";
  };
  onStrategyChange: (
    field: "runMode" | "wordSize" | "conflictLevel" | "pace" | "aiFreedom",
    value: string | number,
  ) => void;
  onApplyStrategy: () => void;
  isApplyingStrategy: boolean;
  onGenerateSelectedChapter: () => void;
  onRewriteChapter: () => void;
  onExpandChapter: () => void;
  onCompressChapter: () => void;
  onSummarizeChapter: () => void;
  onGenerateTaskSheet: () => void;
  onGenerateSceneCards: () => void;
  onGenerateChapterPlan: () => void;
  onReplanChapter: () => void;
  onRunFullAudit: () => void;
  onCheckContinuity: () => void;
  onCheckCharacterConsistency: () => void;
  onCheckPacing: () => void;
  onAutoRepair: () => void;
  onStrengthenConflict: () => void;
  onEnhanceEmotion: () => void;
  onUnifyStyle: () => void;
  onAddDialogue: () => void;
  onAddDescription: () => void;
  isGeneratingTaskSheet: boolean;
  isGeneratingSceneCards: boolean;
  isSummarizingChapter: boolean;
  reviewActionKind?: "full_audit" | "continuity" | "character_consistency" | "pacing" | null;
  repairActionKind?: "autoRepair" | "expand" | "compress" | "strengthenConflict" | "enhanceEmotion" | "unifyStyle" | "addDialogue" | "addDescription" | null;
  generationActionKind?: "rewrite" | null;
  isReviewingChapter: boolean;
  isRepairingChapter: boolean;
  isGeneratingChapterPlan: boolean;
  isReplanningChapter: boolean;
  isRunningFullAudit: boolean;
  isStreaming: boolean;
  streamingChapterId?: string | null;
  repairStreamingChapterId?: string | null;
  chapterAuditReports: AuditReport[];
  chapterRuntimePackage?: ChapterRuntimePackage | null;
  latestStateSnapshot?: StoryStateSnapshot | null;
  chapterStateSnapshot?: StoryStateSnapshot | null;
  backgroundSyncActivities?: ChapterExecutionBackgroundActivity[];
  chapterRunStatus?: Extract<SSEFrame, { type: "run_status" }> | null;
  repairRunStatus?: Extract<SSEFrame, { type: "run_status" }> | null;
  manualDirectorHandoff?: {
    enabled: boolean;
    isAccepting: boolean;
    onAccept: () => void;
  };
}

function resolvePrimaryAction(params: {
  novelId: string;
  selectedChapter?: Chapter;
  hasCharacters: boolean;
  isGeneratingChapterPlan: boolean;
  isRunningFullAudit: boolean;
  isSelectedChapterStreaming: boolean;
  isSelectedChapterRepairing: boolean;
  onGenerateChapterPlan: () => void;
  onRunFullAudit: () => void;
  onAutoRepair: () => void;
  onGenerateSelectedChapter: () => void;
}): PrimaryAction {
  const {
    novelId,
    selectedChapter,
    hasCharacters,
    isGeneratingChapterPlan,
    isRunningFullAudit,
    isSelectedChapterStreaming,
    isSelectedChapterRepairing,
    onGenerateChapterPlan,
    onRunFullAudit,
    onAutoRepair,
    onGenerateSelectedChapter,
  } = params;

  if (!selectedChapter) {
    return {
      label: "Select a chapter",
      reason: "Select a chapter from the list on the left so the system knows what to help you with next.",
      variant: "default",
      disabled: true,
    };
  }

  if (selectedChapter.chapterStatus === "needs_repair") {
    return {
      label: "Open chapter editor",
      reason: "This chapter already has text. Review findings do not prevent editing; open the editor or use the repair action below.",
      variant: "default",
      href: `/novels/${novelId}/chapters/${selectedChapter.id}`,
    };
  }

  if (
    (selectedChapter.chapterStatus === "pending_review"
      && selectedChapter.generationState !== "reviewed"
      && selectedChapter.generationState !== "approved")
    || selectedChapter.generationState === "drafted"
  ) {
    return {
      label: isRunningFullAudit ? "Running full review…" : "Run full review",
      reason: "The chapter has text. Run a full review before deciding whether to repair or rewrite it.",
      variant: "default",
      ai: true,
      onClick: onRunFullAudit,
      disabled: isRunningFullAudit,
    };
  }

  if (selectedChapter.chapterStatus === "unplanned" || !chapterHasPreparationAssets(selectedChapter)) {
    return {
      label: isGeneratingChapterPlan ? "Generating chapter plan…" : "Generate chapter plan",
      reason: "This chapter needs a clear goal and task sheet. Prepare the execution plan before writing.",
      variant: "default",
      ai: true,
      onClick: onGenerateChapterPlan,
      disabled: isGeneratingChapterPlan,
    };
  }

  if (!selectedChapter.content?.trim() || selectedChapter.chapterStatus === "pending_generation") {
    return {
      label: isSelectedChapterStreaming ? "Writing chapter…" : "Write chapter",
      reason: "The preparation is ready. Generate the chapter text now.",
      variant: "default",
      ai: true,
      onClick: onGenerateSelectedChapter,
      disabled: !hasCharacters || isSelectedChapterStreaming,
    };
  }

  return {
    label: "Open chapter editor",
    reason: "This chapter already has text. Open the editor to revise it or recover work.",
    variant: "default",
    href: `/novels/${novelId}/chapters/${selectedChapter.id}`,
  };
}

export default function ChapterExecutionActionPanel(props: ChapterExecutionActionPanelProps) {
  const {
    novelId,
    selectedChapter,
    hasCharacters,
    strategy,
    onStrategyChange,
    onApplyStrategy,
    isApplyingStrategy,
    onGenerateSelectedChapter,
    onRewriteChapter,
    onExpandChapter,
    onCompressChapter,
    onSummarizeChapter,
    onGenerateTaskSheet,
    onGenerateSceneCards,
    onGenerateChapterPlan,
    onReplanChapter,
    onRunFullAudit,
    onCheckContinuity,
    onCheckCharacterConsistency,
    onCheckPacing,
    onAutoRepair,
    onStrengthenConflict,
    onEnhanceEmotion,
    onUnifyStyle,
    onAddDialogue,
    onAddDescription,
    isGeneratingTaskSheet,
    isGeneratingSceneCards,
    isSummarizingChapter,
    reviewActionKind,
    repairActionKind,
    generationActionKind,
    isReviewingChapter,
    isRepairingChapter,
    isGeneratingChapterPlan,
    isReplanningChapter,
    isRunningFullAudit,
    isStreaming,
    streamingChapterId,
    repairStreamingChapterId,
    chapterAuditReports,
    chapterRuntimePackage,
    latestStateSnapshot,
    chapterStateSnapshot,
    backgroundSyncActivities,
    chapterRunStatus,
    repairRunStatus,
    manualDirectorHandoff,
  } = props;

  const isSelectedChapterStreaming = Boolean(selectedChapter && isStreaming && streamingChapterId === selectedChapter.id);
  const isSelectedChapterRepairing = Boolean(selectedChapter && isRepairingChapter && repairStreamingChapterId === selectedChapter.id);
  const isExecutionContractPending = isGeneratingTaskSheet || isGeneratingSceneCards;
  const runtimePackage = chapterRuntimePackage?.chapterId === selectedChapter?.id ? chapterRuntimePackage : null;
  const displayedStatus = selectedChapter ? resolveDisplayedChapterStatus(selectedChapter) : undefined;

  const selectedChapterLabel = selectedChapter
    ? `Chapter ${selectedChapter.order} ${selectedChapter.title || "Untitled chapter"}`
    : "Select a chapter";

  const primaryAction = resolvePrimaryAction({
    novelId,
    selectedChapter: selectedChapter
      ? {
        ...selectedChapter,
        chapterStatus: displayedStatus ?? selectedChapter.chapterStatus,
      }
      : undefined,
    hasCharacters,
    isGeneratingChapterPlan,
    isRunningFullAudit,
    isSelectedChapterStreaming,
    isSelectedChapterRepairing,
    onGenerateChapterPlan,
    onRunFullAudit,
    onAutoRepair,
    onGenerateSelectedChapter,
  });
  const executionFlow = resolveChapterExecutionFlow({
    selectedChapter,
    chapterAuditReports,
    chapterRuntimePackage: runtimePackage,
    chapterStateSnapshot,
    latestStateSnapshot,
    chapterRunStatus,
    repairRunStatus,
    isStreaming,
    streamingChapterId,
    isRepairStreaming: isRepairingChapter,
    repairStreamingChapterId,
    isRunningFullAudit,
    backgroundActivities: backgroundSyncActivities,
  });

  const showQuickEditorAction = Boolean(selectedChapter && primaryAction.label !== "Open chapter editor");
  const showQuickAuditAction = Boolean(selectedChapter && primaryAction.label !== "Run full review" && primaryAction.label !== "Running full review…");
  const showQuickRepairAction = Boolean(
    selectedChapter
      && (
        displayedStatus === "needs_repair"
        || (
          displayedStatus === "pending_review"
          && (selectedChapter.generationState === "reviewed" || selectedChapter.generationState === "approved")
          && chapterAuditReports.length > 0
        )
      )
      && primaryAction.label !== "Repair issues automatically"
      && primaryAction.label !== "Repairing automatically…",
  );

  return (
    <Card className="self-start overflow-hidden border-border/70 lg:sticky lg:top-4">
      <CardHeader className="gap-3 border-b bg-gradient-to-b from-muted/30 to-background pb-4">
        <div className="space-y-1">
          <CardTitle className="text-base">AI actions</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            The recommended next step is shown first. Other actions are grouped below to keep this panel uncluttered.
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/90 p-3">
          <div className="text-xs text-muted-foreground">Current chapter</div>
          <div className="mt-1 text-sm font-semibold text-foreground">{selectedChapterLabel}</div>
          {selectedChapter ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="secondary">{chapterStatusLabel(displayedStatus ?? selectedChapter.chapterStatus)}</Badge>
              <Badge variant="outline">{chapterSuggestedActionLabel(selectedChapter)}</Badge>
            </div>
          ) : null}
        </div>
        <ChapterExecutionStatusFlow
          stages={executionFlow.stages}
          currentStageKey={executionFlow.currentStage.key}
          currentStageNote={executionFlow.currentStage.note}
        />
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {manualDirectorHandoff?.enabled ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="text-sm font-semibold text-foreground">Hand chapter changes back to Auto Director</div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              You have edited this chapter. After confirmation, Director will use this text as the current result and continue from the next incomplete step.
            </p>
            <Button
              type="button"
              className="mt-3 w-full"
              onClick={manualDirectorHandoff.onAccept}
              disabled={manualDirectorHandoff.isAccepting}
            >
              {manualDirectorHandoff.isAccepting ? "Confirming..." : "Confirm changes and continue"}
            </Button>
          </div>
        ) : null}
        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
          <div className="text-xs text-muted-foreground">Recommended next step</div>
          <div className="mt-2 text-sm leading-6 text-foreground">{primaryAction.reason}</div>
          <div className="mt-3">
            <PrimaryActionButton action={primaryAction} className="w-full" />
          </div>
          <div className="mt-3 grid gap-2">
            {showQuickEditorAction ? (
              <Button asChild variant="outline" className="w-full">
                <Link to={`/novels/${novelId}/chapters/${selectedChapter!.id}`}>Open chapter editor</Link>
              </Button>
            ) : null}
            {showQuickAuditAction ? (
              <AiButton className="w-full" variant="outline" onClick={onRunFullAudit} disabled={!selectedChapter || isReviewingChapter}>
                {isRunningFullAudit ? "Running full review…" : "Run full review"}
              </AiButton>
            ) : null}
            {showQuickRepairAction ? (
              <AiButton className="w-full" variant="secondary" onClick={onAutoRepair} disabled={!selectedChapter || isSelectedChapterRepairing}>
                {isSelectedChapterRepairing && repairActionKind === "autoRepair" ? "Repairing automatically…" : "Repair issues automatically"}
              </AiButton>
            ) : null}
          </div>
          <div className="mt-3 text-xs leading-6 text-muted-foreground">
            If you're unsure what to do, start with the recommended action. More options are available below.
          </div>
        </div>

        <details className="rounded-2xl border border-border/70 p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
            Complete assets and run focused checks
          </summary>
          <div className="mt-3 grid gap-2">
            <AiButton size="sm" variant="outline" onClick={onGenerateTaskSheet} disabled={!selectedChapter || isExecutionContractPending}>
              {isGeneratingTaskSheet ? "Generating task sheet…" : "Generate task sheet"}
            </AiButton>
            <AiButton size="sm" variant="outline" onClick={onGenerateSceneCards} disabled={!selectedChapter || isExecutionContractPending}>
              {isGeneratingSceneCards ? "Generating scene breakdown…" : "Generate scene breakdown"}
            </AiButton>
            <AiButton size="sm" variant="outline" onClick={onSummarizeChapter} disabled={!selectedChapter || isSummarizingChapter}>
              {isSummarizingChapter ? "Generating summary…" : "Generate summary"}
            </AiButton>
            <AiButton size="sm" variant="outline" onClick={onReplanChapter} disabled={!selectedChapter || isReplanningChapter}>
              {isReplanningChapter ? "Updating future plan…" : "Update future chapter plan"}
            </AiButton>
            <AiButton size="sm" variant="outline" onClick={onCheckContinuity} disabled={!selectedChapter || isReviewingChapter}>
              {isReviewingChapter && reviewActionKind === "continuity" ? "Checking continuity…" : "Check continuity"}
            </AiButton>
            <AiButton size="sm" variant="outline" onClick={onCheckCharacterConsistency} disabled={!selectedChapter || isReviewingChapter}>
              {isReviewingChapter && reviewActionKind === "character_consistency" ? "Checking character consistency…" : "Check character consistency"}
            </AiButton>
            <AiButton size="sm" variant="outline" onClick={onCheckPacing} disabled={!selectedChapter || isReviewingChapter}>
              {isReviewingChapter && reviewActionKind === "pacing" ? "Checking pacing…" : "Check pacing"}
            </AiButton>
          </div>
        </details>

        <details className="rounded-2xl border border-border/70 p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
            Refine and enhance
          </summary>
          <div className="mt-3 grid gap-2">
            <AiButton size="sm" variant="outline" onClick={onRewriteChapter} disabled={!hasCharacters || !selectedChapter || isSelectedChapterStreaming}>
              {isSelectedChapterStreaming && generationActionKind === "rewrite" ? "Rewriting chapter…" : "Rewrite chapter"}
            </AiButton>
            <AiButton size="sm" variant="outline" onClick={onExpandChapter} disabled={!selectedChapter || isSelectedChapterRepairing}>
              {isSelectedChapterRepairing && repairActionKind === "expand" ? "Expanding chapter…" : "Expand chapter"}
            </AiButton>
            <AiButton size="sm" variant="outline" onClick={onCompressChapter} disabled={!selectedChapter || isSelectedChapterRepairing}>
              {isSelectedChapterRepairing && repairActionKind === "compress" ? "Condensing chapter…" : "Condense chapter"}
            </AiButton>
            <AiButton size="sm" variant="outline" onClick={onStrengthenConflict} disabled={!selectedChapter || isSelectedChapterRepairing}>
              {isSelectedChapterRepairing && repairActionKind === "strengthenConflict" ? "Strengthening conflict…" : "Strengthen conflict"}
            </AiButton>
            <AiButton size="sm" variant="outline" onClick={onEnhanceEmotion} disabled={!selectedChapter || isSelectedChapterRepairing}>
              {isSelectedChapterRepairing && repairActionKind === "enhanceEmotion" ? "Enhancing emotion…" : "Enhance emotion"}
            </AiButton>
            <AiButton size="sm" variant="outline" onClick={onUnifyStyle} disabled={!selectedChapter || isSelectedChapterRepairing}>
              {isSelectedChapterRepairing && repairActionKind === "unifyStyle" ? "Unifying style…" : "Unify style"}
            </AiButton>
            <AiButton size="sm" variant="outline" onClick={onAddDialogue} disabled={!selectedChapter || isSelectedChapterRepairing}>
              {isSelectedChapterRepairing && repairActionKind === "addDialogue" ? "Adding dialogue…" : "Add dialogue"}
            </AiButton>
            <AiButton size="sm" variant="outline" onClick={onAddDescription} disabled={!selectedChapter || isSelectedChapterRepairing}>
              {isSelectedChapterRepairing && repairActionKind === "addDescription" ? "Adding description…" : "Add description"}
            </AiButton>
          </div>
        </details>

        <details className="rounded-2xl border border-border/70 p-4">
          <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
            Advanced writing strategy
          </summary>
          <div className="mt-2 text-xs leading-6 text-muted-foreground">
            Keep the defaults unless you know this chapter needs a faster pace, stronger conflict, or more creative freedom.
          </div>
          <div className="mt-3 grid gap-3">
            <label htmlFor="chapter-strategy-run-mode" className="space-y-1 text-xs text-muted-foreground">
              <span>Run mode</span>
              <SelectControl
                id="chapter-strategy-run-mode"
                className="w-full rounded-xl border bg-background p-2 text-sm text-foreground"
                value={strategy.runMode}
                onChange={(event) => onStrategyChange("runMode", event.target.value)}
              >
                <option value="fast">Fast</option>
                <option value="polish">Polish</option>
              </SelectControl>
            </label>
            <label htmlFor="chapter-strategy-word-size" className="space-y-1 text-xs text-muted-foreground">
              <span>Length</span>
              <SelectControl
                id="chapter-strategy-word-size"
                className="w-full rounded-xl border bg-background p-2 text-sm text-foreground"
                value={strategy.wordSize}
                onChange={(event) => onStrategyChange("wordSize", event.target.value)}
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </SelectControl>
            </label>
            <label htmlFor="chapter-strategy-conflict" className="space-y-1 text-xs text-muted-foreground">
              <span>Conflict intensity</span>
              <input
                id="chapter-strategy-conflict"
                className="w-full rounded-xl border bg-background p-2 text-sm text-foreground"
                type="number"
                min={0}
                max={100}
                value={strategy.conflictLevel}
                onChange={(event) => onStrategyChange("conflictLevel", Number(event.target.value || 0))}
              />
            </label>
            <label htmlFor="chapter-strategy-pace" className="space-y-1 text-xs text-muted-foreground">
              <span>Pace</span>
              <SelectControl
                id="chapter-strategy-pace"
                className="w-full rounded-xl border bg-background p-2 text-sm text-foreground"
                value={strategy.pace}
                onChange={(event) => onStrategyChange("pace", event.target.value)}
              >
                <option value="slow">Slow</option>
                <option value="balanced">Balanced</option>
                <option value="fast">Fast</option>
              </SelectControl>
            </label>
            <label htmlFor="chapter-strategy-ai-freedom" className="space-y-1 text-xs text-muted-foreground">
              <span>AI creative freedom</span>
              <SelectControl
                id="chapter-strategy-ai-freedom"
                className="w-full rounded-xl border bg-background p-2 text-sm text-foreground"
                value={strategy.aiFreedom}
                onChange={(event) => onStrategyChange("aiFreedom", event.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </SelectControl>
            </label>
            <Button className="w-full" size="sm" onClick={onApplyStrategy} disabled={isApplyingStrategy || !selectedChapter}>
              {isApplyingStrategy ? "Applying strategy…" : "Apply strategy to chapter"}
            </Button>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
