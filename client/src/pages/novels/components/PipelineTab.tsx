import type { ReactNode } from "react";
import { TaskRecordActions } from "@/components/taskQueue/TaskRecordActions";
import type { Chapter, NovelBible, PipelineJob, PlotBeat, QualityScore, ReviewIssue } from "@ai-novel/shared/types/novel";
import AiButton from "@/components/common/AiButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import LLMSelector from "@/components/common/LLMSelector";
import StreamOutput from "@/components/common/StreamOutput";
import CollapsibleSummary from "./CollapsibleSummary";
import WorldInjectionHint from "./WorldInjectionHint";
import { getLowScoreChapterRange, getPipelineStageState, PIPELINE_STAGE_ITEMS } from "./pipelineTab.utils";
import DirectorTakeoverEntryPanel from "./DirectorTakeoverEntryPanel";
import SelectControl from "@/components/common/SelectControl";
import NovelDirectorIssuePolicyCard from "./NovelDirectorIssuePolicyCard";

interface PipelineTabProps {
  novelId: string;
  worldInjectionSummary: string | null;
  hasCharacters: boolean;
  directorTakeoverEntry?: ReactNode;
  onGoToCharacterTab: () => void;
  pipelineForm: {
    startOrder: number;
    endOrder: number;
    maxRetries: number;
    runMode: "fast" | "polish";
    autoReview: boolean;
    autoRepair: boolean;
    skipCompleted: boolean;
    qualityThreshold: number;
    repairMode: "detect_only" | "light_repair" | "heavy_repair" | "continuity_only" | "character_only" | "ending_only";
  };
  onPipelineFormChange: (
    field: "startOrder" | "endOrder" | "maxRetries" | "runMode" | "autoReview" | "autoRepair" | "skipCompleted" | "qualityThreshold" | "repairMode",
    value: number | boolean | string,
  ) => void;
  maxOrder: number;
  onGenerateBible: () => void;
  onAbortBible: () => void;
  isBibleStreaming: boolean;
  bibleStreamContent: string;
  onGenerateBeats: () => void;
  onAbortBeats: () => void;
  isBeatsStreaming: boolean;
  beatsStreamContent: string;
  onRunPipeline: (patch?: Partial<PipelineTabProps["pipelineForm"]>) => void;
  isRunningPipeline: boolean;
  pipelineMessage: string;
  pipelineJob?: PipelineJob;
  chapters: Chapter[];
  selectedChapterId: string;
  onSelectedChapterChange: (chapterId: string) => void;
  onReviewChapter: () => void;
  isReviewing: boolean;
  onRepairChapter: () => void;
  isRepairing: boolean;
  onGenerateHook: () => void;
  isGeneratingHook: boolean;
  reviewResult: {
    score: QualityScore;
    issues: ReviewIssue[];
  } | null;
  repairBeforeContent: string;
  repairAfterContent: string;
  repairStreamContent: string;
  isRepairStreaming: boolean;
  onAbortRepair: () => void;
  qualitySummary?: QualityScore;
  chapterReports: Array<{
    chapterId?: string | null;
    coherence: number;
    repetition: number;
    pacing: number;
    voice: number;
    engagement: number;
    overall: number;
    issues?: string | null;
  }>;
  bible?: NovelBible | null;
  plotBeats: PlotBeat[];
}

function repairModeLabel(mode: PipelineTabProps["pipelineForm"]["repairMode"]): string {
  const mapping: Record<PipelineTabProps["pipelineForm"]["repairMode"], string> = {
    detect_only: "Detect only",
    light_repair: "Light automatic repair",
    heavy_repair: "Full automatic rewrite",
    continuity_only: "Continuity only",
    character_only: "Character consistency only",
    ending_only: "Ending impact only",
  };
  return mapping[mode];
}

function stageStatusLabel(state: "pending" | "active" | "completed" | "failed"): string {
  if (state === "active") return "In progress";
  if (state === "completed") return "Completed";
  if (state === "failed") return "Error";
  return "Pending";
}

export default function PipelineTab(props: PipelineTabProps) {
  const {
    novelId,
    worldInjectionSummary,
    hasCharacters,
    onGoToCharacterTab,
    pipelineForm,
    onPipelineFormChange,
    maxOrder,
    onGenerateBible,
    onAbortBible,
    isBibleStreaming,
    bibleStreamContent,
    onGenerateBeats,
    onAbortBeats,
    isBeatsStreaming,
    beatsStreamContent,
    onRunPipeline,
    isRunningPipeline,
    pipelineMessage,
    pipelineJob,
    chapters,
    selectedChapterId,
    onSelectedChapterChange,
    onReviewChapter,
    isReviewing,
    onRepairChapter,
    isRepairing,
    onGenerateHook,
    isGeneratingHook,
    reviewResult,
    repairBeforeContent,
    repairAfterContent,
    repairStreamContent,
    isRepairStreaming,
    onAbortRepair,
    qualitySummary,
    chapterReports,
    bible,
    plotBeats,
    directorTakeoverEntry,
  } = props;

  const lowScoreRange = getLowScoreChapterRange(chapters, chapterReports, pipelineForm.qualityThreshold);
  const lowScoreReports = chapterReports
    .filter((item) => item.chapterId && item.overall < pipelineForm.qualityThreshold)
    .slice(0, 12);
  const pendingRepairCount = chapterReports.filter((item) => item.chapterId && item.overall < pipelineForm.qualityThreshold).length;

  const exportPipelineReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      pipelineForm,
      pipelineJob,
      qualitySummary,
      chapterReports,
      lowScoreThreshold: pipelineForm.qualityThreshold,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pipeline-report-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <DirectorTakeoverEntryPanel
        title="Resume quality repair"
        description="AI will check for an active chapter batch or pending repair checkpoint, then resume the current repair or start a new batch."
        entry={directorTakeoverEntry}
      />
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader className="rounded-2xl bg-muted/20 px-5 py-4">
          <CardTitle>Batch generation and quality checks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-0 pt-5">
          <WorldInjectionHint worldInjectionSummary={worldInjectionSummary} />
          {!hasCharacters ? (
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <span>Add at least one character before running the pipeline.</span>
              <Button size="sm" variant="outline" onClick={onGoToCharacterTab}>Go to characters</Button>
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-muted/15 p-3">
              <div className="text-xs text-muted-foreground">Current focus</div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {pendingRepairCount > 0 ? `Review ${pendingRepairCount} low-scoring chapters first` : "No obvious low-scoring chapters"}
              </div>
            </div>
            <div className="rounded-xl bg-muted/15 p-3">
              <div className="text-xs text-muted-foreground">Quality threshold</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{pipelineForm.qualityThreshold}</div>
            </div>
            <div className="rounded-xl bg-muted/15 p-3">
              <div className="text-xs text-muted-foreground">Current run mode</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{pipelineForm.runMode === "polish" ? "Polish" : "Fast"}</div>
            </div>
          </div>
          {pipelineMessage ? <div className="text-sm text-muted-foreground">{pipelineMessage}</div> : null}
        </CardContent>
      </Card>

      <Card className="border-0 bg-muted/15 shadow-none">
        <CardHeader>
          <CardTitle>Quality risk queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SelectControl
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={selectedChapterId}
            onChange={(event) => onSelectedChapterChange(event.target.value)}
          >
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>Chapter {chapter.order} - {chapter.title}</option>
            ))}
          </SelectControl>
          <div className="flex flex-wrap gap-2">
            <AiButton onClick={onReviewChapter} disabled={isReviewing || !selectedChapterId}>Review chapter</AiButton>
            <AiButton variant="secondary" onClick={onRepairChapter} disabled={isRepairing || !selectedChapterId}>Repair chapter</AiButton>
            <AiButton variant="outline" onClick={onGenerateHook} disabled={isGeneratingHook || !selectedChapterId}>Generate hook</AiButton>
          </div>
          {reviewResult ? (
            <div className="rounded-xl bg-background/70 p-3 text-sm">
              <div className="mb-2 font-medium">Review scores</div>
              <div className="grid gap-1 md:grid-cols-2">
                <div>Coherence: {reviewResult.score.coherence}</div>
                <div>Repetition: {reviewResult.score.repetition}</div>
                <div>Pacing: {reviewResult.score.pacing}</div>
                <div>Voice: {reviewResult.score.voice}</div>
                <div>Reader engagement: {reviewResult.score.engagement}</div>
                <div>Overall: {reviewResult.score.overall}</div>
              </div>
            </div>
          ) : null}
          <StreamOutput content={repairStreamContent} isStreaming={isRepairStreaming} onAbort={onAbortRepair} />
          {(repairBeforeContent || repairAfterContent) ? (
            <div className="grid gap-3 md:grid-cols-2">
              <pre className="max-h-[220px] overflow-auto whitespace-pre-wrap rounded-xl bg-background/70 p-3 text-xs">{repairBeforeContent || "No content"}</pre>
              <pre className="max-h-[220px] overflow-auto whitespace-pre-wrap rounded-xl bg-background/70 p-3 text-xs">{repairAfterContent || "Appears after repair"}</pre>
            </div>
          ) : null}
          {lowScoreReports.length > 0 ? (
            <div className="space-y-2 rounded-xl bg-background/70 p-3 text-xs">
              <div className="font-medium">Low-scoring chapters (threshold {pipelineForm.qualityThreshold})</div>
              {lowScoreReports.map((item, index) => (
                <div key={`${item.chapterId}-${index}`} className="flex items-center justify-between">
                  <span>{item.chapterId}</span>
                  <Badge variant="secondary">overall {item.overall}</Badge>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <details className="group border-t border-border/60 pt-4">
        <summary className="cursor-pointer list-none">
          <CollapsibleSummary
            title="Pipeline, model, and run settings"
            description="Configure batch tasks, models, and advanced options here. Start with the current problem chapter and expand this section when you need batch processing."
          />
        </summary>

        <div className="mt-4 space-y-4">
          <NovelDirectorIssuePolicyCard novelId={novelId} />
          <Card>
            <CardHeader>
              <CardTitle>Model and configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <LLMSelector />
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">First chapter</div>
                  <Input
                    type="number"
                    min={1}
                    max={maxOrder}
                    value={pipelineForm.startOrder}
                    onChange={(event) => onPipelineFormChange("startOrder", Number(event.target.value) || 1)}
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Last chapter</div>
                  <Input
                    type="number"
                    min={1}
                    max={maxOrder}
                    value={pipelineForm.endOrder}
                    onChange={(event) => onPipelineFormChange("endOrder", Number(event.target.value) || 1)}
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Retries on failure</div>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    value={pipelineForm.maxRetries}
                    onChange={(event) => onPipelineFormChange("maxRetries", Number(event.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Run mode</div>
                  <SelectControl
                    className="w-full rounded-md border bg-background p-2 text-sm"
                    value={pipelineForm.runMode}
                    onChange={(event) => onPipelineFormChange("runMode", event.target.value)}
                  >
                    <option value="fast">Fast</option>
                    <option value="polish">Polish</option>
                  </SelectControl>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Quality threshold</div>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={pipelineForm.qualityThreshold}
                    onChange={(event) => onPipelineFormChange("qualityThreshold", Number(event.target.value) || 75)}
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Repair mode</div>
                  <SelectControl
                    className="w-full rounded-md border bg-background p-2 text-sm"
                    value={pipelineForm.repairMode}
                    onChange={(event) => onPipelineFormChange("repairMode", event.target.value)}
                  >
                    <option value="detect_only">Detect only</option>
                    <option value="light_repair">Light automatic repair</option>
                    <option value="heavy_repair">Full automatic rewrite</option>
                    <option value="continuity_only">Continuity only</option>
                    <option value="character_only">Character consistency only</option>
                    <option value="ending_only">Ending impact only</option>
                  </SelectControl>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={pipelineForm.autoReview}
                    onChange={(event) => onPipelineFormChange("autoReview", event.target.checked)}
                  />
                  Auto-review
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={pipelineForm.autoRepair}
                    onChange={(event) => onPipelineFormChange("autoRepair", event.target.checked)}
                  />
                  Auto-repair
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={pipelineForm.skipCompleted}
                    onChange={(event) => onPipelineFormChange("skipCompleted", event.target.checked)}
                  />
                  Skip completed chapters
                </label>
              </div>
              <div className="rounded-md border bg-muted/20 p-2 text-xs text-muted-foreground">
                Current settings: {pipelineForm.runMode === "polish" ? "Polish" : "Fast"} | Threshold {pipelineForm.qualityThreshold} | {repairModeLabel(pipelineForm.repairMode)}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Stage visualization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {PIPELINE_STAGE_ITEMS.map((stage) => {
                  const state = getPipelineStageState(stage.key, pipelineJob, PIPELINE_STAGE_ITEMS);
                  return (
                    <div
                      key={stage.key}
                      className={`rounded-md border px-3 py-2 text-sm ${
                        state === "active"
                          ? "border-primary bg-primary/10"
                          : state === "completed"
                            ? "border-emerald-500/30 bg-emerald-500/10"
                            : state === "failed"
                              ? "border-red-400/40 bg-red-500/10"
                              : "border-border bg-background"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{stage.label}</span>
                        <span className="text-xs text-muted-foreground">{stageStatusLabel(state)}</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Run panel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <AiButton onClick={() => onRunPipeline()} disabled={isRunningPipeline || !hasCharacters}>Start batch generation</AiButton>
                  <AiButton
                    variant="outline"
                    onClick={() => {
                      if (!lowScoreRange) {
                        return;
                      }
                      onRunPipeline({
                        startOrder: lowScoreRange.startOrder,
                        endOrder: lowScoreRange.endOrder,
                        skipCompleted: true,
                      });
                    }}
                    disabled={isRunningPipeline || !lowScoreRange}
                  >
                    Rerun low-scoring chapters only
                  </AiButton>
                  <Button variant="outline" onClick={exportPipelineReport}>Export task report</Button>
                  <AiButton onClick={onGenerateBible} disabled={isBibleStreaming || !hasCharacters}>Generate story bible</AiButton>
                  <Button variant="secondary" onClick={onAbortBible} disabled={!isBibleStreaming}>Stop story bible</Button>
                  <AiButton onClick={onGenerateBeats} disabled={isBeatsStreaming || !hasCharacters}>Generate beats</AiButton>
                  <Button variant="secondary" onClick={onAbortBeats} disabled={!isBeatsStreaming}>Stop beat generation</Button>
                </div>
                {lowScoreRange ? (
                  <div className="text-xs text-muted-foreground">
                    {lowScoreRange.count} low-scoring chapters. Rerun range: chapters {lowScoreRange.startOrder}-{lowScoreRange.endOrder}.
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">No chapters are below the threshold.</div>
                )}
                <div className="rounded-md border p-3 text-sm">
                  <div className="mb-2 font-medium">Task status</div>
                  {pipelineJob ? (
                    <div className="space-y-1">
                      <div>Task ID: {pipelineJob.id}</div>
                      <div>Status: {pipelineJob.status}</div>
                      <TaskRecordActions kind="novel_pipeline" id={pipelineJob.id} status={pipelineJob.status} title="Chapter generation" allowStop allowDelete={false} />
                      <div>Current stage: {pipelineJob.currentStage || "-"}</div>
                      <div>Current chapter: {pipelineJob.currentItemLabel || "-"}</div>
                      <div>Progress: {Math.round((pipelineJob.progress ?? 0) * 100)}%</div>
                      <div>Completed: {pipelineJob.completedCount}/{pipelineJob.totalCount}</div>
                      <div>Retries: {pipelineJob.retryCount}/{pipelineJob.maxRetries}</div>
                      {pipelineJob.lastErrorType ? <div>Error category: {pipelineJob.lastErrorType}</div> : null}
                      {pipelineJob.error ? <div className="text-red-600">Error: {pipelineJob.error}</div> : null}
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No pipeline tasks are currently running.</div>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <StreamOutput content={bibleStreamContent} isStreaming={isBibleStreaming} onAbort={onAbortBible} />
                  <StreamOutput content={beatsStreamContent} isStreaming={isBeatsStreaming} onAbort={onAbortBeats} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </details>

      <details className="group rounded-2xl border border-border/70 bg-background/95 p-4">
        <summary className="cursor-pointer list-none">
          <CollapsibleSummary
            title="Quality reports and generated materials"
            description="Quality reports, saved story bibles, and beats are for reference and are collapsed by default."
          />
        </summary>

        <div className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality report overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {qualitySummary ? (
                <div className="grid gap-2 md:grid-cols-3">
                  <Badge variant="outline">Coherence: {qualitySummary.coherence}</Badge>
                  <Badge variant="outline">Repetition: {qualitySummary.repetition}</Badge>
                  <Badge variant="outline">Pacing: {qualitySummary.pacing}</Badge>
                  <Badge variant="outline">Voice: {qualitySummary.voice}</Badge>
                  <Badge variant="outline">Reader engagement: {qualitySummary.engagement}</Badge>
                  <Badge variant="default">Overall: {qualitySummary.overall}</Badge>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No quality reports yet.</div>
              )}
              <div className="space-y-2 text-sm">
                {chapterReports.slice(0, 10).map((item, index) => (
                  <div key={`${item.chapterId ?? "novel"}-${index}`} className="rounded-md border p-2">
                    <div>Chapter: {item.chapterId ?? "Entire novel"}</div>
                    <div className="text-muted-foreground">
                      Overall: {item.overall}, Coherence: {item.coherence}, Repetition: {item.repetition}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Saved story bible</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {bible ? (
                  <>
                    <div className="rounded-md border p-2"><div className="font-medium">Core promise</div><div className="text-muted-foreground">{bible.mainPromise ?? "Not set"}</div></div>
                    <div className="rounded-md border p-2"><div className="font-medium">Core setting</div><div className="text-muted-foreground">{bible.coreSetting ?? "Not set"}</div></div>
                    <div className="rounded-md border p-2">
                      <div className="font-medium">World notes in story bible</div>
                      <div className="text-xs leading-5 text-muted-foreground">
                        These notes are part of the story bible. Chapter generation prioritizes the world guide and usage scope in “Novel world.”
                      </div>
                      <div className="mt-2 text-muted-foreground">{bible.worldRules ?? "Not set"}</div>
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground">No story bible yet.</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Saved beats</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {plotBeats.length > 0 ? (
                  plotBeats.slice(0, 20).map((beat) => (
                    <div key={beat.id} className="rounded-md border p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">Chapter {beat.chapterOrder ?? "-"} · {beat.title}</div>
                        <Badge variant="outline">{beat.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">Type: {beat.beatType}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground">No story beats yet.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </details>
    </div>
  );
}
