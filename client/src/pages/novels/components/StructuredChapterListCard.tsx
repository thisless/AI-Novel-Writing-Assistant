import AiButton from "@/components/common/AiButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import {
  getChapterExecutionDetailStatus,
  hasChapterExecutionDetail,
} from "../chapterDetailPlanning.shared";
import {
  chapterMatchesBeat,
  formatBeatDisplayLabel,
  getBeatExpectedChapterCount,
} from "./structuredOutlineWorkspace.shared";
import type { StructuredTabViewProps } from "./NovelEditView.types";

type StructuredVolume = StructuredTabViewProps["volumes"][number];
type StructuredChapter = StructuredVolume["chapters"][number];
type StructuredBeatSheet = StructuredTabViewProps["beatSheets"][number];
type StructuredBeat = StructuredBeatSheet["beats"][number];

interface StructuredChapterListCardProps {
  selectedVolume: StructuredVolume;
  selectedBeat: StructuredBeat | null;
  selectedBeatKey: string;
  selectedBeatSheet: StructuredBeatSheet | null;
  selectedVolumeChapters: StructuredChapter[];
  visibleChapters: StructuredChapter[];
  selectedChapter: StructuredChapter | null;
  draftedChapterIds: Set<string>;
  visibleRefinedChapterCount: number;
  selectedVolumeRequiredChapterCount: number;
  selectedVolumeNeedsChapterExpansion: boolean;
  isGeneratingChapterList: boolean;
  chapterListProgress: StructuredTabViewProps["chapterListProgress"];
  generatingChapterListVolumeId: string;
  generatingChapterListBeatKey: string;
  generatingChapterListMode: StructuredTabViewProps["generatingChapterListMode"];
  locked: boolean;
  onGenerateChapterList: StructuredTabViewProps["onGenerateChapterList"];
  onRemoveChapter: StructuredTabViewProps["onRemoveChapter"];
  onSelectBeatKey: (beatKey: string) => void;
  onSelectChapter: (chapterId: string) => void;
}

function renderChapterDetailStatusBadge(chapter: StructuredChapter) {
  const status = getChapterExecutionDetailStatus(chapter);
  if (status === "complete") {
    return <Badge variant="secondary">Refined</Badge>;
  }
  if (status === "partial") {
    return <Badge>Refining</Badge>;
  }
  return <Badge variant="outline">Needs refinement</Badge>;
}

function isBeatGroupComplete(group: {
  expectedCount: number;
  chapters: StructuredChapter[];
}): boolean {
  if (group.expectedCount <= 0) {
    return group.chapters.length > 0;
  }
  return group.chapters.length === group.expectedCount;
}

function chapterHasDraftContent(chapter: StructuredChapter, draftedChapterIds: Set<string>): boolean {
  return Boolean(
    (chapter.chapterId && draftedChapterIds.has(chapter.chapterId))
    || draftedChapterIds.has(chapter.id),
  );
}

export default function StructuredChapterListCard(props: StructuredChapterListCardProps) {
  const {
    selectedVolume,
    selectedBeat,
    selectedBeatKey,
    selectedBeatSheet,
    selectedVolumeChapters,
    visibleChapters,
    selectedChapter,
    draftedChapterIds,
    visibleRefinedChapterCount,
    selectedVolumeRequiredChapterCount,
    selectedVolumeNeedsChapterExpansion,
    isGeneratingChapterList,
    chapterListProgress,
    generatingChapterListVolumeId,
    generatingChapterListBeatKey,
    generatingChapterListMode,
    locked,
    onGenerateChapterList,
    onRemoveChapter,
    onSelectBeatKey,
    onSelectChapter,
  } = props;

  const isGeneratingCurrentVolume = isGeneratingChapterList && generatingChapterListVolumeId === selectedVolume.id;
  const matchedChapterIds = new Set<string>();
  const beatGroups = (selectedBeatSheet?.beats ?? []).map((beat) => {
    const chapters = selectedVolumeChapters.filter((chapter) => {
      const matches = chapterMatchesBeat(chapter, beat, selectedVolumeChapters);
      if (matches) {
        matchedChapterIds.add(chapter.id);
      }
      return matches;
    });
    return {
      key: beat.key,
      label: formatBeatDisplayLabel(beat),
      chapterSpanHint: beat.chapterSpanHint,
      expectedCount: getBeatExpectedChapterCount(beat),
      chapters,
      hasDraftContent: chapters.some((chapter) => chapterHasDraftContent(chapter, draftedChapterIds)),
      refinedCount: chapters.filter((chapter) => hasChapterExecutionDetail(chapter)).length,
    };
  });
  const unmatchedChapters = selectedVolumeChapters.filter((chapter) => !matchedChapterIds.has(chapter.id));
  const selectedBeatGroup = selectedBeatKey === "all"
    ? null
    : beatGroups.find((group) => group.key === selectedBeatKey) ?? null;
  const nextChapterListGroup = selectedBeatGroup && !isBeatGroupComplete(selectedBeatGroup)
    ? selectedBeatGroup
    : beatGroups.find((group) => !isBeatGroupComplete(group)) ?? null;
  const isGeneratingNextChapterListGroup = Boolean(
    nextChapterListGroup
    && isGeneratingCurrentVolume
    && generatingChapterListMode === "single_beat"
    && generatingChapterListBeatKey === nextChapterListGroup.key,
  );
  const isGeneratingFullVolume = isGeneratingCurrentVolume && generatingChapterListMode === "full_volume";

  function renderBeatStatusBadge(group: typeof beatGroups[number]) {
    const isGeneratingGroup = isGeneratingCurrentVolume
      && (generatingChapterListMode === "full_volume" || generatingChapterListBeatKey === group.key);
    if (isGeneratingGroup) {
      return <Badge>Generating</Badge>;
    }
    if (group.hasDraftContent) {
      return <Badge variant="secondary">Locked by existing draft</Badge>;
    }
    if (group.chapters.length === 0) {
      return <Badge variant="outline">Not generated</Badge>;
    }
    if (group.expectedCount > 0 && group.chapters.length !== group.expectedCount) {
      return <Badge variant="outline">Retry needed</Badge>;
    }
    return <Badge variant="secondary">Generated</Badge>;
  }

  return (
    <Card className="border-border/70 bg-background/90">
      <CardHeader className="pb-3">
        <div className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-base leading-none">Beat / chapter navigation</CardTitle>
              <div className="mt-1 text-sm text-muted-foreground">
                {selectedBeat
                  ? `Focused on "${formatBeatDisplayLabel(selectedBeat)}". Select a group heading to switch beats, or a chapter to refine it on the right.`
                  : "Chapters are grouped by beat. Select a group heading to focus on a beat, or a chapter to refine it on the right."}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <AiButton
                onClick={() => {
                  if (!nextChapterListGroup) {
                    return;
                  }
                  onGenerateChapterList(selectedVolume.id, {
                    generationMode: "single_beat",
                    targetBeatKey: nextChapterListGroup.key,
                  });
                }}
                disabled={isGeneratingChapterList || locked || !nextChapterListGroup}
              >
                {isGeneratingNextChapterListGroup ? "Generating..." : nextChapterListGroup ? "Generate next beat's chapters" : "All beats generated"}
              </AiButton>
              <AiButton
                variant="outline"
                onClick={() => onGenerateChapterList(selectedVolume.id, { generationMode: "full_volume" })}
                disabled={isGeneratingChapterList || locked}
              >
                {isGeneratingFullVolume ? "Generating entire volume..." : "Advanced: Generate all chapter titles"}
              </AiButton>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => onSelectBeatKey("all")}
              className={cn(
                "rounded-full border px-3 py-1.5 transition-colors",
                selectedBeatKey === "all" ? "border-primary/50 bg-primary/5 text-foreground" : "border-border/70 hover:border-primary/30",
              )}
            >
              All beats
            </button>
            <Badge variant="outline">Showing {visibleChapters.length}/{selectedVolumeChapters.length} chapters</Badge>
            <Badge variant="outline">{visibleRefinedChapterCount}/{Math.max(visibleChapters.length, 1)} refined</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {isGeneratingCurrentVolume ? (
          <div className="space-y-2 text-sm" role="status" aria-live="polite">
            <div>{chapterListProgress?.label ?? "Preparing chapter breakdown context…"}</div>
            {chapterListProgress ? (
              <>
                <progress
                  className="h-2 w-full accent-primary"
                  aria-label="Chapter breakdown progress"
                  value={chapterListProgress.completedChapters}
                  max={chapterListProgress.totalChapters}
                />
                <div className="text-xs text-muted-foreground">
                  Generated {chapterListProgress.completedChapters}/{chapterListProgress.totalChapters} chapters
                  {chapterListProgress.completedChapters === chapterListProgress.totalChapters ? "; validating and saving the chapter list…" : "; progress updates after each beat."}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
        {selectedVolumeNeedsChapterExpansion ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-800">
            {selectedVolumeChapters.length}/{selectedVolumeRequiredChapterCount} chapters generated for this volume; some beats still need chapters. You can refine and draft the existing chapters, then generate more beats as needed.
          </div>
        ) : null}

        {selectedVolumeChapters.length > 0 ? (
          <>
            <div className="structured-chapter-navigation-list space-y-3 xl:max-h-[calc(100vh-12rem)] xl:overflow-y-auto xl:pr-1">
              {beatGroups.map((group) => {
                const active = selectedBeatKey === group.key;
                const expanded = selectedBeatKey === "all" || active;
                return (
                  <div key={group.key} className="rounded-xl border border-border/70 bg-background/80 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <button
                        type="button"
                        onClick={() => onSelectBeatKey(active ? "all" : group.key)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={active ? "default" : "outline"}>{group.label}</Badge>
                            <Badge variant="secondary">{group.chapterSpanHint}</Badge>
                            {renderBeatStatusBadge(group)}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {group.chapters.length}/{Math.max(group.expectedCount, group.chapters.length, 1)} chapters · {group.refinedCount} refined
                          </span>
                        </div>
                      </button>
                      {active && selectedVolumeChapters.length > 0 ? (
                        <AiButton
                          size="sm"
                          variant="outline"
                          onClick={() => onGenerateChapterList(selectedVolume.id, {
                            generationMode: "single_beat",
                            targetBeatKey: group.key,
                          })}
                          disabled={isGeneratingChapterList || locked}
                        >
                          {isGeneratingCurrentVolume && generatingChapterListMode === "single_beat" && generatingChapterListBeatKey === group.key
                            ? "Regenerating..."
                            : group.chapters.length > 0 ? "Regenerate this beat" : "Generate this beat"}
                        </AiButton>
                      ) : null}
                    </div>

                    {expanded ? (
                      <div className="mt-3 space-y-2 border-l border-border/70 pl-3">
                        {group.chapters.length > 0 ? group.chapters.map((chapter) => {
                          const isSelected = selectedChapter?.id === chapter.id;
                          return (
                            <button
                              key={chapter.id}
                              type="button"
                              onClick={() => {
                                onSelectBeatKey(group.key);
                                onSelectChapter(chapter.id);
                              }}
                              className={cn(
                                "w-full rounded-xl border p-3 text-left transition-colors",
                                isSelected ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border/70 hover:border-primary/30",
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <Badge variant={isSelected ? "default" : "outline"}>Chapter {chapter.chapterOrder}</Badge>
                                {renderChapterDetailStatusBadge(chapter)}
                              </div>
                              <div className="mt-2 text-sm font-medium">{chapter.title || `Chapter ${chapter.chapterOrder}`}</div>
                            </button>
                          );
                        }) : (
                          <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                            No chapters are mapped to this beat yet.
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {unmatchedChapters.length > 0 ? (
                <div className="rounded-xl border border-dashed p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">Unassigned chapters</Badge>
                      <Badge variant="secondary">{unmatchedChapters.length} chapters</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">These chapters are not assigned to a beat.</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {unmatchedChapters.map((chapter) => {
                      const isSelected = selectedChapter?.id === chapter.id;
                      const title = chapter.title || `Chapter ${chapter.chapterOrder}`;
                      return (
                        <div
                          key={chapter.id}
                          className={cn(
                            "flex items-start gap-2 rounded-xl border p-3 transition-colors",
                            isSelected ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border/70 hover:border-primary/30",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => onSelectChapter(chapter.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <Badge variant={isSelected ? "default" : "outline"}>Chapter {chapter.chapterOrder}</Badge>
                              {renderChapterDetailStatusBadge(chapter)}
                            </div>
                            <div className="mt-2 text-sm font-medium">{title}</div>
                          </button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            disabled={locked || selectedVolume.chapters.length <= 1}
                            title="Delete this unassigned chapter"
                            onClick={() => {
                              const confirmed = window.confirm(`Delete "${title}"? This will only remove the chapter from this volume's chapter breakdown.`);
                              if (!confirmed) {
                                return;
                              }
                              onRemoveChapter(selectedVolume.id, chapter.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">Delete this unassigned chapter</span>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {visibleChapters.length === 0 && selectedBeat ? (
              <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                {selectedVolumeNeedsChapterExpansion ? (
                  <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-800">
                    This beat covers {selectedBeat.chapterSpanHint}, but no chapters have been generated yet. You can generate the focused beat without completing the entire volume first.
                  </div>
                ) : null}
                No chapters are mapped to this beat yet. Generate it to start refining and drafting its chapters.
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            {selectedVolumeRequiredChapterCount > 0 ? (
              <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-800">
                The current beat sheet plans {selectedVolumeRequiredChapterCount} chapters for this volume. Generate the next beat's chapters first, then continue with later beats as needed.
              </div>
            ) : null}
            This volume has no chapter list yet. Generate the next beat's chapters to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
