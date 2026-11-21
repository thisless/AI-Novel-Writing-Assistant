import { useState } from "react";
import { useMutation, type QueryClient } from "@tanstack/react-query";
import type { ReviewIssue, Chapter, StoryStateSnapshot, StoryPlan } from "@ai-novel/shared/types/novel";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { generateChapterPlan, replanNovel, reviewNovelChapter } from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import type { ChapterExecutionStrategy } from "../chapterExecution.utils";
import type { ChapterReviewResult } from "../chapterPlanning.shared";
import { useChapterExecutionActions } from "./useChapterExecutionActions";

interface StreamHandle {
  start: (path: string, payload: Record<string, unknown>) => Promise<void> | void;
  abort: () => void;
  isStreaming: boolean;
  content: string;
}

interface UseNovelEditChapterRuntimeArgs {
  novelId: string;
  llm: {
    provider?: LLMProvider;
    model?: string;
    temperature?: number;
  };
  selectedChapterId: string;
  selectedChapter?: Chapter;
  chapterStrategy: ChapterExecutionStrategy;
  reviewResult: ChapterReviewResult | null;
  openAuditIssueIds: string[];
  queryClient: QueryClient;
  invalidateNovelDetail: () => Promise<void>;
  setChapterOperationMessage: (value: string) => void;
  setReviewResult: (value: ChapterReviewResult | null) => void;
  setRepairBeforeContent: (value: string) => void;
  setRepairAfterContent: (value: string) => void;
  setActiveChapterStream: (value: { chapterId: string; chapterLabel: string } | null) => void;
  setActiveRepairStream: (value: { chapterId: string; chapterLabel: string } | null) => void;
  chapterSSE: StreamHandle;
  repairSSE: StreamHandle;
}

export type ChapterReviewActionKind =
  | "full_audit"
  | "continuity"
  | "character_consistency"
  | "pacing"
  | null;

export function useNovelEditChapterRuntime({
  novelId,
  llm,
  selectedChapterId,
  selectedChapter,
  chapterStrategy,
  reviewResult,
  openAuditIssueIds,
  queryClient,
  invalidateNovelDetail,
  setChapterOperationMessage,
  setReviewResult,
  setRepairBeforeContent,
  setRepairAfterContent,
  setActiveChapterStream,
  setActiveRepairStream,
  chapterSSE,
  repairSSE,
}: UseNovelEditChapterRuntimeArgs) {
  const [reviewActionKind, setReviewActionKind] = useState<ChapterReviewActionKind>(null);

  const generateChapterPlanMutation = useMutation({
    mutationFn: () => generateChapterPlan(novelId, selectedChapterId, {
      provider: llm.provider,
      model: llm.model,
      temperature: llm.temperature,
    }),
    onSuccess: async () => {
      setChapterOperationMessage("Chapter execution plan generated. You can start drafting now.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.novels.chapterPlan(novelId, selectedChapterId) }),
        invalidateNovelDetail(),
      ]);
    },
  });

  const replanChapterMutation = useMutation({
    mutationFn: () => replanNovel(novelId, {
      chapterId: selectedChapterId,
      reason: "manual_replan_from_chapter_tab",
      triggerType: "manual",
      sourceIssueIds: openAuditIssueIds,
      windowSize: 3,
      provider: llm.provider,
      model: llm.model,
      temperature: llm.temperature,
    }),
    onSuccess: async (response) => {
      const affectedOrders = response.data?.affectedChapterOrders ?? [];
      const affectedChapterIds = response.data?.affectedChapterIds ?? [];
      setChapterOperationMessage(
        affectedOrders.length > 0
          ? `Replanned Chapters ${affectedOrders.join(", ")}.`
          : "Chapter replanning complete.",
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.novels.detail(novelId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.novels.qualityReport(novelId) });
      await Promise.all(
        affectedChapterIds.map((chapterId) =>
          queryClient.invalidateQueries({ queryKey: queryKeys.novels.chapterPlan(novelId, chapterId) })),
      );
      if (selectedChapterId) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.novels.chapterPlan(novelId, selectedChapterId) });
      }
    },
  });

  const fullAuditMutation = useMutation({
    mutationFn: () => reviewNovelChapter(novelId, selectedChapterId, {
      provider: llm.provider,
      model: llm.model,
      temperature: 0.1,
    }),
    onSuccess: async (response) => {
      setReviewResult(response.data ?? null);
      setChapterOperationMessage("Full review complete.");
      await Promise.all([
        invalidateNovelDetail(),
        queryClient.invalidateQueries({ queryKey: queryKeys.novels.simpleShelf(novelId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.novels.chapterEditorWorkspace(novelId, selectedChapterId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.novels.chapterAuditReports(novelId, selectedChapterId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.novels.qualityReport(novelId) }),
      ]);
    },
    onSettled: () => {
      setReviewActionKind(null);
    },
  });

  const runChapterReview = (kind: Exclude<ChapterReviewActionKind, null>) => {
    setReviewActionKind(kind);
    fullAuditMutation.mutate();
  };

  const handleGenerateSelectedChapter = () => {
    if (!selectedChapter) {
      return;
    }
    setChapterOperationMessage("Drafting this chapter...");
    setActiveChapterStream({
      chapterId: selectedChapter.id,
      chapterLabel: `Chapter ${selectedChapter.order}: ${selectedChapter.title || "Untitled chapter"}`,
    });
    void chapterSSE.start(`/novels/${novelId}/chapters/${selectedChapter.id}/generate`, {
      provider: llm.provider,
      model: llm.model,
      previousChaptersSummary: [],
    });
  };

  const handleAbortChapterStream = () => {
    chapterSSE.abort();
    setChapterOperationMessage("Chapter generation stopped. You can keep reviewing the current output or start drafting this chapter again.");
  };

  const handleAbortRepair = () => {
    repairSSE.abort();
    setActiveRepairStream(null);
    setChapterOperationMessage("Chapter repair stopped. Review the current result before deciding whether to continue.");
  };

  const startChapterRepair = (issues: ReviewIssue[]) => {
    if (!selectedChapterId) {
      setChapterOperationMessage("Select a chapter first.");
      return;
    }
    setChapterOperationMessage("Generating a repaired draft...");
    setRepairBeforeContent(selectedChapter?.content ?? "");
    setRepairAfterContent("");
    setActiveRepairStream({
      chapterId: selectedChapterId,
      chapterLabel: selectedChapter ? `Chapter ${selectedChapter.order}: ${selectedChapter.title || "Untitled chapter"}` : "Current chapter",
    });
    void repairSSE.start(`/novels/${novelId}/chapters/${selectedChapterId}/repair`, {
      provider: llm.provider,
      model: llm.model,
      reviewIssues: issues,
      auditIssueIds: openAuditIssueIds,
    });
  };

  const chapterExecutionActions = useChapterExecutionActions({
    novelId,
    selectedChapterId,
    selectedChapter,
    strategy: chapterStrategy,
    reviewIssues: reviewResult?.issues ?? [],
    onGenerateChapter: handleGenerateSelectedChapter,
    onReviewChapter: runChapterReview,
    onStartRepair: startChapterRepair,
    onMessage: setChapterOperationMessage,
    isGeneratingChapter: chapterSSE.isStreaming,
    isRepairingChapter: repairSSE.isStreaming,
    invalidateNovelDetail,
  });

  return {
    generateChapterPlanMutation,
    replanChapterMutation,
    fullAuditMutation,
    reviewActionKind,
    runChapterReview,
    handleGenerateSelectedChapter,
    handleAbortChapterStream,
    handleAbortRepair,
    startChapterRepair,
    chapterExecutionActions,
  };
}
