import { useEffect, useState } from "react";
import AiButton from "@/components/common/AiButton";
import TensionCurvePanel, { type TensionCurveSeries, type TensionCurveViewportOption } from "@/components/tensionCurve/TensionCurvePanel";
import { TensionCurveEditDialog } from "@/components/tensionCurve/TensionCurveEditDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getStructuredOutlineWorkspaceDefaults,
  useStructuredOutlineWorkspaceStore,
} from "../stores/useStructuredOutlineWorkspaceStore";
import { hasChapterExecutionDetail } from "../chapterDetailPlanning.shared";
import { findBeatSheet } from "../volumePlan.utils";
import StructuredBeatSheetCard from "./StructuredBeatSheetCard";
import StructuredChapterListCard from "./StructuredChapterListCard";
import StructuredChapterDetailCard from "./StructuredChapterDetailCard";
import WorldInjectionHint from "./WorldInjectionHint";
import {
  chapterMatchesBeat,
  findChapterBeat,
  formatBeatDisplayLabel,
  getBeatSheetRequiredChapterCount,
} from "./structuredOutlineWorkspace.shared";
import type { StructuredTabViewProps } from "./NovelEditView.types";

type StructuredVolume = StructuredTabViewProps["volumes"][number];
type StructuredChapter = StructuredVolume["chapters"][number];
type StructuredBeat = StructuredTabViewProps["beatSheets"][number]["beats"][number];

function actionLabel(action: StructuredTabViewProps["syncPreview"]["items"][number]["action"]) {
  if (action === "create") return "Create";
  if (action === "update") return "Update";
  if (action === "move") return "Move";
  if (action === "keep") return "Keep";
  if (action === "delete") return "Delete";
  return "Delete candidate";
}

function getWorkspaceGuidance(params: {
  locked: boolean;
  selectedBeat: StructuredBeat | null;
  selectedChapter: StructuredChapter | null;
  visibleChapterCount: number;
  totalChapterCount: number;
}): string {
  const { locked, selectedBeat, selectedChapter, visibleChapterCount, totalChapterCount } = params;
  if (locked) {
    return "Generate a beat sheet for this volume to align its pacing with the chapter breakdown.";
  }
  if (selectedBeat) {
    const beatLabel = formatBeatDisplayLabel(selectedBeat);
    return selectedChapter
      ? `Focused on “${beatLabel}.” Showing ${visibleChapterCount} chapters; refining Chapter ${selectedChapter.chapterOrder}.`
      : `Focused on “${beatLabel}.” Showing ${visibleChapterCount} chapters; select a chapter on the left to refine it.`;
  }
  return `Showing all ${totalChapterCount} chapters in this volume. Select a beat to focus on its chapters before refining them.`;
}

function chapterMatchesSelection(chapter: StructuredChapter, selectedId: string): boolean {
  return chapter.id === selectedId || chapter.chapterId === selectedId;
}

export default function StructuredOutlineWorkspace(props: StructuredTabViewProps) {
  const {
    novelId,
    directorTakeoverEntry,
    worldInjectionSummary,
    hasCharacters,
    hasUnsavedVolumeDraft,
    generationNotice,
    readiness,
    strategyPlan,
    beatSheets,
    rebalanceDecisions,
    isGeneratingBeatSheet,
    onGenerateBeatSheet,
    isGeneratingChapterList,
    chapterListProgress,
    generatingChapterListVolumeId,
    generatingChapterListBeatKey,
    generatingChapterListMode,
    onGenerateChapterList,
    isGeneratingChapterDetail,
    isGeneratingChapterDetailBundle,
    generatingChapterDetailMode,
    generatingChapterDetailChapterId,
    chapterDetailFailure,
    onGenerateChapterDetail,
    onGenerateChapterDetailBundle,
    onRetryFailedChapterDetail,
    onGoToCharacterTab,
    volumes,
    chapters: executionChapters,
    draftText,
    syncPreview,
    syncOptions,
    onSyncOptionsChange,
    onApplySync,
    isApplyingSync,
    syncMessage,
    onChapterFieldChange,
    onChapterNumberChange,
    onChapterPayoffRefsChange,
    onRemoveChapter,
    onMoveChapter,
    onApplyBatch,
    onSave,
    isSaving,
  } = props;

  const workspaceId = novelId || "draft-structured-outline";
  const defaultVolumeId = volumes[0]?.id ?? "";
  const defaultChapterId = volumes[0]?.chapters[0]?.id ?? "";
  const ensureWorkspace = useStructuredOutlineWorkspaceStore((state) => state.ensureWorkspace);
  const patchWorkspace = useStructuredOutlineWorkspaceStore((state) => state.patchWorkspace);
  const selectedVolumeId = useStructuredOutlineWorkspaceStore(
    (state) => state.workspaces[workspaceId]?.selectedVolumeId ?? defaultVolumeId,
  );
  const selectedChapterId = useStructuredOutlineWorkspaceStore(
    (state) => state.workspaces[workspaceId]?.selectedChapterId ?? defaultChapterId,
  );
  const selectedBeatKey = useStructuredOutlineWorkspaceStore(
    (state) => state.workspaces[workspaceId]?.selectedBeatKey ?? "all",
  );
  const showChapterAdvanced = useStructuredOutlineWorkspaceStore(
    (state) => state.workspaces[workspaceId]?.showChapterAdvanced ?? false,
  );
  const showRebalancePanel = useStructuredOutlineWorkspaceStore(
    (state) => state.workspaces[workspaceId]?.showRebalancePanel ?? false,
  );
  const showSyncPanel = useStructuredOutlineWorkspaceStore(
    (state) => state.workspaces[workspaceId]?.showSyncPanel ?? false,
  );
  const showSyncPreview = useStructuredOutlineWorkspaceStore(
    (state) => state.workspaces[workspaceId]?.showSyncPreview ?? false,
  );
  const showJsonPreview = useStructuredOutlineWorkspaceStore(
    (state) => state.workspaces[workspaceId]?.showJsonPreview ?? false,
  );
  const [tensionCurveDialogOpen, setTensionCurveDialogOpen] = useState(false);

  useEffect(() => {
    ensureWorkspace(
      workspaceId,
      getStructuredOutlineWorkspaceDefaults(defaultVolumeId, defaultChapterId),
    );
  }, [defaultChapterId, defaultVolumeId, ensureWorkspace, workspaceId]);

  useEffect(() => {
    if (!volumes.some((volume) => volume.id === selectedVolumeId)) {
      patchWorkspace(workspaceId, {
        selectedVolumeId: defaultVolumeId,
        selectedBeatKey: "all",
        selectedChapterId: defaultChapterId,
      });
    }
  }, [defaultChapterId, defaultVolumeId, patchWorkspace, selectedVolumeId, volumes, workspaceId]);

  const selectedVolume = volumes.find((volume) => volume.id === selectedVolumeId) ?? volumes[0];
  const selectedStrategyVolume = selectedVolume
    ? strategyPlan?.volumes.find((item) => item.sortOrder === selectedVolume.sortOrder) ?? null
    : null;
  const selectedBeatSheet = selectedVolume ? findBeatSheet(beatSheets, selectedVolume.id) : null;
  const selectedBeat = selectedBeatKey === "all"
    ? null
    : selectedBeatSheet?.beats.find((beat) => beat.key === selectedBeatKey) ?? null;
  const selectedVolumeChapters = selectedVolume?.chapters ?? [];
  const selectedVolumeRequiredChapterCount = getBeatSheetRequiredChapterCount(selectedBeatSheet);
  const selectedVolumeNeedsChapterExpansion = selectedVolumeRequiredChapterCount > selectedVolumeChapters.length;
  const visibleChapters = selectedBeat
    ? selectedVolumeChapters.filter((chapter) => chapterMatchesBeat(chapter, selectedBeat, selectedVolumeChapters))
    : selectedVolumeChapters;
  const selectedChapter = visibleChapters.find((chapter) => chapterMatchesSelection(chapter, selectedChapterId))
    ?? selectedVolumeChapters.find((chapter) => chapterMatchesSelection(chapter, selectedChapterId))
    ?? visibleChapters[0]
    ?? selectedVolumeChapters[0]
    ?? null;
  const selectedChapterIndex = selectedVolume && selectedChapter
    ? selectedVolume.chapters.findIndex((chapter) => chapter.id === selectedChapter.id)
    : -1;
  const selectedChapterBeat = selectedChapter ? findChapterBeat(selectedChapter, selectedBeatSheet, selectedVolumeChapters) : null;
  const selectedRebalance = selectedVolume
    ? rebalanceDecisions.filter((decision) => decision.anchorVolumeId === selectedVolume.id)
    : [];
  const locked = !selectedBeatSheet;
  const refinedChapterCount = selectedVolumeChapters.filter((chapter) => hasChapterExecutionDetail(chapter)).length;
  const visibleRefinedChapterCount = visibleChapters.filter((chapter) => hasChapterExecutionDetail(chapter)).length;
  const draftedChapterIds = new Set(
    executionChapters
      .filter((chapter) => Boolean(chapter.content?.trim()))
      .map((chapter) => chapter.id),
  );
  const allPlannedChapters = volumes.flatMap((volume) => volume.chapters);
  const linkedChapterCount = allPlannedChapters.filter((chapter) => Boolean(chapter.chapterId)).length;
  const hasMissingChapterLinks = allPlannedChapters.length > 0 && linkedChapterCount < allPlannedChapters.length;
  const executionChapterCount = executionChapters.length;
  const workspaceGuidance = getWorkspaceGuidance({
    locked,
    selectedBeat,
    selectedChapter,
    visibleChapterCount: visibleChapters.length,
    totalChapterCount: selectedVolumeChapters.length,
  });
  const tensionCurveViewportOptions: TensionCurveViewportOption[] = [
    { key: "all", label: "Entire volume" },
    ...(selectedBeatSheet?.beats.map((beat) => ({ key: beat.key, label: formatBeatDisplayLabel(beat) })) ?? []),
  ];
  const tensionCurveSeries: TensionCurveSeries[] = selectedVolume
    ? [{
      id: "conflictLevel",
      label: "Conflict intensity",
      color: "#2563eb",
      editable: true,
      points: selectedVolumeChapters.map((chapter) => ({
        id: chapter.id,
        chapterOrder: chapter.chapterOrder,
        title: chapter.title || `Chapter ${chapter.chapterOrder}`,
        value: typeof chapter.conflictLevel === "number" ? chapter.conflictLevel : null,
        source: chapter.conflictLevelSource ?? "ai",
        beatKey: findChapterBeat(chapter, selectedBeatSheet, selectedVolumeChapters)?.key ?? null,
      })),
    }]
    : [];

  useEffect(() => {
    const beatKeys = new Set(selectedBeatSheet?.beats.map((beat) => beat.key) ?? []);
    if (selectedBeatKey !== "all" && !beatKeys.has(selectedBeatKey)) {
      patchWorkspace(workspaceId, { selectedBeatKey: "all" });
    }
  }, [patchWorkspace, selectedBeatKey, selectedBeatSheet, workspaceId]);

  useEffect(() => {
    if (!selectedChapter) {
      patchWorkspace(workspaceId, {
        selectedChapterId: visibleChapters[0]?.id ?? selectedVolumeChapters[0]?.id ?? "",
      });
      return;
    }
    if (selectedBeat && !visibleChapters.some((chapter) => chapter.id === selectedChapter.id)) {
      patchWorkspace(workspaceId, { selectedChapterId: visibleChapters[0]?.id ?? "" });
      return;
    }
    if (!selectedVolumeChapters.some((chapter) => chapter.id === selectedChapter.id)) {
      patchWorkspace(workspaceId, { selectedChapterId: selectedVolumeChapters[0]?.id ?? "" });
    }
  }, [patchWorkspace, selectedBeat, selectedChapter, selectedVolumeChapters, visibleChapters, workspaceId]);

  if (volumes.length === 0) {
    return (
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader><CardTitle>Pacing / chapter breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-4 px-0">
          <WorldInjectionHint worldInjectionSummary={worldInjectionSummary} />
          {!hasCharacters ? (
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <span>Add characters before planning the pacing and chapters.</span>
              <Button size="sm" variant="outline" onClick={onGoToCharacterTab}>Manage characters</Button>
            </div>
          ) : null}
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">Generate a volume strategy and outline on the previous page first.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="flex flex-col gap-4 rounded-2xl bg-muted/20 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <CardTitle>Pacing / chapter breakdown</CardTitle>
          <div className="text-sm text-muted-foreground">Choose a volume, review its pacing, then select a chapter to refine.</div>
        </div>
        <Button variant="secondary" onClick={onSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save volume workspace"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-5 px-0 pt-5">
        <WorldInjectionHint worldInjectionSummary={worldInjectionSummary} />

        {directorTakeoverEntry ? (
          <div className="flex flex-col gap-3 rounded-2xl bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">Want AI to take over this project?</div>
              <div className="text-sm text-muted-foreground">
                Restart Auto Director here without returning to project setup. AI can continue with pacing, chapter breakdown, or later workflow steps.
              </div>
            </div>
            <div className="shrink-0">
              {directorTakeoverEntry}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          <span>{generationNotice}</span>
          {hasUnsavedVolumeDraft ? <Badge variant="secondary">Unsaved draft</Badge> : null}
          <Badge variant="outline">Current: Volume {selectedVolume.sortOrder}</Badge>
          <Badge variant="outline">{selectedVolumeChapters.length} chapters</Badge>
          <Badge variant="outline">{refinedChapterCount}/{Math.max(selectedVolumeChapters.length, 1)} refined</Badge>
        </div>

        <div className="rounded-2xl bg-primary/5 px-4 py-3 text-sm text-foreground">
          {workspaceGuidance}
        </div>

        <TensionCurvePanel
          title="Tension curve"
          subtitle="Review conflict intensity across this volume. Manually fixed points constrain future chapter breakdowns, refinements, and replanning."
          series={tensionCurveSeries}
          viewportOptions={tensionCurveViewportOptions}
          selectedViewportKey={selectedBeatKey}
          onViewportChange={(key) => patchWorkspace(workspaceId, { selectedBeatKey: key })}
          onRequestEdit={() => setTensionCurveDialogOpen(true)}
        />

        <TensionCurveEditDialog
          open={tensionCurveDialogOpen}
          onOpenChange={setTensionCurveDialogOpen}
          title="Edit tension curve"
          description="Review the volume positioning and current beat, then drag chapter points to adjust conflict intensity."
          series={tensionCurveSeries}
          viewportOptions={tensionCurveViewportOptions}
          selectedViewportKey={selectedBeatKey}
          onViewportChange={(key) => patchWorkspace(workspaceId, { selectedBeatKey: key })}
          strategyVolume={selectedStrategyVolume}
          beats={selectedBeatSheet?.beats ?? []}
          chapters={selectedVolumeChapters.map((chapter) => ({
            id: chapter.id,
            chapterId: chapter.chapterId,
            chapterOrder: chapter.chapterOrder,
            beatKey: findChapterBeat(chapter, selectedBeatSheet, selectedVolumeChapters)?.key ?? null,
            title: chapter.title || `Chapter ${chapter.chapterOrder}`,
            summary: chapter.summary,
            purpose: chapter.purpose,
            exclusiveEvent: chapter.exclusiveEvent,
            conflictLevel: chapter.conflictLevel,
            conflictLevelSource: chapter.conflictLevelSource ?? "ai",
          }))}
          selectedChapterId={selectedChapter?.id ?? selectedChapterId}
          onSelectChapter={(chapterId) => patchWorkspace(workspaceId, { selectedChapterId: chapterId })}
          onOpenChapterDetail={(chapterId) => {
            patchWorkspace(workspaceId, { selectedChapterId: chapterId });
            setTensionCurveDialogOpen(false);
          }}
          onPointChange={(seriesId, chapterId, value) => {
            if (!selectedVolume || seriesId !== "conflictLevel") {
              return;
            }
            onChapterNumberChange(selectedVolume.id, chapterId, "conflictLevel", value, {
              conflictLevelSource: "user",
            });
          }}
          onPointRelease={(seriesId, chapterId, value) => {
            if (!selectedVolume || seriesId !== "conflictLevel") {
              return;
            }
            onChapterNumberChange(selectedVolume.id, chapterId, "conflictLevel", value, {
              conflictLevelSource: "ai",
            });
          }}
          onPointReleaseMany={(seriesId, points) => {
            if (!selectedVolume || seriesId !== "conflictLevel") {
              return;
            }
            points.forEach((point) => {
              onChapterNumberChange(selectedVolume.id, point.pointId, "conflictLevel", point.value, {
                conflictLevelSource: "ai",
              });
            });
          }}
        />

        {!strategyPlan ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-800">Generate a volume strategy in the previous stage before creating the beat sheet and chapter breakdown.</div> : null}
        {syncMessage ? <div className="text-xs text-muted-foreground">{syncMessage}</div> : null}
        {locked ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-800">This volume has no beat sheet yet. Chapter list generation is locked.</div> : null}

        <Card className="border-0 bg-muted/15 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-base">Volume in progress</CardTitle>
              <div className="text-sm text-muted-foreground">Select a volume to update the pacing and chapters in the main workspace.</div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="structured-volume-picker grid grid-cols-1 gap-2 md:flex md:gap-3 md:overflow-x-auto md:pb-1">
              {volumes.map((volume) => {
                const volumeBeatSheet = findBeatSheet(beatSheets, volume.id);
                const isSelected = selectedVolume.id === volume.id;
                const doneCount = volume.chapters.filter((chapter) => hasChapterExecutionDetail(chapter)).length;
                return (
                  <button
                    key={volume.id}
                    type="button"
                    onClick={() => {
                      patchWorkspace(workspaceId, {
                        selectedVolumeId: volume.id,
                        selectedBeatKey: "all",
                        selectedChapterId: volume.chapters[0]?.id ?? "",
                      });
                    }}
                    className={cn(
                      "w-full min-w-0 rounded-xl p-3 text-left transition-colors md:min-w-[220px] md:shrink-0 md:rounded-2xl",
                      isSelected ? "bg-primary/5 shadow-sm ring-1 ring-primary/15" : "bg-background/70 hover:bg-background",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={isSelected ? "default" : "outline"}>Volume {volume.sortOrder}</Badge>
                      {volumeBeatSheet ? <Badge variant="secondary">Beat sheet ready</Badge> : <Badge variant="outline">No beat sheet</Badge>}
                    </div>
                    <div className="mt-2 line-clamp-1 text-sm font-medium">{volume.title || `Volume ${volume.sortOrder}`}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {volume.mainPromise || volume.summary || "Add this volume's central promise."}
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">{volume.chapters.length} chapters · {doneCount} refined</div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {selectedRebalance.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-col gap-3 rounded-2xl bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                {selectedRebalance.length} adjacent-volume rebalancing suggestions found. They affect transitions between volumes but are not part of the current editing step.
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => patchWorkspace(workspaceId, { showRebalancePanel: !showRebalancePanel })}
              >
                {showRebalancePanel ? "Hide suggestions" : "View suggestions"}
              </Button>
            </div>
            {showRebalancePanel ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {selectedRebalance.map((decision) => (
                  <div
                    key={`${decision.anchorVolumeId}-${decision.affectedVolumeId}-${decision.summary}`}
                    className="rounded-xl bg-muted/15 p-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{decision.direction}</Badge>
                      <Badge
                        variant={
                          decision.severity === "high"
                            ? "secondary"
                            : decision.severity === "medium"
                              ? "outline"
                              : "default"
                        }
                      >
                        {decision.severity}
                      </Badge>
                    </div>
                    <div className="mt-2">{decision.summary}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-4">
          <StructuredBeatSheetCard
            selectedVolume={selectedVolume}
            selectedVolumeChapters={selectedVolumeChapters}
            selectedBeatSheet={selectedBeatSheet}
            selectedBeat={selectedBeat}
            visibleChapters={visibleChapters}
            refinedChapterCount={refinedChapterCount}
            visibleRefinedChapterCount={visibleRefinedChapterCount}
            readiness={readiness}
            isGeneratingBeatSheet={isGeneratingBeatSheet}
            onGenerateBeatSheet={onGenerateBeatSheet}
            chapterListPanel={(
              <StructuredChapterListCard
                selectedVolume={selectedVolume}
                selectedBeat={selectedBeat}
                selectedBeatKey={selectedBeatKey}
                selectedBeatSheet={selectedBeatSheet}
                selectedVolumeChapters={selectedVolumeChapters}
                visibleChapters={visibleChapters}
                selectedChapter={selectedChapter}
                draftedChapterIds={draftedChapterIds}
                visibleRefinedChapterCount={visibleRefinedChapterCount}
                selectedVolumeRequiredChapterCount={selectedVolumeRequiredChapterCount}
                selectedVolumeNeedsChapterExpansion={selectedVolumeNeedsChapterExpansion}
                isGeneratingChapterList={isGeneratingChapterList}
                chapterListProgress={chapterListProgress}
                generatingChapterListVolumeId={generatingChapterListVolumeId}
                generatingChapterListBeatKey={generatingChapterListBeatKey}
                generatingChapterListMode={generatingChapterListMode}
                locked={locked}
                onGenerateChapterList={onGenerateChapterList}
                onRemoveChapter={onRemoveChapter}
                onSelectBeatKey={(beatKey) => patchWorkspace(workspaceId, { selectedBeatKey: beatKey })}
                onSelectChapter={(chapterId) => patchWorkspace(workspaceId, { selectedChapterId: chapterId })}
              />
            )}
            chapterDetailPanel={(
              <StructuredChapterDetailCard
                selectedVolume={selectedVolume}
                selectedChapter={selectedChapter}
                visibleChapters={visibleChapters}
                selectedChapterBeatLabel={selectedChapterBeat?.label ?? null}
                selectedChapterIndex={selectedChapterIndex}
                showChapterAdvanced={showChapterAdvanced}
                onToggleAdvanced={() => patchWorkspace(workspaceId, { showChapterAdvanced: !showChapterAdvanced })}
                isGeneratingChapterDetail={isGeneratingChapterDetail}
                isGeneratingChapterDetailBundle={isGeneratingChapterDetailBundle}
                generatingChapterDetailMode={generatingChapterDetailMode}
                generatingChapterDetailChapterId={generatingChapterDetailChapterId}
                chapterDetailFailure={chapterDetailFailure}
                onGenerateChapterDetail={onGenerateChapterDetail}
                onGenerateChapterDetailBundle={onGenerateChapterDetailBundle}
                onRetryFailedChapterDetail={onRetryFailedChapterDetail}
                onChapterFieldChange={onChapterFieldChange}
                onChapterNumberChange={onChapterNumberChange}
                onChapterPayoffRefsChange={onChapterPayoffRefsChange}
                onMoveChapter={onMoveChapter}
                onRemoveChapter={onRemoveChapter}
                locked={locked}
              />
            )}
          />

          <div className="space-y-4">
            <Card className="border-0 bg-muted/15 shadow-none">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">Chapter execution links</CardTitle>
                    <div className="text-sm text-muted-foreground">The system links planned chapters to the execution queue. Expand this section only to inspect the links.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={hasMissingChapterLinks ? "outline" : "secondary"}>
                      {linkedChapterCount}/{Math.max(allPlannedChapters.length, 1)} linked
                    </Badge>
                    <Badge variant="outline">{executionChapterCount} chapters in execution queue</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => patchWorkspace(workspaceId, { showSyncPanel: !showSyncPanel })}
                    >
                      {showSyncPanel ? "Hide diagnostics" : "View links"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {showSyncPanel ? (
                  <>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <label className="flex items-center gap-2 rounded-full border border-border/70 px-3 py-1.5">
                        <input type="checkbox" checked={syncOptions.preserveContent} onChange={(event) => onSyncOptionsChange({ preserveContent: event.target.checked })} />
                        Preserve existing prose
                      </label>
                      <label className="flex items-center gap-2 rounded-full border border-border/70 px-3 py-1.5">
                        <input type="checkbox" checked={syncOptions.applyDeletes} onChange={(event) => onSyncOptionsChange({ applyDeletes: event.target.checked })} />
                        Delete chapters outside the volume outline when syncing
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => onApplyBatch({ conflictLevel: 60 })}>Set conflict level to 60 for all</Button>
                      <Button size="sm" variant="outline" onClick={() => onApplyBatch({ targetWordCount: 2500 })}>Set word count to 2,500 for all</Button>
                      <AiButton size="sm" onClick={() => onApplyBatch({ generateTaskSheet: true })}>Generate task sheets in batch</AiButton>
                      <Button onClick={() => onApplySync(syncOptions)} disabled={isApplyingSync}>
                        {isApplyingSync ? "Fixing..." : "Fix chapter links"}
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => patchWorkspace(workspaceId, { showSyncPreview: !showSyncPreview })}
                      >
                        {showSyncPreview ? "Hide link differences" : "View link differences"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => patchWorkspace(workspaceId, { showJsonPreview: !showJsonPreview })}
                      >
                        {showJsonPreview ? "Hide JSON" : "View JSON"}
                      </Button>
                    </div>

                    {showSyncPreview ? (
                      <div className="structured-sync-preview-list space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3 text-xs md:max-h-64 md:overflow-auto">
                        {syncPreview.items.map((item) => (
                          <div
                            key={`${item.action}-${item.chapterOrder}-${item.nextTitle}`}
                            className="rounded-lg border border-border/70 bg-background/80 p-2.5"
                          >
                            <div className="font-medium">Chapter {item.chapterOrder}: {item.nextTitle}</div>
                            <div className="text-muted-foreground">Fields: {item.changedFields.join(", ") || "None"}</div>
                            <Badge
                              className="mt-2"
                              variant={
                                item.action === "delete" || item.action === "delete_candidate"
                                  ? "secondary"
                                  : item.action === "create"
                                    ? "default"
                                    : "outline"
                              }
                            >
                              {actionLabel(item.action)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {showJsonPreview ? (
                      <textarea className="min-h-[280px] w-full rounded-md border bg-muted/20 p-3 text-sm" readOnly value={draftText} />
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                    Chapter planning focuses on selecting and refining chapters. Batch task sheets, link differences, and JSON preview are collapsed by default to keep the main workflow focused.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          </div>
      </CardContent>
    </Card>
  );
}
