import type {
  AuditReport,
  Chapter,
  ReplanRecommendation,
  ReplanResult,
  StoryPlan,
  StoryStateSnapshot,
} from "@ai-novel/shared/types/novel";
import type { SSEFrame } from "@ai-novel/shared/types/api";
import type { ChapterRuntimePackage } from "@ai-novel/shared/types/chapterRuntime";
import {
  readChapterQualityDebtDetails,
  type ChapterQualityDebtDetails,
  type ChapterQualityDebtSource,
} from "@ai-novel/shared/types/chapterQualityLoop";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StreamOutput from "@/components/common/StreamOutput";
import {
  ChapterRuntimeAuditCard,
  ChapterRuntimeContextCard,
  ChapterRuntimeLengthCard,
} from "../ChapterRuntimePanels";
import {
  hasText,
  parseChapterScenePlanForDisplay,
  type AssetTabKey,
  MetricBadge,
} from "../chapterExecution.shared";

interface ChapterExecutionReferencePanelProps {
  selectedChapter?: Chapter;
  assetTab: AssetTabKey;
  onAssetTabChange: (tab: AssetTabKey) => void;
  chapterPlan?: StoryPlan | null;
  latestStateSnapshot?: StoryStateSnapshot | null;
  chapterAuditReports: AuditReport[];
  replanRecommendation?: ReplanRecommendation | null;
  onReplanChapter: () => void;
  isReplanningChapter: boolean;
  lastReplanResult?: ReplanResult | null;
  chapterQualityReport?: {
    coherence: number;
    repetition: number;
    pacing: number;
    voice: number;
    engagement: number;
    overall: number;
    issues?: string | null;
  };
  chapterRuntimePackage?: ChapterRuntimePackage | null;
  reviewResult: {
    issues?: Array<{ category: string; fixSuggestion: string }>;
  } | null;
  openAuditIssues: Array<{ id: string; auditType: string; fixSuggestion: string }>;
  repairStreamContent: string;
  isRepairStreaming: boolean;
  repairStreamingChapterId?: string | null;
  repairStreamingChapterLabel?: string | null;
  repairRunStatus?: Extract<SSEFrame, { type: "run_status" }> | null;
  onAbortRepair: () => void;
}

function PanelHintCard(props: { title: string; content: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/90 p-3">
      <div className="text-xs text-muted-foreground">{props.title}</div>
      <div className="mt-2 text-sm leading-6 text-foreground">{props.content}</div>
    </div>
  );
}

function ReferenceNotice(props: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-sm text-amber-900">
      <div className="font-medium">{props.title}</div>
      <div className="mt-1 leading-6 text-amber-800">{props.description}</div>
    </div>
  );
}

const QUALITY_DEBT_SOURCE_LABELS: Record<ChapterQualityDebtSource, string> = {
  manual_review: "Manual review",
  pipeline_review: "AI draft review",
  repair_recheck: "Review after AI repair",
};

function formatQualityDebtAttempts(details: ChapterQualityDebtDetails): string {
  if (details.repairAttemptsUsed === null) {
    return `Attempts not recorded · up to ${details.repairAttemptsAllowed} allowed`;
  }
  if (details.repairAttemptsAllowed === 0) {
    return `${details.repairAttemptsUsed} attempts · automatic repair was disabled`;
  }
  return `${details.repairAttemptsUsed}/${details.repairAttemptsAllowed} attempts`;
}

function formatQualityDebtTime(value: string | null): string {
  if (!value) return "Time not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Time not recorded"
    : date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ChapterExecutionReferencePanel(props: ChapterExecutionReferencePanelProps) {
  const {
    selectedChapter,
    assetTab,
    onAssetTabChange,
    chapterPlan,
    latestStateSnapshot,
    chapterAuditReports,
    replanRecommendation,
    onReplanChapter,
    isReplanningChapter,
    lastReplanResult,
    chapterQualityReport,
    chapterRuntimePackage,
    reviewResult,
    openAuditIssues,
    repairStreamContent,
    isRepairStreaming,
    repairStreamingChapterId,
    repairStreamingChapterLabel,
    repairRunStatus,
    onAbortRepair,
  } = props;

  if (!selectedChapter) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-background p-4 text-sm leading-6 text-muted-foreground">
        Select a chapter to view its task sheet, scene breakdown, quality feedback, repair history, and diagnostics.
      </div>
    );
  }

  const runtimePackage = chapterRuntimePackage?.chapterId === selectedChapter.id ? chapterRuntimePackage : null;
  const chapterObjective = chapterPlan?.objective ?? selectedChapter.expectation ?? "This chapter has no defined objective yet. Add a chapter plan first.";
  const scenePlan = parseChapterScenePlanForDisplay(selectedChapter);
  const isSelectedChapterRepairStreaming = isRepairStreaming && repairStreamingChapterId === selectedChapter.id;
  const isSelectedChapterRepairFinalizing = isSelectedChapterRepairStreaming && repairRunStatus?.phase === "finalizing";
  const visibleRepairStreamContent = repairStreamingChapterId === selectedChapter.id ? repairStreamContent : "";
  const hasVisibleRepairOutput = hasText(visibleRepairStreamContent);
  const repairingOtherChapter = isRepairStreaming && repairStreamingChapterId && repairStreamingChapterId !== selectedChapter.id;
  const detailTab = assetTab === "content" ? "taskSheet" : assetTab;
  const qualityDebt = readChapterQualityDebtDetails(selectedChapter.riskFlags);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/70 bg-background p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-foreground">Chapter diagnostics</div>
            <div className="mt-1 text-sm leading-6 text-muted-foreground">
              Review this chapter's tasks, quality, and repair details without taking up space in the draft reader.
            </div>
          </div>
          <Badge variant="outline" className="shrink-0">Chapter {selectedChapter.order}</Badge>
        </div>
      </div>

      {qualityDebt ? (
        <div className="rounded-2xl bg-amber-50/80 p-4 text-sm text-amber-950">
          <div className="font-semibold">Quality items to follow up</div>
          <div className="mt-2 leading-6 text-amber-900/85">{qualityDebt.reason}</div>
          <div className="mt-3 grid gap-2 text-xs text-amber-900/75 sm:grid-cols-2">
            <span>Source: {qualityDebt.source ? QUALITY_DEBT_SOURCE_LABELS[qualityDebt.source] : "Historical quality record"}</span>
            <span>Automatic repairs: {formatQualityDebtAttempts(qualityDebt)}</span>
            <span>Recorded: {formatQualityDebtTime(qualityDebt.evaluatedAt)}</span>
          </div>
          {qualityDebt.issueCodes.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs text-amber-900/70">Issue tags</span>
              {qualityDebt.issueCodes.map((code) => <Badge key={code} variant="secondary">{code}</Badge>)}
            </div>
          ) : null}
          <Button asChild size="sm" variant="outline" className="mt-3 bg-background text-foreground">
            <Link to={`/novels/${selectedChapter.novelId}/edit?stage=pipeline&chapterId=${encodeURIComponent(selectedChapter.id)}`}>
              Open quality repair
            </Link>
          </Button>
        </div>
      ) : null}

      <Tabs value={detailTab} onValueChange={(value) => onAssetTabChange(value as AssetTabKey)}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl bg-muted/50 p-1.5">
          <TabsTrigger value="taskSheet" className="rounded-xl text-xs">Task sheet</TabsTrigger>
          <TabsTrigger value="sceneCards" className="rounded-xl text-xs">Scenes</TabsTrigger>
          <TabsTrigger value="quality" className="rounded-xl text-xs">Quality</TabsTrigger>
          <TabsTrigger value="repair" className="rounded-xl text-xs">Repair</TabsTrigger>
          <TabsTrigger value="content" className="col-span-2 rounded-xl text-xs">Context diagnostics</TabsTrigger>
        </TabsList>

        <TabsContent value="taskSheet" className="space-y-3">
          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="text-xs text-muted-foreground">Chapter task sheet</div>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-7">
              {selectedChapter.taskSheet?.trim() || "No task sheet yet. Ask AI to generate one before continuing this chapter."}
            </div>
          </div>
          <PanelHintCard title="Chapter objective" content={chapterObjective} />
          <PanelHintCard title="Latest state" content={latestStateSnapshot?.summary || "No state summary yet."} />
          <ChapterRuntimeContextCard
            runtimePackage={runtimePackage}
            chapterPlan={chapterPlan}
            stateSnapshot={latestStateSnapshot}
          />
        </TabsContent>

        <TabsContent value="sceneCards" className="space-y-3">
          <ChapterRuntimeLengthCard runtimePackage={runtimePackage} />
          {scenePlan ? (
            <div className="space-y-3">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="text-xs text-muted-foreground">Scene budget</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <MetricBadge label="Chapter target" value={`${scenePlan.targetWordCount} words`} />
                  <MetricBadge label="Scenes" value={String(scenePlan.scenes.length)} />
                </div>
              </div>
              {scenePlan.scenes.map((scene, index) => (
                <div key={scene.key} className="rounded-2xl border bg-background p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Scene {index + 1}</Badge>
                    <Badge variant="secondary">{scene.targetWordCount} words</Badge>
                  </div>
                  <div className="mt-3 text-sm font-semibold text-foreground">{scene.title}</div>
                  <div className="mt-2 text-sm leading-6 text-muted-foreground">{scene.purpose}</div>
                  <div className="mt-3 space-y-2">
                    <PanelHintCard title="Must advance" content={scene.mustAdvance.join("; ") || "None"} />
                    <PanelHintCard title="Must preserve" content={scene.mustPreserve.join("; ") || "None"} />
                    <PanelHintCard title="Entry state" content={scene.entryState} />
                    <PanelHintCard title="Exit state" content={scene.exitState} />
                  </div>
                  {scene.forbiddenExpansion.length > 0 ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm leading-6 text-amber-900">
                      Do not expand: {scene.forbiddenExpansion.join("; ")}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border bg-muted/20 p-4">
              <div className="text-xs text-muted-foreground">Scene breakdown</div>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-7">
                {selectedChapter.sceneCards?.trim()
                  ? "This is a legacy scene breakdown. Consider regenerating the chapter execution contract."
                  : "No scene breakdown yet."}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="quality" className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <MetricBadge label="Overall" value={String(chapterQualityReport?.overall ?? selectedChapter.qualityScore ?? "-")} />
            <MetricBadge label="Coherence" value={String(chapterQualityReport?.coherence ?? "-")} />
            <MetricBadge label="Repetition" value={String(chapterQualityReport?.repetition ?? "-")} />
            <MetricBadge label="Pacing" value={String(chapterQualityReport?.pacing ?? selectedChapter.pacingScore ?? "-")} />
            <MetricBadge label="Voice" value={String(chapterQualityReport?.voice ?? "-")} />
            <MetricBadge label="Engagement" value={String(chapterQualityReport?.engagement ?? "-")} />
          </div>

          <div className="rounded-2xl border p-4 text-sm">
            <div className="font-semibold text-foreground">Recent review issues</div>
            {reviewResult?.issues?.length ? (
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                {reviewResult.issues.slice(0, 5).map((item, index) => (
                  <div key={`${item.category}-${index}`} className="rounded-xl border p-3">
                    <div className="font-medium text-foreground">{item.category}</div>
                    <div className="mt-1 leading-6">{item.fixSuggestion}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-xs leading-6 text-muted-foreground">No recent review issues.</div>
            )}
          </div>

          <div className="rounded-2xl border p-4 text-sm">
            <div className="font-semibold text-foreground">Structured audit issues</div>
            {openAuditIssues.length > 0 ? (
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                {openAuditIssues.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-xl border p-3">
                    <div className="font-medium text-foreground">{item.auditType}</div>
                    <div className="mt-1 leading-6">{item.fixSuggestion}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-xs leading-6 text-muted-foreground">No structured audit issues.</div>
            )}
          </div>

          <ChapterRuntimeAuditCard
            runtimePackage={runtimePackage}
            auditReports={chapterAuditReports}
            replanRecommendation={replanRecommendation}
            onReplan={onReplanChapter}
            isReplanning={isReplanningChapter}
            lastReplanResult={lastReplanResult}
          />
        </TabsContent>

        <TabsContent value="repair" className="space-y-3">
          {repairingOtherChapter ? (
            <ReferenceNotice
              title="Another chapter is being repaired in the background"
              description={`${repairStreamingChapterLabel ?? "Another chapter"} is still being repaired. Its output won't appear here; return to that chapter to view it.`}
            />
          ) : null}

          {(isSelectedChapterRepairStreaming || hasVisibleRepairOutput) ? (
            <StreamOutput
              title="Repair output"
              emptyText={isSelectedChapterRepairFinalizing
                ? (repairRunStatus?.message ?? "Repair output is complete. The system is saving it and reviewing again.")
                : "Waiting for repair output..."}
              content={visibleRepairStreamContent}
              isStreaming={isSelectedChapterRepairStreaming}
              onAbort={isSelectedChapterRepairFinalizing ? undefined : onAbortRepair}
            />
          ) : null}

          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="text-xs text-muted-foreground">Repair history</div>
            <div className="mt-3 max-h-[420px] overflow-y-auto whitespace-pre-wrap text-sm leading-7">
              {selectedChapter.repairHistory?.trim() || "No repair history yet."}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-3">
          <ChapterRuntimeContextCard
            runtimePackage={null}
            chapterPlan={chapterPlan}
            stateSnapshot={latestStateSnapshot}
          />
          <ChapterRuntimeAuditCard
            runtimePackage={null}
            auditReports={chapterAuditReports}
            replanRecommendation={replanRecommendation}
            onReplan={onReplanChapter}
            isReplanning={isReplanningChapter}
            lastReplanResult={lastReplanResult}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
