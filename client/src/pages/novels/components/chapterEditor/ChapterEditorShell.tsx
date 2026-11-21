import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ChapterEditorDiagnosticCard,
  ChapterEditorCursorContinuationRequest,
  ChapterEditorCursorOperation,
  ChapterEditorOperation,
  ChapterEditorRecommendedTask,
  ChapterEditorRevisionScope,
  ChapterEditorTargetRange,
  ChapterEditorWorkspaceResponse,
} from "@ai-novel/shared/types/novel";
import { useCandidateAcceptance, useCandidateReview } from "./review";
import { applySavedRevisionToWorkspace, findRecommendedDiagnostic, removeCompletedDiagnostic } from "./diagnostics";
import {
  readChapterQualityDebtDetails,
  type ChapterQualityDebtDetails,
} from "@ai-novel/shared/types/chapterQualityLoop";
import { AlertTriangle, Loader2, PanelLeftOpen, PanelRightOpen } from "lucide-react";
import { createNovelSnapshot, previewChapterAiRevision, previewChapterCursorContinuation, resolveChapterAuditIssue, reviewNovelChapter, updateNovelChapter } from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useLLMStore } from "@/store/llmStore";
import ChapterEditorDirectorPanel from "./ChapterEditorDirectorPanel";
import ChapterEditorSidebar from "./ChapterEditorSidebar";
import ChapterVersionDrawer from "./ChapterVersionDrawer";
import ChapterTextEditor from "./ChapterTextEditor";
import type {
  ChapterEditorSelectionRange,
  ChapterEditorSessionState,
  ChapterEditorShellProps,
} from "./chapterEditorTypes";
import {
  CHAPTER_EDITOR_CURSOR_OPERATION_LABELS,
  CHAPTER_EDITOR_OPERATION_LABELS,
  buildAiRevisionRequest,
  countEditorWords,
  getSaveStatusLabel,
  getParagraphWindow,
  getParagraphIndicesForRange,
  normalizeChapterContent,
  useChapterDraft,
} from "./document";

const EMPTY_SESSION: ChapterEditorSessionState = {
  sessionId: "",
  scope: "selection",
  targetRange: {
    from: 0,
    to: 0,
    text: "",
  },
  candidates: [],
  activeCandidateId: null,
  status: "idle",
  viewMode: "block",
  mode: "revision",
};

function formatQualityDebtSource(source: string | null): string {
  if (source === "repair_recheck") return "Review after automatic repair";
  if (source === "pipeline_review") return "AI pipeline review";
  if (source === "manual_review") return "Manual review";
  return "Historical quality record";
}

function formatQualityDebtAttempts(details: ChapterQualityDebtDetails): string {
  if (details.repairAttemptsUsed === null) {
    return "Automatic repair count not saved in historical record";
  }
  if (details.repairAttemptsAllowed === 0) {
    return `${details.repairAttemptsUsed} attempts; automatic repair was disabled for this run`;
  }
  return `${details.repairAttemptsUsed}/${details.repairAttemptsAllowed} attempts`;
}

function toSelectionFromRange(
  content: string,
  range?: Pick<ChapterEditorTargetRange, "from" | "to"> | null,
): ChapterEditorSelectionRange | null {
  if (!range) {
    return null;
  }
  if (range.from < 0 || range.to <= range.from || range.to > content.length) {
    return null;
  }
  const text = content.slice(range.from, range.to);
  if (!text.trim()) {
    return null;
  }
  return {
    from: range.from,
    to: range.to,
    text,
  };
}

export default function ChapterEditorShell(props: ChapterEditorShellProps) {
  const {
    novelId,
    chapter,
    workspace,
    workspaceStatus,
    onBack,
    onOpenVersionHistory,
    onRefreshWorkspace,
    isRefreshingWorkspace,
  } = props;
  const llm = useLLMStore();
  const queryClient = useQueryClient();
  const lastPreviewRequestRef = useRef<ReturnType<typeof buildAiRevisionRequest> | null>(null);
  const lastPreviewDiagnosticRef = useRef<ChapterEditorDiagnosticCard | undefined>(undefined);
  const lastContinuationRequestRef = useRef<ChapterEditorCursorContinuationRequest | null>(null);
  const qualityDebtDetails = useMemo(
    () => readChapterQualityDebtDetails(chapter?.riskFlags),
    [chapter?.riskFlags],
  );

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [selection, setSelection] = useState<ChapterEditorSelectionRange | null>(null);
  const [cursorOffset, setCursorOffset] = useState<number | null>(null);
  const [session, setSession] = useState<ChapterEditorSessionState>(EMPTY_SESSION);
  const [revisionScope, setRevisionScope] = useState<ChapterEditorRevisionScope>("selection");
  const [revisionInstruction, setRevisionInstruction] = useState("");
  const [selectedDiagnosticId, setSelectedDiagnosticId] = useState<string | null>(null);
  const [focusRequestKey, setFocusRequestKey] = useState(0);
  const [isVersionDrawerOpen, setIsVersionDrawerOpen] = useState(false);
  const [loadedSnapshotId, setLoadedSnapshotId] = useState<string | null>(null);

  const draft = useChapterDraft({
    novelId,
    chapter: chapter ? { id: chapter.id, content: chapter.content, updatedAt: String(chapter.updatedAt) } : undefined,
    busy: session.status !== "idle",
  });
  const { contentDraft, savedContent, isDirty, hasExternalChange, restored, storageError } = draft;

  useEffect(() => {
    setSaveStatus("idle");
    setSelection(null);
    setCursorOffset(null);
    setSession(EMPTY_SESSION);
    setRevisionInstruction("");
    setRevisionScope("selection");
    setIsVersionDrawerOpen(false);
    setLoadedSnapshotId(null);
    lastPreviewRequestRef.current = null;
    lastPreviewDiagnosticRef.current = undefined;
    setFocusRequestKey(0);
    lastContinuationRequestRef.current = null;
  }, [chapter?.id]);

  useEffect(() => {
    if (!workspace) {
      setSelectedDiagnosticId(null);
      return;
    }
    if (selectedDiagnosticId && !workspace.diagnosticCards.some((card) => card.id === selectedDiagnosticId)) {
      setSelectedDiagnosticId(null);
    }
  }, [selectedDiagnosticId, workspace]);

  const wordCount = useMemo(() => countEditorWords(contentDraft), [contentDraft]);
  const activeCandidate = useMemo(
    () => session.candidates?.find((candidate) => candidate.id === session.activeCandidateId) ?? session.candidates?.[0] ?? null,
    [session.activeCandidateId, session.candidates],
  );
  const selectedDiagnosticCard = useMemo(
    () => workspace?.diagnosticCards.find((card) => card.id === selectedDiagnosticId) ?? null,
    [selectedDiagnosticId, workspace],
  );
  const primaryDiagnosticCard = useMemo(
    () => workspace ? findRecommendedDiagnostic(workspace) ?? workspace.diagnosticCards[0] ?? null : null,
    [workspace],
  );
  const assistantDiagnosticCard = selectedDiagnosticCard
    ?? (!selection && cursorOffset === null && revisionScope === "selection" ? primaryDiagnosticCard : null);
  const actionContext = assistantDiagnosticCard ? "diagnostic" : selection ? "selection" : cursorOffset !== null ? "cursor" : "chapter";
  const selectedDiagnosticSelection = useMemo(
    () => toSelectionFromRange(contentDraft, selectedDiagnosticCard?.anchorRange ?? null),
    [contentDraft, selectedDiagnosticCard?.anchorRange],
  );
  const recommendedTaskSelection = useMemo(
    () => toSelectionFromRange(contentDraft, workspace?.recommendedTask?.anchorRange ?? null),
    [contentDraft, workspace?.recommendedTask?.anchorRange],
  );

  const invalidateChapterQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.novels.detail(novelId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.novels.simpleShelf(novelId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.novels.qualityReport(novelId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.novels.snapshots(novelId) }),
      chapter?.id
        ? queryClient.invalidateQueries({ queryKey: queryKeys.novels.chapterPlan(novelId, chapter.id) })
        : Promise.resolve(),
      chapter?.id
        ? queryClient.invalidateQueries({ queryKey: queryKeys.novels.chapterSnapshots(novelId, chapter.id) })
        : Promise.resolve(),
      chapter?.id
        ? queryClient.invalidateQueries({ queryKey: queryKeys.novels.chapterAuditReports(novelId, chapter.id) })
        : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: queryKeys.novels.latestStateSnapshot(novelId) }),
    ]);
  };

  const leaveEditor = (action?: () => void) => {
    if (isBusy) {
      toast.error("Wait for the current operation to finish before leaving the editor.");
      return;
    }
    if ((isDirty || session.status === "ready") && !window.confirm("Unsaved changes can be restored from your draft. Unaccepted AI candidates will be discarded. Leave the editor?")) {
      return;
    }
    action?.();
  };

  const saveMutation = useMutation({
    mutationFn: async (nextContent: string) => {
      if (!chapter) {
        throw new Error("No chapter is selected.");
      }
      if (loadedSnapshotId) {
        await createNovelSnapshot(novelId, {
          triggerType: "manual",
          label: `chapter-editor:before-version-load:${chapter.order}:${Date.now()}`,
        });
      }
      return updateNovelChapter(novelId, chapter.id, { content: nextContent, expectedUpdatedAt: draft.savedUpdatedAt, expectedContent: draft.savedContent });
    },
    onMutate: () => {
      setSaveStatus("saving");
    },
    onSuccess: async (response, nextContent) => {
      draft.acknowledgeSave(nextContent, { content: response.data?.content, updatedAt: String(response.data?.updatedAt ?? Date.now()) });
      setLoadedSnapshotId(null);
      setSaveStatus("saved");
      await invalidateChapterQueries();
      await props.onChapterSaved?.();
      toast.success("Chapter saved.");
    },
    onError: (error) => {
      setSaveStatus("error");
      toast.error(error instanceof Error ? error.message : "Could not save the chapter.");
    },
  });

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") {
        return;
      }
      event.preventDefault();
      if (chapter && isDirty && !saveMutation.isPending) {
        saveMutation.mutate(contentDraft);
      }
    };
    window.addEventListener("keydown", handleSaveShortcut);
    return () => window.removeEventListener("keydown", handleSaveShortcut);
  }, [chapter, contentDraft, isDirty, saveMutation]);

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!chapter) {
        throw new Error("No chapter is selected.");
      }
      if (isDirty || saveMutation.isPending) {
        throw new Error("Save the manuscript before reviewing it again.");
      }
      return reviewNovelChapter(novelId, chapter.id, {
        provider: llm.provider,
        model: llm.model,
        temperature: 0.1,
        content: savedContent,
      });
    },
    onSuccess: async (response) => {
      await invalidateChapterQueries();
      const assessment = response.data?.qualityAssessment;
      toast.success(assessment?.recommendedAction === "continue"
        ? "Review passed. Chapter issues have been resolved."
        : "Review complete. AI found more items to address.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not review the chapter. Please try again later.");
    },
  });

  const resolveDiagnosticMutation = useMutation({
    mutationFn: async (issueId: string) => resolveChapterAuditIssue(novelId, issueId),
    onSuccess: async (_response, issueId) => {
      if (chapter) {
        queryClient.setQueryData<ApiResponse<ChapterEditorWorkspaceResponse>>(
          queryKeys.novels.chapterEditorWorkspace(novelId, chapter.id),
          (cached) => {
            const card = cached?.data?.diagnosticCards.find((item) => item.sourceIssueId === issueId);
            return cached?.data && card ? { ...cached, data: removeCompletedDiagnostic(cached.data, card) } : cached;
          },
        );
      }
      setSelectedDiagnosticId(null);
      await invalidateChapterQueries();
      onRefreshWorkspace?.();
      toast.success("Issue marked as addressed. Reanalyze the chapter to confirm its status.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update the issue status. Please try again later.");
    },
  });

  const previewMutation = useMutation({
    mutationFn: async (request: ReturnType<typeof buildAiRevisionRequest>) => {
      if (!chapter) {
        throw new Error("No chapter is selected.");
      }
      return previewChapterAiRevision(novelId, chapter.id, request);
    },
    onMutate: (request) => {
      lastPreviewRequestRef.current = request;
      const label = request.source === "freeform"
        ? (request.scope === "chapter" ? "Generating a natural-language revision for the entire chapter" : "Revising the selection based on your instructions")
        : request.presetOperation
          ? `Generating ${CHAPTER_EDITOR_OPERATION_LABELS[request.presetOperation]} plan`
          : "Generating revision plan";
      setSession((current) => ({
        ...current,
        mode: "revision",
        diagnosticCard: lastPreviewDiagnosticRef.current,
        status: "loading",
        requestLabel: label,
        customInstruction: request.instruction,
        scope: request.scope,
        targetRange: request.selection ?? {
          from: 0,
          to: contentDraft.length,
          text: contentDraft,
        },
        candidates: [],
        activeCandidateId: null,
        errorMessage: undefined,
      }));
    },
    onSuccess: (response) => {
      const data = response.data;
      if (!data) {
        setSession((current) => ({
          ...current,
          status: "error",
          errorMessage: "AI did not return a revision. Please try again.",
        }));
        return;
      }
      setSession((current) => ({
        ...data,
        mode: "revision",
        status: "ready",
        viewMode: "block",
        activeCandidateId: data.activeCandidateId ?? data.candidates[0]?.id ?? null,
        requestLabel: current.requestLabel,
        diagnosticCard: current.diagnosticCard,
        errorMessage: undefined,
      }));
      setSelection(null);
    },
    onError: (error) => {
      setSession((current) => ({
        ...current,
        status: "error",
        errorMessage: error instanceof Error ? error.message : "AI revision failed. Please try again.",
      }));
    },
  });

  const continuationMutation = useMutation({
    mutationFn: async (request: ChapterEditorCursorContinuationRequest) => {
      if (!chapter) {
        throw new Error("No chapter is selected.");
      }
      return previewChapterCursorContinuation(novelId, chapter.id, request);
    },
    onMutate: (request) => {
      lastContinuationRequestRef.current = request;
      setSession((current) => ({
        ...current,
        mode: "continuation",
        diagnosticCard: undefined,
        status: "loading",
        requestLabel: `Generating ${CHAPTER_EDITOR_CURSOR_OPERATION_LABELS[request.operation]} plan`,
        continuationOperation: request.operation,
        scope: "selection",
        targetRange: {
          from: request.cursorOffset,
          to: request.cursorOffset,
          text: "",
        },
        candidates: [],
        activeCandidateId: null,
        errorMessage: undefined,
      }));
    },
    onSuccess: (response) => {
      const data = response.data;
      if (!data) {
        setSession((current) => ({ ...current, status: "error", errorMessage: "AI did not return a continuation. Please try again." }));
        return;
      }
      setSession((current) => ({
        ...current,
        ...data,
        mode: "continuation",
        continuationOperation: data.operation,
        status: "ready",
        viewMode: "block",
        activeCandidateId: data.activeCandidateId ?? data.candidates[0]?.id ?? null,
        errorMessage: undefined,
      }));
      setSelection(null);
      setCursorOffset(null);
    },
    onError: (error) => {
      setSession((current) => ({
        ...current,
        status: "error",
        errorMessage: error instanceof Error ? error.message : "AI continuation failed. Please try again.",
      }));
    },
  });

  const review = useCandidateReview(session.sessionId ?? "", session.targetRange?.text ?? "", activeCandidate);
  const acceptMutation = useCandidateAcceptance({
    novelId, chapter, session, candidate: activeCandidate,
    selectedChangeIds: review.selectedChangeIds,
    content: contentDraft,
    sourceSnapshot: session.mode === "continuation"
      ? lastContinuationRequestRef.current?.contentSnapshot : lastPreviewRequestRef.current?.contentSnapshot,
    savedUpdatedAt: draft.savedUpdatedAt,
    savedContent: draft.savedContent,
    acknowledgeSave: draft.acknowledgeSave,
    onAccepted: async ({ nextContent, savedUpdatedAt, fullyAccepted }) => {
      let completedCard = fullyAccepted ? session.diagnosticCard : undefined;
      if (completedCard?.sourceIssueId) {
        try {
          const response = await resolveChapterAuditIssue(novelId, completedCard.sourceIssueId);
          if (!response.success) throw new Error(response.error || "Could not update the issue status.");
        } catch {
          completedCard = undefined;
          toast.error("The manuscript was saved, but the issue status could not be updated. Confirm that it is addressed from the issue card.");
        }
      }
      if (chapter && session.targetRange) {
        queryClient.setQueryData<ApiResponse<ChapterEditorWorkspaceResponse>>(
          queryKeys.novels.chapterEditorWorkspace(novelId, chapter.id),
          (cached) => cached?.data ? {
            ...cached,
            data: applySavedRevisionToWorkspace(cached.data, {
              previousUpdatedAt: draft.savedUpdatedAt,
              savedUpdatedAt,
              previousContent: contentDraft,
              nextContent,
              targetRange: session.targetRange!,
              completedCard,
            }),
          } : cached,
        );
      }
      setSaveStatus("saved");
      setSession(EMPTY_SESSION);
      setRevisionInstruction("");
      setSelectedDiagnosticId(null);
      await invalidateChapterQueries();
      await props.onChapterSaved?.();
      setLoadedSnapshotId(null);
    },
  });

  const isBusy = saveMutation.isPending || previewMutation.isPending || continuationMutation.isPending
    || acceptMutation.isPending || reviewMutation.isPending || resolveDiagnosticMutation.isPending;
  useEffect(() => {
    props.onEditingStateChange?.({ isDirty, isBusy, hasCandidate: session.status === "ready" });
  }, [props.onEditingStateChange, isDirty, isBusy, session.status]);

  const previewPayload = session.status === "loading" && session.targetRange
    ? {
      mode: "loading" as const,
      from: session.targetRange.from,
      to: session.targetRange.to,
      originalText: session.targetRange.text,
    }
    : session.status === "ready" && activeCandidate && session.targetRange && !review.error
      ? {
        mode: session.viewMode,
        from: session.targetRange.from,
        to: session.targetRange.to,
        diffChunks: activeCandidate.diffChunks,
        selectedChangeIds: review.selectedChangeIds,
        originalText: session.targetRange.text,
        candidateText: activeCandidate.content,
      }
      : null;

  if (!chapter) {
    return (
      <div className="rounded-3xl border border-dashed border-border/70 bg-muted/10 p-10 text-center text-sm text-muted-foreground">
        Select a chapter to start editing.
      </div>
    );
  }

  const getSelectionTarget = (
    overrideSelection?: ChapterEditorSelectionRange | null,
    task?: ChapterEditorRecommendedTask | null,
  ) => overrideSelection
    ?? selection
    ?? selectedDiagnosticSelection
    ?? toSelectionFromRange(contentDraft, task?.anchorRange ?? null)
    ?? recommendedTaskSelection
    ?? null;

  const runRevision = (
    source: "preset" | "freeform",
    scope: ChapterEditorRevisionScope,
    options?: {
      presetOperation?: ChapterEditorOperation;
      instruction?: string;
      selectionOverride?: ChapterEditorSelectionRange | null;
      task?: ChapterEditorRecommendedTask | null;
      diagnosticCard?: ChapterEditorDiagnosticCard;
    },
  ) => {
    if (isBusy || session.status !== "idle") {
      toast.error("Accept or reject the current candidate before addressing another issue.");
      return;
    }
    const resolvedSelection = scope === "selection"
      ? getSelectionTarget(options?.selectionOverride, options?.task)
      : null;

    if (scope === "selection" && !resolvedSelection) {
      toast.error("Select text in the manuscript or use an issue card to locate a passage.");
      return;
    }

    const selectedCardMatches = selectedDiagnosticCard?.anchorRange && resolvedSelection
      && selectedDiagnosticCard.anchorRange.from === resolvedSelection.from
      && selectedDiagnosticCard.anchorRange.to === resolvedSelection.to;
    const diagnosticCard = options?.diagnosticCard ?? (selectedCardMatches ? selectedDiagnosticCard! : undefined);
    const request = buildAiRevisionRequest({
      source,
      scope,
      presetOperation: options?.presetOperation,
      instruction: options?.instruction,
      repairBrief: diagnosticCard ? {
        title: diagnosticCard.title,
        problemSummary: diagnosticCard.problemSummary,
        whyItMatters: diagnosticCard.whyItMatters,
        repairGoal: diagnosticCard.repairGoal,
        repairApproach: diagnosticCard.repairApproach,
        mustPreserve: diagnosticCard.mustPreserve,
      } : undefined,
      selection: resolvedSelection,
      content: contentDraft,
      provider: llm.provider,
      model: llm.model,
      temperature: llm.temperature,
    });
    lastPreviewDiagnosticRef.current = diagnosticCard;
    previewMutation.mutate(request);
  };

  const handleRunOperation = (operation: ChapterEditorOperation, customInstruction?: string) => {
    runRevision(
      operation === "custom" ? "freeform" : "preset",
      "selection",
      {
        presetOperation: operation === "custom" ? undefined : operation,
        instruction: customInstruction,
        selectionOverride: selection,
      },
    );
  };

  const handleRunCursorOperation = (operation: ChapterEditorCursorOperation, instruction?: string) => {
    if (isBusy || session.status !== "idle") {
      toast.error("Finish the current operation before generating continuation candidates.");
      return;
    }
    if (cursorOffset === null) {
      toast.error("Place the cursor in the manuscript before choosing a continuation direction.");
      return;
    }
    const normalizedContent = normalizeChapterContent(contentDraft);
    const cursorRange: ChapterEditorSelectionRange = {
      from: cursorOffset,
      to: cursorOffset,
      text: "",
    };
    const request: ChapterEditorCursorContinuationRequest = {
      operation,
      contentSnapshot: normalizedContent,
      cursorOffset,
      context: getParagraphWindow(normalizedContent, cursorRange),
      instruction: instruction?.trim() || undefined,
      provider: llm.provider,
      model: llm.model,
      temperature: llm.temperature,
    };
    continuationMutation.mutate(request);
  };

  const handleGhostSuggest = useCallback(async (content: string, offset: number): Promise<string | null> => {
    if (!chapter) {
      return null;
    }
    try {
      const normalizedContent = normalizeChapterContent(content);
      const response = await previewChapterCursorContinuation(novelId, chapter.id, {
        operation: "continue",
        contentSnapshot: normalizedContent,
        cursorOffset: offset,
        context: getParagraphWindow(normalizedContent, { from: offset, to: offset, text: "" }),
        provider: llm.provider,
        model: llm.model,
        temperature: llm.temperature,
      });
      const data = response.data;
      if (!data) {
        return null;
      }
      const active = data.candidates.find((candidate) => candidate.id === data.activeCandidateId) ?? data.candidates[0];
      return active?.content ?? null;
    } catch {
      return null;
    }
  }, [chapter, llm.model, llm.provider, llm.temperature, novelId]);

  const handleRegenerate = () => {
    if (session.mode === "continuation" && lastContinuationRequestRef.current) {
      continuationMutation.mutate(lastContinuationRequestRef.current);
      return;
    }
    if (!lastPreviewRequestRef.current) {
      return;
    }
    previewMutation.mutate(lastPreviewRequestRef.current);
  };

  const handleReject = () => {
    setSession(EMPTY_SESSION);
  };

  const handleLoadSnapshotContent = (content: string, snapshotId: string) => {
    draft.setContentDraft(content);
    setLoadedSnapshotId(snapshotId);
    setSaveStatus("idle");
    setSession(EMPTY_SESSION);
    setSelection(null);
    setCursorOffset(null);
    setSelectedDiagnosticId(null);
  };

  const handleFocusDiagnostic = (card: ChapterEditorDiagnosticCard) => {
    if (isBusy || session.status !== "idle") return;
    setFocusRequestKey(0);
    if (selectedDiagnosticId === card.id) {
      setSelectedDiagnosticId(null);
      return;
    }
    setSelectedDiagnosticId(card.id);
    setRevisionScope(card.recommendedScope);
    setSelection(null);
    setCursorOffset(null);
  };

  const handleRunDiagnostic = (card: ChapterEditorDiagnosticCard) => {
    if (isBusy || session.status !== "idle") return;
    if (contentDraft !== savedContent || workspace?.chapterMeta.updatedAt !== draft.savedUpdatedAt) {
      toast.error("The manuscript has changed. Save it and reanalyze the chapter to confirm issue locations.");
      return;
    }
    const target = toSelectionFromRange(contentDraft, card.anchorRange ?? null);
    if (card.recommendedScope === "selection" && !target) {
      toast.error("The issue card's location needs to be confirmed. Reanalyze the chapter before addressing it.");
      return;
    }
    flushSync(() => {
      setSelectedDiagnosticId(card.id);
      setSelection(target ?? toSelectionFromRange(contentDraft, { from: 0, to: contentDraft.length }));
      setCursorOffset(null);
      setRevisionScope(card.recommendedScope);
      setFocusRequestKey((current) => current + 1);
    });
    runRevision("preset", card.recommendedScope, {
      presetOperation: card.recommendedAction,
      selectionOverride: target,
      diagnosticCard: card,
      instruction: revisionInstruction.trim() || undefined,
    });
  };


  const handleRunSelectedDiagnostic = () => {
    if (!assistantDiagnosticCard) {
      return;
    }
    handleRunDiagnostic(assistantDiagnosticCard);
  };

  const handleRunFreeform = () => {
    runRevision("freeform", revisionScope, {
      instruction: revisionInstruction.trim(),
    });
  };

  const canRunSelectionRevision = Boolean(getSelectionTarget());
  const headerSaveLabel = getSaveStatusLabel(saveStatus, isDirty);
  const cursorParagraph = cursorOffset !== null
    ? getParagraphIndicesForRange(contentDraft, { from: cursorOffset, to: cursorOffset })
    : null;
  const cursorTargetLabel = cursorParagraph ? `At the cursor in paragraph ${cursorParagraph.startIndex + 1}` : "At the manuscript cursor";
  const [layoutMode, setLayoutMode] = useState<"standard" | "wide" | "immersive">(() => {
    try {
      const saved = globalThis.localStorage?.getItem("ai-novel:chapter-editor:layout:v1");
      return saved === "wide" || saved === "immersive" ? saved : "standard";
    } catch {
      return "standard";
    }
  });

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem("ai-novel:chapter-editor:layout:v1", layoutMode);
    } catch {
      // Best-effort persistence.
    }
  }, [layoutMode]);

  const [panelsCollapsed, setPanelsCollapsed] = useState<{ left: boolean; right: boolean }>(() => {
    try {
      const saved = globalThis.localStorage?.getItem("ai-novel:chapter-editor:panels:v1");
      const parsed = saved ? JSON.parse(saved) as { left?: unknown; right?: unknown } : null;
      return { left: parsed?.left === true, right: parsed?.right === true };
    } catch {
      return { left: false, right: false };
    }
  });

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem("ai-novel:chapter-editor:panels:v1", JSON.stringify(panelsCollapsed));
    } catch {
      // Best-effort persistence.
    }
  }, [panelsCollapsed]);

  // Candidate review always gets the full three-column layout: its accept /
  // reject controls live in the right panel.
  const effectiveLayout = session.status !== "idle" ? "standard" : layoutMode;
  const rightPanelCollapsed = panelsCollapsed.right && session.status === "idle";
  const gridClassName = effectiveLayout === "wide"
    ? "xl:grid-cols-[minmax(0,1fr)_384px]"
    : effectiveLayout === "immersive"
      ? "xl:grid-cols-[minmax(0,1fr)]"
      : panelsCollapsed.left && rightPanelCollapsed
        ? "xl:grid-cols-[44px_minmax(0,1fr)_44px]"
        : panelsCollapsed.left
          ? "xl:grid-cols-[44px_minmax(0,1fr)_400px]"
          : rightPanelCollapsed
            ? "xl:grid-cols-[320px_minmax(0,1fr)_44px]"
            : "xl:grid-cols-[320px_minmax(0,1fr)_400px]";

  const openQualityNotice = () => {
    setLayoutMode("standard");
    setPanelsCollapsed((current) => ({ ...current, left: false }));
  };
  const qualityNotice = qualityDebtDetails ? (
    <section aria-label="Chapter quality notice" className="space-y-3 rounded-xl bg-amber-50 px-3 py-3 text-sm text-amber-950">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
        The manuscript is still usable
      </div>
      <details className="text-xs leading-5 text-amber-900/80">
        <summary className="cursor-pointer font-medium">Quality needs attention · View details</summary>
        <div className="mt-2 space-y-1">
          <p>{qualityDebtDetails.reason || "AI review found an issue in part of the chapter."}</p>
          <p>Source: {formatQualityDebtSource(qualityDebtDetails.source)}</p>
          <p>Automatic repairs: {formatQualityDebtAttempts(qualityDebtDetails)}</p>
        </div>
      </details>
      {isDirty ? <p className="text-xs font-medium">Save the manuscript before asking AI to review it again.</p> : null}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full border-amber-300 bg-white/70 hover:bg-white"
        disabled={isDirty || saveMutation.isPending || reviewMutation.isPending}
        onClick={() => reviewMutation.mutate()}
      >
        {reviewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Review again
      </Button>
    </section>
  ) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {(restored || hasExternalChange || storageError) ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <span>{storageError ? "The browser cannot save a local draft right now. Save your work to the novel." : hasExternalChange ? "A newer version of this chapter was saved. Your draft is still available." : "Restored an unsaved manuscript draft."}</span>
          {hasExternalChange ? <Button size="sm" variant="outline" onClick={draft.loadSavedVersion}>Load latest saved version</Button> : null}
        </div>
      ) : null}
      {effectiveLayout !== "standard" ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 text-sm">
          {props.headerExtra}
          {onBack ? <Button size="sm" variant="outline" onClick={() => leaveEditor(onBack)}>{props.backLabel ?? "Back to chapter execution"}</Button> : null}
          <span className="truncate font-medium">Chapter {chapter.order} · {chapter.title?.trim() || "Untitled chapter"}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{wordCount.toLocaleString("en-US")} characters · {headerSaveLabel}</span>
          <Button size="sm" onClick={() => saveMutation.mutate(contentDraft)} disabled={!isDirty || saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setIsVersionDrawerOpen(true)}>View chapter versions</Button>
          {qualityDebtDetails ? (
            <Button size="sm" variant="ghost" className="text-amber-700 hover:text-amber-800" onClick={openQualityNotice}>
              <AlertTriangle className="mr-1 h-4 w-4" />Quality needs attention
            </Button>
          ) : null}
          {(workspace?.diagnosticCards.length ?? 0) > 0 ? (
            <Button size="sm" variant="ghost" onClick={() => setLayoutMode("standard")}>
              {workspace?.diagnosticCards.length} issues to address · Switch to standard layout
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className={`grid min-h-0 flex-1 gap-4 overflow-y-auto xl:overflow-hidden ${gridClassName}`}>
        {effectiveLayout === "standard" && panelsCollapsed.left ? (
        <div className="order-1 flex min-h-0 flex-col items-center gap-2 py-2 xl:order-none">
          <Button size="icon" variant="ghost" className="h-8 w-8" title="Expand left panel" onClick={() => setPanelsCollapsed((current) => ({ ...current, left: false }))}>
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground" style={{ writingMode: "vertical-rl" }}>Chapter info</span>
          {qualityDebtDetails ? (
            <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600 hover:text-amber-700" title="View chapter quality notice" aria-label="View chapter quality notice" onClick={openQualityNotice}>
              <AlertTriangle className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        ) : effectiveLayout === "standard" ? (
        <div className="order-1 min-h-0 overflow-y-auto xl:order-none">
          <ChapterEditorSidebar
            chapter={chapter}
            workspace={workspace}
            workspaceStatus={workspaceStatus}
            wordCount={wordCount}
            saveStatusLabel={headerSaveLabel}
            isDirty={isDirty}
            isSaving={saveMutation.isPending}
            selectedDiagnosticId={selectedDiagnosticId}
            onBack={onBack ? () => leaveEditor(onBack) : undefined}
            backLabel={props.backLabel}
            onOpenChapterVersions={() => setIsVersionDrawerOpen(true)}
            onOpenVersionHistory={onOpenVersionHistory ? () => leaveEditor(onOpenVersionHistory) : undefined}
            onRefreshWorkspace={onRefreshWorkspace}
            isRefreshingWorkspace={isRefreshingWorkspace}
            onSave={() => saveMutation.mutate(contentDraft)}
            onFocusDiagnostic={handleFocusDiagnostic}
            onRunDiagnostic={handleRunDiagnostic}
            onResolveDiagnostic={(card) => {
              if (card.sourceIssueId) {
                resolveDiagnosticMutation.mutate(card.sourceIssueId);
              }
            }}
            isResolvingDiagnostic={resolveDiagnosticMutation.isPending}
            diagnosticsDisabled={isBusy || session.status !== "idle"}
            onCollapse={() => setPanelsCollapsed((current) => ({ ...current, left: true }))}
            qualityNotice={qualityNotice}
          />
        </div>
        ) : null}

        <div className={`relative order-3 min-h-0 overflow-hidden xl:order-none ${effectiveLayout === "immersive" ? "mx-auto w-full max-w-[880px]" : ""}`}>
          <ChapterTextEditor
            value={contentDraft}
            documentKey={chapter.id}
            onQuickOperation={(operation) => handleRunOperation(operation)}
            onQuickInstruction={(instruction) => handleRunOperation("custom", instruction)}
            onGhostSuggest={handleGhostSuggest}
            ghostSuspended={isBusy || session.status !== "idle"}
            layoutMode={layoutMode}
            onLayoutModeChange={setLayoutMode}
            headerExtra={effectiveLayout === "standard" ? props.headerExtra : undefined}
            diagnosticRanges={(workspace?.diagnosticCards ?? [])
              .map((card) => card.anchorRange)
              .filter((range): range is { from: number; to: number } => Boolean(range))}
            readOnly={session.status !== "idle"}
            onChange={(next) => {
              draft.setContentDraft(next);
              setSaveStatus("idle");
            }}
            onSelectionChange={(nextSelection) => {
              setSelection(nextSelection);
              if (nextSelection) {
                setRevisionScope("selection");
                setFocusRequestKey(0);
                setCursorOffset(null);
                setSelectedDiagnosticId(null);
              }
            }}
            onCursorChange={(offset) => {
              setCursorOffset(offset);
              if (offset !== null) {
                setRevisionScope("selection");
                setFocusRequestKey(0);
                setSelection(null);
                setSelectedDiagnosticId(null);
              }
            }}
            preview={previewPayload}
            focusRequestKey={focusRequestKey}
            focusRange={session.status === "idle"
              ? selection
                ? { from: selection.from, to: selection.to }
                : selectedDiagnosticCard?.anchorRange ?? null
              : null}
          />
        </div>

        {effectiveLayout === "standard" && rightPanelCollapsed ? (
        <div className="order-2 flex min-h-0 flex-col items-center gap-2 py-2 xl:order-none">
          <Button size="icon" variant="ghost" className="h-8 w-8" title="Expand right panel" onClick={() => setPanelsCollapsed((current) => ({ ...current, right: false }))}>
            <PanelRightOpen className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground" style={{ writingMode: "vertical-rl" }}>AI revisions</span>
        </div>
        ) : effectiveLayout !== "immersive" ? (
        <div className="order-2 min-h-0 overflow-hidden xl:order-none">
            <ChapterEditorDirectorPanel
              workspace={workspace}
              workspaceStatus={workspaceStatus}
              selectedDiagnosticCard={assistantDiagnosticCard}
              actionContext={actionContext}
              cursorTargetDescription={cursorTargetLabel}
              selectionTargetDescription={selection ? `${countEditorWords(selection.text).toLocaleString("en-US")} characters selected` : ""}
              session={session}
              activeCandidate={activeCandidate}
              diffChanges={review.changes}
              selectedDiffChangeIds={review.selectedChangeIds}
              reviewError={review.error}
              hasSelectedChanges={review.resultText !== session.targetRange?.text}
              revisionScope={revisionScope}
              revisionInstruction={revisionInstruction}
              canRunSelectionRevision={canRunSelectionRevision}
              isGenerating={isBusy}
              isApplying={acceptMutation.isPending}
              onInstructionChange={setRevisionInstruction}
              onScopeChange={(scope) => {
                setRevisionScope(scope);
                if (scope === "chapter") {
                  setSelection(null);
                  setCursorOffset(null);
                  setSelectedDiagnosticId(null);
                  setFocusRequestKey(0);
                }
              }}
              onRunCursorOperation={(operation) => handleRunCursorOperation(operation, revisionInstruction)}
              onRunSelectionOperation={(operation) => handleRunOperation(operation, revisionInstruction.trim() || undefined)}
              onRunSelectedDiagnostic={handleRunSelectedDiagnostic}
              onRunFreeform={handleRunFreeform}
              onSelectCandidate={(candidateId) => setSession((current) => ({ ...current, activeCandidateId: candidateId }))}
              onSelectAllChanges={review.selectAll}
              onToggleDiffChange={review.toggleChange}
              onChangeViewMode={(mode) => setSession((current) => ({ ...current, viewMode: mode }))}
              onAccept={() => acceptMutation.mutate()}
              onReject={handleReject}
              onRegenerate={handleRegenerate}
              onCollapse={effectiveLayout === "standard" ? () => setPanelsCollapsed((current) => ({ ...current, right: true })) : undefined}
            />
        </div>
        ) : null}
      </div>
      <ChapterVersionDrawer
        novelId={novelId}
        chapterId={chapter.id}
        chapterTitle={chapter.title}
        open={isVersionDrawerOpen}
        onOpenChange={setIsVersionDrawerOpen}
        currentContent={contentDraft}
        isDirty={isDirty}
        onLoadContent={handleLoadSnapshotContent}
      />
    </div>
  );
}
