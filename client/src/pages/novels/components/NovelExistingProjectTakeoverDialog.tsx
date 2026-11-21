import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { buildStyleIntentSummary } from "@ai-novel/shared/types/styleEngine";
import type {
  DirectorAutoExecutionPlan,
  DirectorRunMode,
  DirectorTakeoverEntryStep,
  DirectorTakeoverStrategy,
} from "@ai-novel/shared/types/novelDirector";
import { buildFullBookAutopilotExecutionPlan } from "@ai-novel/shared/types/novelDirector";
import { getDirectorTaskSnapshot, getDirectorTakeoverReadiness, startDirectorTakeover } from "@/api/novelDirector";
import {getNovelDetail} from "@/api/novel";
import {getDirectorWorkspaceHref} from "@/lib/novelRoutes";
import { queryKeys } from "@/api/queryKeys";
import { getStyleBindings, getStyleProfiles } from "@/api/styleEngine";
import LLMSelector from "@/components/common/LLMSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import AutoDirectorApprovalStrategyPanel from "@/components/autoDirector/AutoDirectorApprovalStrategyPanel";
import { useLLMStore } from "@/store/llmStore";
import { Switch } from "@/components/ui/switch";
import type { NovelBasicFormState } from "../novelBasicInfo.shared";
import {
  buildTakeoverAutoExecutionDraftFromExecutableRange,
  DirectorAutoExecutionPlanFields,
  buildDirectorAutoExecutionPlanFromDraft,
  buildDirectorAutoExecutionPlanLabel,
  createDefaultDirectorAutoExecutionDraftState,
} from "./directorAutoExecutionPlan.shared";
import {
  buildTakeoverChapterTarget,
  buildTakeoverContinuousTarget,
  buildTakeoverProgressInspection,
  buildTakeoverGuidance,
  findTakeoverPreview,
  formatTakeoverStartError,
  isTakeoverEntryStepAllowedForScope,
  resolveRecommendedTakeoverEntryStep,
} from "./novelExistingProjectTakeoverViewModel";
import TakeoverDiagnosisPanel from "./takeover/TakeoverDiagnosisPanel";
import { useDirectorAutoApprovalDraft } from "./useDirectorAutoApprovalDraft";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";
import SelectControl from "@/components/common/SelectControl";

interface NovelExistingProjectTakeoverDialogProps {
  novelId: string;
  basicForm: NovelBasicFormState;
  triggerVariant?: "default" | "outline" | "secondary";
  defaultEntryStep?: DirectorTakeoverEntryStep;
  workflowTaskId?: string | null;
}

const RUN_MODE_OPTIONS: Array<{ value: DirectorRunMode; label: string; description: string }> = [
  {
    value: "auto_to_ready",
    label: "Prepare for writing",
    description: "AI will prepare the resources needed to write, then let you choose simple or professional production.",
  },
];

const STRATEGY_OPTIONS: Array<{ value: DirectorTakeoverStrategy; label: string; description: string }> = [
  {
    value: "continue_existing",
    label: "Continue existing progress",
    description: "Skip completed assets where possible, fill in missing pieces, or resume the current batch.",
  },
  {
    value: "restart_current_step",
    label: "Regenerate current step",
    description: "Clear the current step's output, then generate it again.",
  },
];

function buildEditRoute(input: {
  novelId: string;
  stage?: string | null;
  chapterId?: string | null;
  volumeId?: string | null;
}): string {
  const search = new URLSearchParams();
  if (input.stage) search.set("stage", input.stage);
  if (input.chapterId) search.set("chapterId", input.chapterId);
  if (input.volumeId) search.set("volumeId", input.volumeId);
  return `/novels/${input.novelId}/edit?${search.toString()}`;
}

export default function NovelExistingProjectTakeoverDialog(props: NovelExistingProjectTakeoverDialogProps) {
  const entry = useQuery({queryKey: queryKeys.novels.detail(props.novelId), queryFn: () => getNovelDetail(props.novelId), enabled: !!props.novelId, retry: false});
  const book = entry.data?.data;
  const directorHref = book?.id === props.novelId ? getDirectorWorkspaceHref(book) : null;
  if (directorHref) return <Button asChild variant={props.triggerVariant ?? "outline"}><Link to={directorHref}>Open Auto Director</Link></Button>;
  if (book?.id === props.novelId && book.workspaceSourceRoute === null) return <LegacyProjectTakeoverDialog {...props}/>;
  return <Button variant={props.triggerVariant ?? "outline"} disabled={entry.isPending || entry.isFetching} onClick={() => void entry.refetch()}>{entry.isPending || entry.isFetching ? "Loading writing workspace…" : "Reload writing workspace"}</Button>;
}

function LegacyProjectTakeoverDialog({
  novelId,
  basicForm,
  triggerVariant = "outline",
  defaultEntryStep = "basic",
  workflowTaskId,
}: NovelExistingProjectTakeoverDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const llm = useLLMStore();
  const [open, setOpen] = useState(false);
  const [runMode, setRunMode] = useState<DirectorRunMode>("auto_to_ready");
  const [selectedEntryStep, setSelectedEntryStep] = useState<DirectorTakeoverEntryStep>(defaultEntryStep);
  const [selectedStrategy, setSelectedStrategy] = useState<DirectorTakeoverStrategy>("continue_existing");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [autoExecutionDraft, setAutoExecutionDraft] = useState(() => createDefaultDirectorAutoExecutionDraftState("takeover"));
  const [autoExecutionDraftTouched, setAutoExecutionDraftTouched] = useState(false);
  const [selectedChapterTargetOrder, setSelectedChapterTargetOrder] = useState<number | null>(null);
  const [selectedStyleProfileId, setSelectedStyleProfileId] = useState("");
  const [postGenerationStyleReviewEnabled, setPostGenerationStyleReviewEnabled] = useState(
    basicForm.postGenerationStyleReviewEnabled,
  );
  const autoApprovalDraft = useDirectorAutoApprovalDraft(open);
  const { reset: resetAutoApprovalDraft } = autoApprovalDraft;

  const readinessQuery = useQuery({
    queryKey: queryKeys.novels.autoDirectorTakeoverReadiness(novelId),
    queryFn: () => getDirectorTakeoverReadiness(novelId),
    enabled: open && Boolean(novelId),
    retry: false,
  });
  const contextTaskId = workflowTaskId?.trim() || "";
  const contextTaskSnapshotQuery = useQuery({
    queryKey: queryKeys.tasks.directorTaskSnapshot(contextTaskId || "none"),
    queryFn: () => getDirectorTaskSnapshot(contextTaskId),
    enabled: open && Boolean(contextTaskId),
    retry: false,
  });
  const styleProfilesQuery = useQuery({
    queryKey: queryKeys.styleEngine.profiles,
    queryFn: getStyleProfiles,
    enabled: open,
  });
  const novelStyleBindingsQuery = useQuery({
    queryKey: queryKeys.styleEngine.bindings(`novel-${novelId}`),
    queryFn: () => getStyleBindings({ targetType: "novel", targetId: novelId }),
    enabled: open && Boolean(novelId),
  });
  const readiness = readinessQuery.data?.data ?? null;
  const contextTaskSnapshot = contextTaskSnapshotQuery.data?.data?.snapshot ?? null;
  const contextTaskIsContinuable = Boolean(
    contextTaskSnapshot?.task
    && ["queued", "running", "waiting_approval"].includes(contextTaskSnapshot.task.status),
  );
  const styleProfiles = styleProfilesQuery.data?.data ?? [];
  const currentNovelStyleBindings = novelStyleBindingsQuery.data?.data ?? [];
  const selectedStyleProfile = useMemo(
    () => styleProfiles.find((item) => item.id === selectedStyleProfileId) ?? null,
    [selectedStyleProfileId, styleProfiles],
  );
  const selectedStyleSummary = useMemo(
    () => buildStyleIntentSummary({
      styleProfile: selectedStyleProfile,
      styleTone: basicForm.styleTone,
    }),
    [basicForm.styleTone, selectedStyleProfile],
  );
  const advancedAutoExecutionPlan: DirectorAutoExecutionPlan | undefined = runMode === "full_book_autopilot"
    ? buildFullBookAutopilotExecutionPlan()
    : runMode === "auto_to_execution"
      ? buildDirectorAutoExecutionPlanFromDraft(autoExecutionDraft, { usage: "takeover" })
      : undefined;
  const quickChapterTarget = useMemo(
    () => buildTakeoverChapterTarget(readiness, contextTaskSnapshot, selectedChapterTargetOrder),
    [contextTaskSnapshot, readiness, selectedChapterTargetOrder],
  );
  const continuousTarget = useMemo(
    () => buildTakeoverContinuousTarget(readiness, contextTaskSnapshot, selectedChapterTargetOrder),
    [contextTaskSnapshot, readiness, selectedChapterTargetOrder],
  );
  const useFullBookAutopilot = !advancedOpen
    && continuousTarget
    && continuousTarget.selectedOrder >= continuousTarget.targetOrder;
  const useRollingTargetAutopilot = !advancedOpen
    && continuousTarget
    && continuousTarget.selectedOrder > continuousTarget.currentWindowEndOrder;
  const effectiveRunMode: DirectorRunMode = useRollingTargetAutopilot
    ? "full_book_autopilot"
    : !advancedOpen && quickChapterTarget
      ? "auto_to_execution"
      : runMode;
  const autoExecutionPlan: DirectorAutoExecutionPlan | undefined = useFullBookAutopilot
    ? buildFullBookAutopilotExecutionPlan()
    : !advancedOpen && quickChapterTarget
      ? quickChapterTarget.plan
      : advancedAutoExecutionPlan;
  const selectedScopeMode = effectiveRunMode === "auto_to_execution" || effectiveRunMode === "full_book_autopilot"
    ? autoExecutionPlan?.mode ?? autoExecutionDraft.mode
    : "book";
  const recommendedEntryStep = resolveRecommendedTakeoverEntryStep(readiness, selectedScopeMode);
  const effectiveEntryStep = advancedOpen ? selectedEntryStep : recommendedEntryStep ?? selectedEntryStep;
  const selectedEntry = readiness?.entrySteps.find((item) => item.step === effectiveEntryStep) ?? null;
  const selectedPreview = findTakeoverPreview(readiness, effectiveEntryStep, selectedStrategy);
  const selectedEntryAllowedForScope = isTakeoverEntryStepAllowedForScope(effectiveEntryStep, selectedScopeMode);
  const takeoverGuidance = buildTakeoverGuidance(
    readiness,
    effectiveEntryStep,
    selectedStrategy,
    effectiveRunMode,
    contextTaskIsContinuable ? contextTaskSnapshot : null,
  );
  const progressInspection = buildTakeoverProgressInspection(readiness, contextTaskSnapshot);
  const readinessErrorMessage = readinessQuery.isError
    ? readinessQuery.error instanceof Error ? readinessQuery.error.message : "Couldn't load takeover status."
    : null;

  const enterCurrentTask = () => {
    setOpen(false);
    navigate(buildEditRoute({
      novelId,
      stage: effectiveEntryStep === "basic" ? "basic" : effectiveEntryStep,
    }));
  };

  useEffect(() => {
    if (!open) {
      setSelectedEntryStep(defaultEntryStep);
      setSelectedStrategy("continue_existing");
      setRunMode("auto_to_ready");
      setAdvancedOpen(false);
      setAutoExecutionDraft(createDefaultDirectorAutoExecutionDraftState("takeover"));
      setAutoExecutionDraftTouched(false);
      setSelectedChapterTargetOrder(null);
      setSelectedStyleProfileId("");
      setPostGenerationStyleReviewEnabled(basicForm.postGenerationStyleReviewEnabled);
      resetAutoApprovalDraft();
    }
  }, [basicForm.postGenerationStyleReviewEnabled, defaultEntryStep, open, resetAutoApprovalDraft]);

  useEffect(() => {
    if (open) {
      setPostGenerationStyleReviewEnabled(basicForm.postGenerationStyleReviewEnabled);
    }
  }, [basicForm.postGenerationStyleReviewEnabled, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const currentBookBinding = currentNovelStyleBindings[0];
    if (currentBookBinding?.styleProfileId) {
      setSelectedStyleProfileId((current) => current || currentBookBinding.styleProfileId);
    }
  }, [currentNovelStyleBindings, open]);

  useEffect(() => {
    if (!open || !quickChapterTarget) {
      return;
    }
    setSelectedChapterTargetOrder((current) => current ?? continuousTarget?.selectedOrder ?? quickChapterTarget.selectedOrder);
  }, [continuousTarget?.selectedOrder, open, quickChapterTarget]);

  useEffect(() => {
    if (!readiness) {
      return;
    }
    const recommendedStep = resolveRecommendedTakeoverEntryStep(readiness, selectedScopeMode);
    if (recommendedStep) {
      setSelectedEntryStep((current) => {
        const currentStep = readiness.entrySteps.find((item) => item.step === current);
        return currentStep?.available && isTakeoverEntryStepAllowedForScope(current, selectedScopeMode)
          ? current
          : recommendedStep;
      });
    }
  }, [readiness, selectedScopeMode]);

  useEffect(() => {
    if (!open || runMode !== "auto_to_execution" || autoExecutionDraftTouched) {
      return;
    }
    const preferredDraft = buildTakeoverAutoExecutionDraftFromExecutableRange(
      readiness?.executableRange,
      selectedStrategy,
    );
    if (!preferredDraft) {
      return;
    }
    setAutoExecutionDraft((current) => ({
      ...preferredDraft,
      autoReview: current.autoReview,
      autoRepair: current.autoReview ? current.autoRepair : false,
    }));
  }, [
    autoExecutionDraftTouched,
    open,
    readiness?.executableRange,
    runMode,
    selectedStrategy,
  ]);

  const startMutation = useMutation({
    mutationFn: async () => startDirectorTakeover({
      novelId,
      entryStep: effectiveEntryStep,
      strategy: selectedStrategy,
      styleProfileId: selectedStyleProfileId || undefined,
      provider: llm.provider,
      model: llm.model,
      temperature: llm.temperature,
      runMode: effectiveRunMode,
      autoExecutionPlan,
      autoApproval: autoApprovalDraft.buildPayload(effectiveRunMode),
      postGenerationStyleReviewEnabled,
    }),
    onSuccess: async (response) => {
      const data = response.data;
      if (!data?.taskId) {
        toast.error("Couldn't start Auto Director because no task information was returned.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.novels.autoDirectorTask(novelId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.novels.detail(novelId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.novels.directorBookAutomation(novelId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.novels.autoDirectorTakeoverReadiness(novelId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.styleEngine.bindings(`novel-${novelId}`) });
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setOpen(false);
      toast.success(
        effectiveRunMode === "full_book_autopilot"
          ? "The Auto Director takeover task was submitted. View full-book progress in Auto Director."
          : effectiveRunMode === "auto_to_execution"
          ? `The Auto Director takeover task was submitted. View progress for ${buildDirectorAutoExecutionPlanLabel(autoExecutionPlan)} in Auto Director.`
          : "The Auto Director takeover task was submitted. View its queue and progress in Auto Director.",
      );
      navigate(buildEditRoute({
        novelId,
        stage: effectiveEntryStep === "basic" ? "basic" : effectiveEntryStep,
      }));
    },
    onError: (error) => {
      toast.error(formatTakeoverStartError(error));
    },
  });
  const startDisabled = startMutation.isPending
    || readinessQuery.isLoading
    || !selectedEntry
    || !selectedEntry.available
    || !selectedEntryAllowedForScope;

  return (
    <>
      <Button type="button" variant={triggerVariant} size="sm" onClick={() => setOpen(true)}>
        Start Auto Director takeover
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={AUTO_DIRECTOR_MOBILE_CLASSES.takeoverDialogContent}>
          <DialogHeader className="shrink-0 border-b bg-gradient-to-r from-primary/[0.06] via-primary/[0.025] to-transparent px-4 pb-4 pr-12 pt-5 text-left sm:px-6 sm:pt-6">
            <DialogTitle>Continue with Auto Director</DialogTitle>
            <DialogDescription>
              AI will review completed work and continue from the best point without regenerating existing assets.
            </DialogDescription>
          </DialogHeader>
          <div className={AUTO_DIRECTOR_MOBILE_CLASSES.dialogBody}>
            <div className="min-w-0 space-y-5">
              <TakeoverDiagnosisPanel
                guidance={takeoverGuidance}
                inspection={progressInspection}
                isLoadingReadiness={readinessQuery.isLoading}
                readinessErrorMessage={readinessErrorMessage}
                isLoadingTaskSnapshot={contextTaskSnapshotQuery.isLoading}
                hasTaskSnapshotError={contextTaskSnapshotQuery.isError}
                hasCurrentTask={Boolean(readiness?.hasActiveTask || contextTaskIsContinuable)}
                chapterTarget={quickChapterTarget}
                continuousTarget={continuousTarget}
                isAdvancedOpen={advancedOpen}
                isStarting={startMutation.isPending}
                startDisabled={startDisabled}
                onEnterCurrentTask={enterCurrentTask}
                onChapterTargetChange={(order) => setSelectedChapterTargetOrder(order)}
                onStart={() => startMutation.mutate()}
              />
              <details
                className="min-w-0 border-t border-border/70 pt-4"
                open={advancedOpen}
                onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
              >
                <summary className="cursor-pointer list-none text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                  Adjust the model, writing style, or starting point?
                </summary>
                <div className="mt-1 text-xs text-muted-foreground">By default, existing assets are preserved and work continues across the recommended range.</div>
                <div className="mt-5 space-y-6">
              <div className="min-w-0 border-t border-border/70 pt-5">
                <div className="text-sm font-medium text-foreground">Model settings</div>
                <div className="mt-3"><LLMSelector /></div>
              </div>
              <div className="min-w-0 border-t border-border/70 pt-5">
                <div className="text-sm font-medium text-foreground">Auto Director run mode</div>
                <div className="mt-3 bg-muted/25 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-foreground">Run AI detection and revision after drafting</div>
                      <div className={`text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                        When enabled, chapter reviews check style and AI-like phrasing. Issues that need correction are revised according to this run's strategy; other suggestions remain as quality reminders.
                      </div>
                    </div>
                    <Switch
                      aria-label="Run AI detection and revision after drafting"
                      checked={postGenerationStyleReviewEnabled}
                      onCheckedChange={setPostGenerationStyleReviewEnabled}
                    />
                  </div>
                </div>
                <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
                  {RUN_MODE_OPTIONS.map((option) => {
                    const active = option.value === runMode;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`rounded-xl border px-3 py-3 text-left transition ${
                          active ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-background hover:border-primary/40"
                        }`}
                        onClick={() => setRunMode(option.value)}
                      >
                        <div className="text-sm font-medium text-foreground">{option.label}</div>
                        <div className={`mt-1 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>{option.description}</div>
                      </button>
                    );
                  })}
                </div>
                {runMode === "auto_to_execution" ? (
                  <>
                    <DirectorAutoExecutionPlanFields
                      draft={autoExecutionDraft}
                      onChange={(patch) => {
                        setAutoExecutionDraftTouched(true);
                        setAutoExecutionDraft((prev) => ({ ...prev, ...patch }));
                      }}
                      usage="takeover"
                    />
                    <AutoDirectorApprovalStrategyPanel
                      enabled={autoApprovalDraft.enabled}
                      approvalPointCodes={autoApprovalDraft.codes}
                      groups={autoApprovalDraft.groups}
                      approvalPoints={autoApprovalDraft.points}
                      onEnabledChange={autoApprovalDraft.setEnabled}
                      onApprovalPointCodesChange={autoApprovalDraft.setCodes}
                    />
                  </>
                ) : null}
                {runMode === "full_book_autopilot" ? (
                  <div className={`mt-3 rounded-md border border-primary/15 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                    <div className="text-sm font-medium text-foreground">Full-book Auto Director takeover</div>
                    <div className="mt-1">
                      Auto Director will take over the project through planning, chapter execution, review, and revision. It stops only if the model is unavailable, a service fails, manuscript protection is triggered, or an unrecoverable risk is detected.
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="min-w-0 border-t border-border/70 pt-5">
                <div className="text-sm font-medium text-foreground">Writing style for this takeover</div>
                <div className={`mt-1 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                  If a default style is linked to the novel, it will be used for this takeover. Early planning uses only a concise summary to avoid disrupting story structure.
                </div>
                <div className="mt-3 space-y-3">
                  <SelectControl
                    className="w-full rounded-md border bg-background p-2 text-sm"
                    value={selectedStyleProfileId}
                    onChange={(event) => setSelectedStyleProfileId(event.target.value)}
                  >
                    <option value="">Use only the style keywords for now</option>
                    {styleProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>{profile.name}</option>
                    ))}
                  </SelectControl>
                  {currentNovelStyleBindings.length > 0 ? (
                    <div className={`bg-muted/25 p-3 text-xs leading-6 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                      Novel's default writing style: {currentNovelStyleBindings
                        .map((binding) => binding.styleProfile?.name ?? binding.styleProfileId)
                        .join(" / ")}
                    </div>
                  ) : null}
                  {selectedStyleSummary?.stageSummaryLines.length ? (
                    <div className={`bg-muted/25 p-3 text-xs leading-6 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                      Style summary for this stage only: {selectedStyleSummary.stageSummaryLines.join("; ")}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="min-w-0 border-t border-border/70 pt-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-foreground">Starting point</div>
                  {readinessQuery.isLoading ? <Badge variant="outline">Loading</Badge> : null}
                </div>
                {readinessQuery.isError ? (
                  <div className={`mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                    {readinessQuery.error instanceof Error ? readinessQuery.error.message : "Couldn't load takeover status."}
                  </div>
                ) : null}

                {readiness ? (
                  <>
                    <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-lg bg-muted/25 p-3">
                        <div className="text-xs text-muted-foreground">Novel-level plan</div>
                        <div className="mt-1 text-sm font-medium text-foreground">{readiness.snapshot.hasStoryMacroPlan ? "Available" : "Not available"}</div>
                      </div>
                      <div className="rounded-lg bg-muted/25 p-3">
                        <div className="text-xs text-muted-foreground">Creative brief</div>
                        <div className="mt-1 text-sm font-medium text-foreground">{readiness.snapshot.hasBookContract ? "Available" : "Not available"}</div>
                      </div>
                      <div className="rounded-lg bg-muted/25 p-3">
                        <div className="text-xs text-muted-foreground">Characters</div>
                        <div className="mt-1 text-sm font-medium text-foreground">{readiness.snapshot.characterCount}</div>
                      </div>
                      <div className="rounded-lg bg-muted/25 p-3">
                        <div className="text-xs text-muted-foreground">Volumes / chapters in current volume</div>
                        <div className="mt-1 text-sm font-medium text-foreground">{readiness.snapshot.volumeCount} / {readiness.snapshot.firstVolumeChapterCount}</div>
                      </div>
                    </div>

                    {readiness.hasActiveTask ? (
                      <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                        <div className="text-sm font-medium text-foreground">An Auto Director task is already active</div>
                        <div className="mt-1 text-sm text-muted-foreground">To avoid taking over the project twice, handle the active task first.</div>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full sm:w-auto"
                            onClick={() => {
                              setOpen(false);
                              navigate(buildEditRoute({
                                novelId,
                                stage: effectiveEntryStep === "basic" ? "basic" : effectiveEntryStep,
                              }));
                            }}
                          >
                            Open active task
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {readiness.entrySteps.map((entry) => {
                            const active = entry.step === selectedEntryStep;
                            const allowedForScope = isTakeoverEntryStepAllowedForScope(entry.step, selectedScopeMode);
                            const disabled = !entry.available || !allowedForScope || startMutation.isPending;
                            return (
                              <button
                                key={entry.step}
                                type="button"
                                disabled={disabled}
                                className={`min-w-0 rounded-xl border px-4 py-4 text-left transition ${
                                  active ? "border-primary bg-primary/10 shadow-sm" : !disabled ? "border-border bg-background hover:border-primary/40" : "border-border/60 bg-muted/20 opacity-70"
                                }`}
                                onClick={() => setSelectedEntryStep(entry.step)}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="break-words text-sm font-medium text-foreground [overflow-wrap:anywhere]">{entry.label}</div>
                                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                                    {entry.recommended ? <Badge>Recommended</Badge> : null}
                                    <Badge variant="outline">{entry.status}</Badge>
                                  </div>
                                </div>
                                <div className={`mt-2 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>{entry.description}</div>
                                <div className={`mt-3 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                                  {allowedForScope ? entry.reason : "This step isn't available for the selected scope. Chapter ranges start with chapter breakdown; volume ranges start with volume strategy."}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
                          {STRATEGY_OPTIONS.map((option) => {
                            const active = option.value === selectedStrategy;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                className={`min-w-0 rounded-xl border px-4 py-4 text-left transition ${
                                  active ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-background hover:border-primary/40"
                                }`}
                                onClick={() => setSelectedStrategy(option.value)}
                              >
                                <div className="break-words text-sm font-medium text-foreground [overflow-wrap:anywhere]">{option.label}</div>
                                <div className={`mt-2 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>{option.description}</div>
                              </button>
                            );
                          })}
                        </div>

                        {selectedEntry ? (
                          <div className="mt-4 min-w-0 bg-muted/25 p-3 sm:p-4">
                            <div className="text-sm font-medium text-foreground">Takeover preview</div>
                            <div className={`mt-2 text-sm text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>{selectedPreview?.summary ?? selectedEntry.reason}</div>
                            <div className={`mt-3 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>{selectedPreview?.effectSummary ?? selectedEntry.description}</div>
                            {selectedPreview ? (
                              <>
                                <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                                  <Badge variant="secondary" className="max-w-full whitespace-normal break-words text-left [overflow-wrap:anywhere]">Current page: {selectedEntry.label}</Badge>
                                  <Badge variant="outline" className="max-w-full whitespace-normal break-words text-left [overflow-wrap:anywhere]">Starting step: {selectedPreview.effectiveStep}</Badge>
                                  <Badge variant="outline" className="max-w-full whitespace-normal break-words text-left [overflow-wrap:anywhere]">Execution stage: {selectedPreview.effectiveStage}</Badge>
                                  {selectedPreview.usesCurrentBatch ? <Badge>Resume current batch</Badge> : null}
                                </div>
                                {readiness.activePipelineJob ? (
                                  <div className={`mt-3 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                                    Active batch: {readiness.activePipelineJob.currentItemLabel || `Range ${readiness.activePipelineJob.startOrder}-${readiness.activePipelineJob.endOrder}`}
                                  </div>
                                ) : null}
                                {readiness.latestCheckpoint?.checkpointType ? (
                                  <div className={`mt-2 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                                    Latest checkpoint: {readiness.latestCheckpoint.checkpointType}
                                    {readiness.latestCheckpoint.chapterOrder ? ` · Chapter ${readiness.latestCheckpoint.chapterOrder}` : ""}
                                  </div>
                                ) : null}
                                {readiness.executableRange ? (
                                  <div className={`mt-2 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                                    Available range: Chapters {readiness.executableRange.startOrder}–{readiness.executableRange.endOrder}
                                    {readiness.executableRange.nextChapterOrder ? ` · Next chapter: ${readiness.executableRange.nextChapterOrder}` : ""}
                                  </div>
                                ) : null}
                                {selectedPreview.skipSteps.length > 0 ? (
                                  <div className={`mt-3 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>Will skip: {selectedPreview.skipSteps.join(" / ")}</div>
                                ) : null}
                                <div className={`mt-3 space-y-1 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                                  {selectedPreview.impactNotes.map((note) => <div key={note}>• {note}</div>)}
                                </div>
                              </>
                            ) : null}
                          </div>
                        ) : null}

                        <div className={AUTO_DIRECTOR_MOBILE_CLASSES.takeoverSubmitBar}>
                          <Button
                            type="button"
                            className={AUTO_DIRECTOR_MOBILE_CLASSES.fullWidthAction}
                            disabled={startMutation.isPending || !selectedEntry || !selectedEntry.available || !selectedEntryAllowedForScope}
                            onClick={() => startMutation.mutate()}
                          >
                            {startMutation.isPending ? "Starting…" : "Start with advanced settings"}
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                ) : null}
              </div>
                </div>
              </details>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
