import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type Dispatch, type SetStateAction } from "react";
import type { VolumeChapterListProgress } from "@ai-novel/shared/types/volumePlanning";
import { isInitializationPlaceholderVolumeWorkspace } from "@ai-novel/shared/types/volumePlanning";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import type {
  VolumeBeatSheet,
  VolumeCritiqueReport,
  VolumePlan,
  VolumePlanDocument,
  VolumePlanningReadiness,
  VolumeRebalanceDecision,
  VolumeStrategyPlan,
} from "@ai-novel/shared/types/novel";
import type { LLMProvider } from "@ai-novel/shared/types/llm";
import {
  generateNovelVolumes,
  getNovelVolumeWorkspace,
  updateNovelVolumes,
  type NovelDetailResponse,
} from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import { syncNovelWorkflowStageSilently } from "../novelWorkflow.client";
import { normalizeVolumeDraft } from "../volumePlan.utils";
import { detailModeLabel } from "../chapterDetailPlanning.shared";
import {
  buildChapterListSuccessMessage,
  type VolumeGenerationPayload,
} from "./useNovelVolumePlanning.actions";
import { serializeVolumeWorkspaceSnapshot } from "./useNovelVolumePlanning.utils";

interface LlmSettings {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
}

interface UseVolumeGenerationMutationArgs {
  novelId: string;
  llm: LlmSettings;
  estimatedChapterCount?: number | null;
  normalizedVolumeDraft: VolumePlan[];
  strategyPlan: VolumeStrategyPlan | null;
  critiqueReport: VolumeCritiqueReport | null;
  beatSheets: VolumeBeatSheet[];
  rebalanceDecisions: VolumeRebalanceDecision[];
  savedWorkspace?: VolumePlanDocument | null;
  readiness: VolumePlanningReadiness;
  userPreferredVolumeCount: number | null;
  forceSystemRecommendedVolumeCount: boolean;
  setVolumeDraft: Dispatch<SetStateAction<VolumePlan[]>>;
  setStrategyPlan: Dispatch<SetStateAction<VolumeStrategyPlan | null>>;
  setCritiqueReport: Dispatch<SetStateAction<VolumeCritiqueReport | null>>;
  setBeatSheets: Dispatch<SetStateAction<VolumeBeatSheet[]>>;
  setRebalanceDecisions: Dispatch<SetStateAction<VolumeRebalanceDecision[]>>;
  setVolumeGenerationMessage: (value: string) => void;
  setStructuredMessage: (value: string) => void;
}

export interface GeneratedVolumeMutationResult {
  generatedResponse: Awaited<ReturnType<typeof generateNovelVolumes>>;
  persistedResponse: Awaited<ReturnType<typeof updateNovelVolumes>>;
  nextDocument: VolumePlanDocument;
  autoSyncedToChapterExecution: boolean;
}

interface VolumeGenerationMutationContext {
  persistedWorkspaceSnapshotBefore: string;
}

class VolumeGenerationAutoSaveError extends Error {
  nextDocument: VolumePlanDocument;

  constructor(message: string, nextDocument: VolumePlanDocument) {
    super(message);
    this.name = "VolumeGenerationAutoSaveError";
    this.nextDocument = nextDocument;
  }
}

function shouldAutoSyncGeneratedScope(scope: VolumeGenerationPayload["scope"]): boolean {
  return scope === "chapter_list" || scope === "volume" || scope === "chapter_detail";
}

function shouldRequestSlimVolumeGenerationResponse(scope: VolumeGenerationPayload["scope"]): boolean {
  return scope === "beat_sheet"
    || scope === "chapter_list"
    || scope === "volume"
    || scope === "rebalance"
    || scope === "chapter_detail";
}

function mergeSavedVolumeDocumentIntoNovelDetail(
  previous: ApiResponse<NovelDetailResponse> | undefined,
  document: VolumePlanDocument,
): ApiResponse<NovelDetailResponse> | undefined {
  if (!previous?.data) {
    return previous;
  }
  return {
    ...previous,
    data: {
      ...previous.data,
      outline: document.derivedOutline,
      structuredOutline: document.derivedStructuredOutline,
      volumes: document.volumes,
      volumeSource: document.source,
      activeVolumeVersionId: document.activeVersionId,
    },
  };
}

function isSlimVolumeGenerationResponse(
  document: Awaited<ReturnType<typeof generateNovelVolumes>>["data"],
): document is VolumePlanDocument & { slimmed: true } {
  return Boolean(document && "slimmed" in document && document.slimmed === true);
}

export function useVolumeGenerationMutation({
  novelId,
  llm,
  estimatedChapterCount,
  normalizedVolumeDraft,
  strategyPlan,
  critiqueReport,
  beatSheets,
  rebalanceDecisions,
  savedWorkspace,
  readiness,
  userPreferredVolumeCount,
  forceSystemRecommendedVolumeCount,
  setVolumeDraft,
  setStrategyPlan,
  setCritiqueReport,
  setBeatSheets,
  setRebalanceDecisions,
  setVolumeGenerationMessage,
  setStructuredMessage,
}: UseVolumeGenerationMutationArgs) {
  const queryClient = useQueryClient();
  const [chapterListProgress, setChapterListProgress] = useState<VolumeChapterListProgress | null>(null);

  const applyWorkspaceDocument = (document: VolumePlanDocument) => {
    setVolumeDraft(document.volumes);
    setStrategyPlan(document.strategyPlan);
    setCritiqueReport(document.critiqueReport);
    setBeatSheets(document.beatSheets);
    setRebalanceDecisions(document.rebalanceDecisions);
  };

  const syncSavedVolumeDocumentToCache = (document: VolumePlanDocument) => {
    queryClient.setQueryData<ApiResponse<NovelDetailResponse> | undefined>(
      queryKeys.novels.detail(novelId),
      (previous) => mergeSavedVolumeDocumentIntoNovelDetail(previous, document),
    );
    queryClient.setQueryData<ApiResponse<VolumePlanDocument>>(
      queryKeys.novels.volumeWorkspace(novelId),
      () => ({
        success: true,
        message: "Volume workspace updated.",
        data: document,
      }),
    );
  };

  const hydratePersistedWorkspace = (document: VolumePlanDocument) => {
    applyWorkspaceDocument(document);
    syncSavedVolumeDocumentToCache(document);
  };

  const mutation = useMutation<
    GeneratedVolumeMutationResult,
    Error,
    VolumeGenerationPayload,
    VolumeGenerationMutationContext
  >({
    onMutate: (): VolumeGenerationMutationContext => {
      setChapterListProgress(null);
      return {
        persistedWorkspaceSnapshotBefore: serializeVolumeWorkspaceSnapshot(
          queryClient.getQueryData<ApiResponse<VolumePlanDocument>>(queryKeys.novels.volumeWorkspace(novelId))?.data
          ?? savedWorkspace
          ?? null,
        ),
      };
    },
    mutationFn: async (payload: VolumeGenerationPayload): Promise<GeneratedVolumeMutationResult> => {
      const requestDraft = normalizeVolumeDraft(payload.draftVolumesOverride ?? normalizedVolumeDraft);
      const autoSyncedToChapterExecution = shouldAutoSyncGeneratedScope(payload.scope);
      const generatedResponse = await generateNovelVolumes(novelId, {
        provider: llm.provider,
        model: llm.model,
        temperature: llm.temperature,
        scope: payload.scope,
        generationMode: payload.generationMode,
        targetVolumeId: payload.targetVolumeId,
        targetBeatKey: payload.targetBeatKey,
        targetChapterId: payload.targetChapterId,
        detailMode: payload.detailMode,
        draftVolumes: requestDraft.length > 0 ? requestDraft : undefined,
        draftWorkspace: {
          novelId,
          workspaceVersion: "v2",
          volumes: requestDraft,
          strategyPlan,
          critiqueReport,
          beatSheets,
          rebalanceDecisions,
          readiness,
          derivedOutline: "",
          derivedStructuredOutline: "",
          source: savedWorkspace?.source ?? "volume",
          activeVersionId: savedWorkspace?.activeVersionId ?? null,
        },
        estimatedChapterCount: typeof estimatedChapterCount === "number" && estimatedChapterCount > 0
          ? estimatedChapterCount
          : undefined,
        userPreferredVolumeCount: userPreferredVolumeCount ?? undefined,
        respectExistingVolumeCount: !isInitializationPlaceholderVolumeWorkspace(requestDraft) && !forceSystemRecommendedVolumeCount && requestDraft.length > 0,
        slimResponse: shouldRequestSlimVolumeGenerationResponse(payload.scope),
      }, payload.scope === "chapter_list" || payload.scope === "volume" ? setChapterListProgress : undefined);
      let nextDocument = generatedResponse.data;
      if (!nextDocument) {
        throw new Error("AI didn't return a volume workspace result.");
      }
      if (isSlimVolumeGenerationResponse(nextDocument)) {
        const latestWorkspaceResponse = await getNovelVolumeWorkspace(novelId);
        if (!latestWorkspaceResponse.data) {
          throw new Error("AI finished generating, but the latest volume workspace couldn't be loaded. Refresh volume planning to continue.");
        }
        nextDocument = latestWorkspaceResponse.data;
        // 精简响应已由服务端保存，并在需要时连接章节执行；重读后不再二次保存。
        return {
          generatedResponse,
          persistedResponse: latestWorkspaceResponse,
          nextDocument,
          autoSyncedToChapterExecution,
        };
      }

      try {
        const persistedResponse = await updateNovelVolumes(novelId, {
          ...nextDocument,
          syncToChapterExecution: autoSyncedToChapterExecution,
        });
        return {
          generatedResponse,
          persistedResponse,
          nextDocument: persistedResponse.data ?? nextDocument,
          autoSyncedToChapterExecution,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI finished generating, but the current volume workspace couldn't be saved.";
        throw new VolumeGenerationAutoSaveError(message, nextDocument);
      }
    },
    onSuccess: async (result, payload) => {
      applyWorkspaceDocument(result.nextDocument);
      if (result.persistedResponse.data) {
        syncSavedVolumeDocumentToCache(result.persistedResponse.data);
      }
      if (result.autoSyncedToChapterExecution) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.novels.detail(novelId) }),
          queryClient.invalidateQueries({ queryKey: queryKeys.novels.chapters(novelId) }),
        ]);
      }

      void syncNovelWorkflowStageSilently({
        novelId,
        stage: payload.scope === "strategy" || payload.scope === "strategy_critique" || payload.scope === "skeleton" || payload.scope === "book"
          ? "volume_strategy"
          : "structured_outline",
        itemLabel: payload.scope === "strategy"
          ? "Volume strategy recommendation updated"
          : payload.scope === "strategy_critique"
            ? "Volume strategy review updated"
            : payload.scope === "skeleton" || payload.scope === "book"
              ? "Volume outline updated"
              : payload.scope === "beat_sheet"
                ? "Current volume beat sheet updated"
                : payload.scope === "chapter_list" || payload.scope === "volume"
                  ? payload.generationMode === "single_beat"
                    ? "Current volume beat-sheet chapters updated and connected to chapter execution"
                    : "Current volume chapter list generated and connected to chapter execution"
                  : payload.scope === "rebalance"
                    ? "Adjacent-volume rebalancing recommendation updated"
                    : result.autoSyncedToChapterExecution
                      ? "Chapter refinement updated and connected to chapter execution"
                      : "Chapter refinement updated",
        checkpointType: payload.scope === "skeleton" || payload.scope === "book"
          ? "volume_strategy_ready"
          : payload.scope === "chapter_list" || payload.scope === "volume"
            ? "chapter_batch_ready"
            : null,
        checkpointSummary: payload.scope === "skeleton" || payload.scope === "book"
          ? "Volume strategy and outline refreshed. You can continue to the beat and chapter breakdown."
          : payload.scope === "chapter_list" || payload.scope === "volume"
            ? payload.generationMode === "single_beat"
              ? "Current volume beat-sheet chapters refreshed. Continue refining or move to chapter execution."
              : "Current volume chapter list is ready. Continue refining or move to chapter execution."
            : undefined,
        volumeId: payload.targetVolumeId,
        chapterId: payload.targetChapterId,
        status: "waiting_approval",
      });

      if (payload.suppressSuccessMessage) {
        return;
      }

      if (payload.scope === "strategy") {
        const message = "Volume strategy recommendation generated and saved. Review it before confirming the volume outline.";
        setVolumeGenerationMessage(message);
        setStructuredMessage(message);
        return;
      }
      if (payload.scope === "strategy_critique") {
        const message = "Volume strategy review complete. Issues and recommendations are in the review panel on the right.";
        setVolumeGenerationMessage(message);
        return;
      }
      if (payload.scope === "skeleton" || payload.scope === "book") {
        const message = "Volume outline generated and saved. The old beat sheet was cleared; generate a new one for the current volume.";
        setVolumeGenerationMessage(message);
        setStructuredMessage(message);
        return;
      }
      if (payload.scope === "beat_sheet") {
        setStructuredMessage("Current volume beat sheet updated and saved. Next, create the chapter list for this volume.");
        return;
      }
      if (payload.scope === "chapter_list" || payload.scope === "volume") {
        setStructuredMessage(buildChapterListSuccessMessage({
          document: result.nextDocument,
          targetVolumeId: payload.targetVolumeId,
          generationMode: payload.generationMode,
          targetBeatKey: payload.targetBeatKey,
          autoSyncedToChapterExecution: result.autoSyncedToChapterExecution,
        }));
        return;
      }
      if (payload.scope === "rebalance") {
        setStructuredMessage("Adjacent-volume rebalancing recommendation updated.");
        return;
      }

      const label = detailModeLabel(payload.detailMode ?? "purpose");
      setStructuredMessage(
        result.autoSyncedToChapterExecution
          ? `${label} was refined by AI and saved. The latest content was also synced to chapter execution.`
          : `${label} was refined by AI and saved.`,
      );
    },
    onError: async (error, payload, context) => {
      if (error instanceof VolumeGenerationAutoSaveError) {
        applyWorkspaceDocument(error.nextDocument);
      }
      const fallbackMessage = error instanceof VolumeGenerationAutoSaveError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Volume plan generation failed.";
      const shouldTryRecoverPersistedWorkspace = !(error instanceof VolumeGenerationAutoSaveError)
        && shouldRequestSlimVolumeGenerationResponse(payload.scope);
      let recoveredMessage: string | null = null;

      if (shouldTryRecoverPersistedWorkspace) {
        try {
          const latestWorkspaceResponse = await getNovelVolumeWorkspace(novelId);
          const latestWorkspace = latestWorkspaceResponse.data ?? null;
          if (latestWorkspace) {
            const persistedWorkspaceSnapshotAfter = serializeVolumeWorkspaceSnapshot(latestWorkspace);
            if (persistedWorkspaceSnapshotAfter !== context?.persistedWorkspaceSnapshotBefore) {
              hydratePersistedWorkspace(latestWorkspace);
              recoveredMessage = payload.scope === "chapter_list" || payload.scope === "volume"
                ? "Restored the latest autosaved progress. Continue from the unfinished beat section."
                : "Restored the latest autosaved progress. Continue generating the current volume.";
            }
          }
        } catch {
          // Ignore recovery fetch failures and keep the original local draft untouched.
        }
      }

      const message = recoveredMessage ?? fallbackMessage;
      if (payload.scope === "strategy" || payload.scope === "strategy_critique" || payload.scope === "skeleton" || payload.scope === "book") {
        setVolumeGenerationMessage(message);
      }
      setStructuredMessage(message);
    },
  });
  return { ...mutation, chapterListProgress };
}
