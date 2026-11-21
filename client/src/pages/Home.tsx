import type { MouseEvent } from "react";
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { continueNovelWorkflow } from "@/api/novelWorkflow";
import { getNovelList } from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import { getTaskOverview } from "@/api/tasks";
import { Button } from "@/components/ui/button";
import {
  canContinueDirector,
  canContinueChapterBatchAutoExecution,
  canEnterChapterExecution,
  getCandidateSelectionLink,
  requiresCandidateSelection,
} from "@/lib/novelWorkflowTaskUi";
import { toast } from "@/components/ui/toast";
import { resolveWorkflowContinuationFeedback } from "@/lib/novelWorkflowContinuation";
import { getDirectorWorkspaceHref, getNovelEditHref } from "@/lib/novelRoutes";
import {
  buildHomeAssetHealthItems,
  buildHomeMetrics,
  buildHomeNextAction,
  HOME_NOVEL_FETCH_LIMIT,
  getHomeNovelTask,
  selectPrimaryNovel,
  type HomeNovelItem,
} from "./home/homeViewModel";
import { HomeAssetHealth } from "./home/components/HomeAssetHealth";
import { HomeNextActionPanel } from "./home/components/HomeNextActionPanel";
import { HomeStatusStrip } from "./home/components/HomeStatusStrip";
import CreationSetupNotice from "@/components/onboarding/CreationSetupNotice";
import FirstNovelJourneyStrip from "@/components/onboarding/FirstNovelJourneyStrip";

export default function Home() {
  const queryClient = useQueryClient();

  const taskQuery = useQuery({
    queryKey: queryKeys.tasks.overview,
    queryFn: getTaskOverview,
    staleTime: 30_000,
    refetchInterval: (query) => {
      const overview = query.state.data?.data;
      return (overview?.queuedCount ?? 0) > 0 || (overview?.runningCount ?? 0) > 0 ? 4000 : false;
    },
  });

  const novelQuery = useQuery({
    queryKey: queryKeys.novels.list(1, HOME_NOVEL_FETCH_LIMIT),
    queryFn: () => getNovelList({ page: 1, limit: HOME_NOVEL_FETCH_LIMIT }),
    staleTime: 30_000,
    refetchInterval: (query) => query.state.data?.data?.items.some(novel =>
      ["queued", "running"].includes(novel.bookProgress?.director?.status ?? "")) ? 4000 : false,
  });

  const continueWorkflowMutation = useMutation({
    mutationFn: async (input: {
      taskId: string;
      mode?: "resume" | "auto_execute_range";
    }) => continueNovelWorkflow(input.taskId, input.mode ? { continuationMode: input.mode } : undefined),
    onSuccess: async (response, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.novels.all }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
      const feedback = resolveWorkflowContinuationFeedback(response.data, {
        mode: input.mode,
      });
      if (feedback.tone === "error") {
        toast.error(feedback.message);
        return;
      }
      toast.success(feedback.message);
    },
    onError: (error, input) => {
      toast.error(
        error instanceof Error
          ? error.message
          : input.mode === "auto_execute_range"
            ? "Could not continue the current chapter range."
            : "Could not continue Auto Director.",
      );
    },
  });

  const allNovels = novelQuery.data?.data?.items ?? [];
  const hasNovels = allNovels.length > 0;
  const taskOverview = taskQuery.data?.data ?? null;
  const primaryNovel = useMemo(() => selectPrimaryNovel(allNovels), [allNovels]);
  const nextAction = useMemo(() => buildHomeNextAction(primaryNovel), [primaryNovel]);
  const metrics = useMemo(
    () => buildHomeMetrics({ novels: allNovels, taskOverview }),
    [allNovels, taskOverview],
  );
  const assetHealthItems = useMemo(
    () => buildHomeAssetHealthItems(allNovels),
    [allNovels],
  );

  const stopCardClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const renderNovelPrimaryAction = (
    novel: HomeNovelItem,
    options?: {
      size?: "default" | "sm" | "lg";
      stopPropagation?: boolean;
    },
  ) => {
    const { size = "sm", stopPropagation = false } = options ?? {};
    const task = getHomeNovelTask(novel);
    const isWorkflowPending = continueWorkflowMutation.isPending
      && continueWorkflowMutation.variables?.taskId === task?.id;

    const handleActionClick = (event: MouseEvent<HTMLElement>) => {
      if (stopPropagation) {
        stopCardClick(event);
      }
    };

    const directorRoute = getDirectorWorkspaceHref(novel);
    if (novel.narrativeForm !== "short_story" && (novel.directorVersion === "v2" || directorRoute)) {
      return directorRoute ? (
        <Button asChild size={size}><Link to={directorRoute} onClick={stopPropagation ? stopCardClick : undefined}>Open Auto Director</Link></Button>
      ) : <Button size={size} onClick={() => void novelQuery.refetch()}>Reload writing workspace</Button>;
    }

    if (novel.narrativeForm === "short_story") {
      return (
        <Button asChild size={size}>
          <Link
            to={`/novels/${novel.id}/story`}
            onClick={stopPropagation ? stopCardClick : undefined}
          >
            Open story
          </Link>
        </Button>
      );
    }

    if (canContinueChapterBatchAutoExecution(task)) {
      return (
        <Button
          size={size}
          onClick={(event) => {
            handleActionClick(event);
            if (!task) {
              return;
            }
            continueWorkflowMutation.mutate({
              taskId: task.id,
              mode: "auto_execute_range",
            });
          }}
          disabled={isWorkflowPending}
        >
          {isWorkflowPending ? "Continuing…" : (task?.resumeAction ?? `Continue automatic execution${task?.executionScopeLabel ?? " for the current chapter range"}`)}
        </Button>
      );
    }

    if (canContinueDirector(task)) {
      return (
        <Button
          size={size}
          onClick={(event) => {
            handleActionClick(event);
            if (!task) {
              return;
            }
            continueWorkflowMutation.mutate({
              taskId: task.id,
            });
          }}
          disabled={isWorkflowPending}
        >
          {isWorkflowPending ? "Continuing…" : (task?.resumeAction ?? "Continue Auto Director")}
        </Button>
      );
    }

    if (requiresCandidateSelection(task)) {
      return (
        <Button asChild size={size}>
          <Link
            to={getCandidateSelectionLink(task!.id)}
            onClick={stopPropagation ? stopCardClick : undefined}
          >
            {task!.resumeAction ?? "Confirm the novel's direction"}
          </Link>
        </Button>
      );
    }

    if (canEnterChapterExecution(task)) {
      return (
        <Button asChild size={size}>
          <Link
            to={`/novels/${novel.id}/edit`}
            onClick={stopPropagation ? stopCardClick : undefined}
          >
            Start writing chapters
          </Link>
        </Button>
      );
    }

    if (task) {
      return (
        <Button asChild size={size}>
          <Link
            to={getNovelEditHref(novel.id)}
            onClick={stopPropagation ? stopCardClick : undefined}
          >
            View progress
          </Link>
        </Button>
      );
    }

    return (
      <Button asChild size={size}>
        <Link
          to={`/novels/${novel.id}/edit`}
          onClick={stopPropagation ? stopCardClick : undefined}
        >
          Edit novel
        </Link>
      </Button>
    );
  };

  return (
    <div className="home-workbench space-y-6">
      <CreationSetupNotice />
      <FirstNovelJourneyStrip />
      <HomeNextActionPanel
        action={nextAction}
        primaryNovel={primaryNovel}
        loading={novelQuery.isPending}
        error={novelQuery.isError}
        onRetry={() => void novelQuery.refetch()}
        renderNovelPrimaryAction={renderNovelPrimaryAction}
      />

      <HomeStatusStrip
        metrics={metrics}
        pending={novelQuery.isPending || taskQuery.isPending}
      />

      <HomeAssetHealth items={assetHealthItems} showStarterActions={hasNovels} />
    </div>
  );
}
