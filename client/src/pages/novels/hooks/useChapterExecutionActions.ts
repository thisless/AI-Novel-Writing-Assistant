import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Chapter, ReviewIssue } from "@ai-novel/shared/types/novel";
import { updateNovelChapter } from "@/api/novel";
import { generateChapterExecutionContract } from "@/api/novel/chapters";
import { generateNovelChapterSummary } from "@/api/novelChapterSummary";
import {
  buildRepairIssue,
  resolveTargetWordCount,
  type ChapterExecutionStrategy,
} from "../chapterExecution.utils";
import { syncNovelWorkflowStageSilently } from "../novelWorkflow.client";

interface UseChapterExecutionActionsArgs {
  novelId: string;
  selectedChapterId: string;
  selectedChapter?: Chapter;
  strategy: ChapterExecutionStrategy;
  reviewIssues: ReviewIssue[];
  onGenerateChapter: () => void;
  onReviewChapter: (kind: "continuity" | "character_consistency" | "pacing") => void;
  onStartRepair: (issues: ReviewIssue[]) => void;
  onMessage: (message: string) => void;
  isGeneratingChapter: boolean;
  isRepairingChapter: boolean;
  invalidateNovelDetail: () => Promise<void>;
}

type ExecutionContractActionKind = "taskSheet" | "sceneCards" | null;
type RepairActionKind =
  | "autoRepair"
  | "expand"
  | "compress"
  | "strengthenConflict"
  | "enhanceEmotion"
  | "unifyStyle"
  | "addDialogue"
  | "addDescription"
  | null;
type GenerationActionKind = "rewrite" | null;

export function useChapterExecutionActions({
  novelId,
  selectedChapterId,
  selectedChapter,
  strategy,
  reviewIssues,
  onGenerateChapter,
  onReviewChapter,
  onStartRepair,
  onMessage,
  isGeneratingChapter,
  isRepairingChapter,
  invalidateNovelDetail,
}: UseChapterExecutionActionsArgs) {
  const [executionContractActionKind, setExecutionContractActionKind] = useState<ExecutionContractActionKind>(null);
  const [repairActionKind, setRepairActionKind] = useState<RepairActionKind>(null);
  const [generationActionKind, setGenerationActionKind] = useState<GenerationActionKind>(null);

  const patchChapterMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateNovelChapter>[2]) => updateNovelChapter(novelId, selectedChapterId, payload),
    onSuccess: async () => {
      await invalidateNovelDetail();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to update chapter.";
      onMessage(message);
    },
  });

  const summarizeChapterMutation = useMutation({
    mutationFn: () => generateNovelChapterSummary(novelId, selectedChapterId),
    onSuccess: async () => {
      await invalidateNovelDetail();
      await syncNovelWorkflowStageSilently({
        novelId,
        stage: "chapter_execution",
        itemLabel: "Chapter summary generated",
        chapterId: selectedChapterId || undefined,
        status: "waiting_approval",
      });
      onMessage("Chapter summary generated with AI.");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to generate chapter summary.";
      onMessage(message);
    },
  });

  const generateExecutionContractMutation = useMutation({
    mutationFn: () => generateChapterExecutionContract(novelId, selectedChapterId),
    onSuccess: async () => {
      await invalidateNovelDetail();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to generate the chapter execution contract.";
      onMessage(message);
    },
    onSettled: () => {
      setExecutionContractActionKind(null);
    },
  });

  useEffect(() => {
    if (!isRepairingChapter) {
      setRepairActionKind(null);
    }
  }, [isRepairingChapter]);

  useEffect(() => {
    if (!isGeneratingChapter) {
      setGenerationActionKind(null);
    }
  }, [isGeneratingChapter]);

  const ensureChapter = (): Chapter | null => {
    if (!selectedChapterId || !selectedChapter) {
      onMessage("Select a chapter first.");
      return null;
    }
    return selectedChapter;
  };

  const applyStrategy = () => {
    const chapter = ensureChapter();
    if (!chapter) {
      return;
    }
    const targetWordCount = resolveTargetWordCount(strategy);
    const revealLevel = Math.max(0, Math.min(100, Math.round(strategy.conflictLevel * 0.75)));
    patchChapterMutation.mutate({
      targetWordCount,
      conflictLevel: strategy.conflictLevel,
      revealLevel,
      chapterStatus: "pending_generation",
    });
    void syncNovelWorkflowStageSilently({
      novelId,
      stage: "chapter_execution",
      itemLabel: "Chapter execution strategy applied",
      chapterId: chapter.id,
      status: "waiting_approval",
    });
    onMessage("Generation strategy applied to the current chapter.");
  };

  const rewriteChapter = () => {
    const chapter = ensureChapter();
    if (!chapter) {
      return;
    }
    setGenerationActionKind("rewrite");
    patchChapterMutation.mutate({
      content: "",
      chapterStatus: "pending_generation",
      repairHistory: `${chapter.repairHistory ?? ""}\n[rewrite] ${new Date().toISOString()}`.trim(),
    });
    void syncNovelWorkflowStageSilently({
      novelId,
      stage: "chapter_execution",
      itemLabel: "Chapter reset and ready to rewrite",
      chapterId: chapter.id,
      status: "waiting_approval",
    });
    onGenerateChapter();
    onMessage("Rewrite process started.");
  };

  const expandChapter = () => {
    if (!ensureChapter()) {
      return;
    }
    setRepairActionKind("expand");
    onStartRepair([
      buildRepairIssue("engagement", "Expand scene details and emotional reactions without changing the main plot events. Increase the length moderately.", "User requested chapter expansion"),
    ]);
    onMessage("Expansion task submitted.");
  };

  const compressChapter = () => {
    if (!ensureChapter()) {
      return;
    }
    setRepairActionKind("compress");
    onStartRepair([
      buildRepairIssue("repetition", "Condense repetitive phrasing while preserving key events and conflict beats. Make the chapter more concise.", "User requested chapter condensation"),
    ]);
    onMessage("Condensing task submitted.");
  };

  const summarizeChapter = () => {
    if (!ensureChapter()) {
      return;
    }
    summarizeChapterMutation.mutate();
  };

  const generateTaskSheet = () => {
    if (!ensureChapter()) {
      return;
    }
    setExecutionContractActionKind("taskSheet");
    generateExecutionContractMutation.mutate(undefined, {
      onSuccess: async (response) => {
        await invalidateNovelDetail();
        const chapterId = response.data?.id ?? selectedChapterId;
        void syncNovelWorkflowStageSilently({
          novelId,
          stage: "chapter_execution",
          itemLabel: "Chapter task sheet refreshed",
          chapterId,
          status: "waiting_approval",
        });
        onMessage("Chapter task sheet refreshed with the backend AI.");
      },
    });
  };

  const generateSceneCards = () => {
    if (!ensureChapter()) {
      return;
    }
    setExecutionContractActionKind("sceneCards");
    generateExecutionContractMutation.mutate(undefined, {
      onSuccess: async (response) => {
        await invalidateNovelDetail();
        const chapterId = response.data?.id ?? selectedChapterId;
        void syncNovelWorkflowStageSilently({
          novelId,
          stage: "chapter_execution",
          itemLabel: "Scene breakdown generated",
          chapterId,
          status: "waiting_approval",
        });
        onMessage("Scene breakdown generated with the backend AI.");
      },
    });
  };

  const checkContinuity = () => {
    if (!ensureChapter()) {
      return;
    }
    onReviewChapter("continuity");
    onMessage("Continuity check complete.");
  };

  const checkCharacterConsistency = () => {
    if (!ensureChapter()) {
      return;
    }
    onReviewChapter("character_consistency");
    onMessage("Character consistency check complete.");
  };

  const checkPacing = () => {
    if (!ensureChapter()) {
      return;
    }
    onReviewChapter("pacing");
    onMessage("Pacing check complete.");
  };

  const autoRepair = () => {
    if (!ensureChapter()) {
      return;
    }
    setRepairActionKind("autoRepair");
    const issues = reviewIssues.length > 0
      ? reviewIssues
      : [buildRepairIssue("coherence", "Fix logic and continuity issues in the chapter, and fill in missing motivations and causal links.", "Default automatic-repair instruction")];
    onStartRepair(issues);
    onMessage("Automatic repair started.");
  };

  const strengthenConflict = () => {
    if (!ensureChapter()) {
      return;
    }
    setRepairActionKind("strengthenConflict");
    onStartRepair([
      buildRepairIssue("pacing", "Increase the intensity of opposition, introduce conflict earlier, and maintain pressure.", "User requested stronger conflict"),
    ]);
    onMessage("Conflict enhancement started.");
  };

  const enhanceEmotion = () => {
    if (!ensureChapter()) {
      return;
    }
    setRepairActionKind("enhanceEmotion");
    onStartRepair([
      buildRepairIssue("engagement", "Deepen the characters' emotional range and tension, highlighting internal and external changes.", "User requested stronger emotion"),
    ]);
    onMessage("Emotional enhancement started.");
  };

  const unifyStyle = () => {
    if (!ensureChapter()) {
      return;
    }
    setRepairActionKind("unifyStyle");
    onStartRepair([
      buildRepairIssue("voice", "Unify the narrative voice and phrasing to keep the style consistent.", "User requested a more consistent style"),
    ]);
    onMessage("Style consistency pass started.");
  };

  const addDialogue = () => {
    if (!ensureChapter()) {
      return;
    }
    setRepairActionKind("addDialogue");
    onStartRepair([
      buildRepairIssue("voice", "Add purposeful dialogue that advances the plot and reduce vague narration.", "User requested more plot-driving dialogue"),
    ]);
    onMessage("Dialogue enhancement started.");
  };

  const addDescription = () => {
    if (!ensureChapter()) {
      return;
    }
    setRepairActionKind("addDescription");
    onStartRepair([
      buildRepairIssue("engagement", "Add setting and action details to make the scene more vivid and immersive.", "User requested more descriptive detail"),
    ]);
    onMessage("Descriptive detail enhancement started.");
  };

  return {
    isPatchingChapter: patchChapterMutation.isPending,
    isGeneratingExecutionContract: generateExecutionContractMutation.isPending,
    isGeneratingTaskSheet: generateExecutionContractMutation.isPending && executionContractActionKind === "taskSheet",
    isGeneratingSceneCards: generateExecutionContractMutation.isPending && executionContractActionKind === "sceneCards",
    isSummarizingChapter: summarizeChapterMutation.isPending,
    repairActionKind,
    generationActionKind,
    applyStrategy,
    rewriteChapter,
    expandChapter,
    compressChapter,
    summarizeChapter,
    generateTaskSheet,
    generateSceneCards,
    checkContinuity,
    checkCharacterConsistency,
    checkPacing,
    autoRepair,
    strengthenConflict,
    enhanceEmotion,
    unifyStyle,
    addDialogue,
    addDescription,
  };
}
