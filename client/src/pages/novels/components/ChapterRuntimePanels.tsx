import type { ChapterRuntimePackage } from "@ai-novel/shared/types/chapterRuntime";
import type { AuditReport, ReplanRecommendation, ReplanResult, StoryPlan, StoryStateSnapshot } from "@ai-novel/shared/types/novel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildReplanRecommendationFromAuditReports } from "../chapterPlanning.shared";

function parseStringArray(value: string | null | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item ?? "").trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function buildPlanView(runtimePackage: ChapterRuntimePackage | null, chapterPlan: StoryPlan | null | undefined) {
  if (runtimePackage?.context.plan) {
    return runtimePackage.context.plan;
  }
  if (!chapterPlan) {
    return null;
  }
  return {
    id: chapterPlan.id,
    chapterId: chapterPlan.chapterId ?? null,
    planRole: chapterPlan.planRole ?? null,
    phaseLabel: chapterPlan.phaseLabel ?? null,
    title: chapterPlan.title,
    objective: chapterPlan.objective,
    participants: parseStringArray(chapterPlan.participantsJson),
    reveals: parseStringArray(chapterPlan.revealsJson),
    riskNotes: parseStringArray(chapterPlan.riskNotesJson),
    mustAdvance: parseStringArray(chapterPlan.mustAdvanceJson),
    mustPreserve: parseStringArray(chapterPlan.mustPreserveJson),
    sourceIssueIds: parseStringArray(chapterPlan.sourceIssueIdsJson),
    replannedFromPlanId: chapterPlan.replannedFromPlanId ?? null,
    hookTarget: chapterPlan.hookTarget ?? null,
    rawPlanJson: chapterPlan.rawPlanJson ?? null,
    scenes: chapterPlan.scenes ?? [],
    createdAt: chapterPlan.createdAt,
    updatedAt: chapterPlan.updatedAt,
  };
}

function buildStateView(runtimePackage: ChapterRuntimePackage | null, stateSnapshot: StoryStateSnapshot | null | undefined) {
  if (runtimePackage?.context.stateSnapshot) {
    return runtimePackage.context.stateSnapshot;
  }
  if (!stateSnapshot) {
    return null;
  }
  return stateSnapshot;
}

function buildOpenConflictView(runtimePackage: ChapterRuntimePackage | null) {
  return runtimePackage?.context.openConflicts ?? [];
}

function buildAuditView(runtimePackage: ChapterRuntimePackage | null, auditReports: AuditReport[] | undefined) {
  if (runtimePackage?.audit) {
    return runtimePackage.audit;
  }
  const reports = auditReports ?? [];
  const openIssues = reports.flatMap((report) => report.issues).filter((issue) => issue.status === "open");
  const reportScores = reports
    .map((report) => report.overallScore ?? null)
    .filter((score): score is number => typeof score === "number");
  const overall = reportScores.length > 0
    ? Math.round(reportScores.reduce((sum, score) => sum + score, 0) / reportScores.length)
    : 0;
  return {
    score: {
      coherence: overall,
      repetition: overall,
      pacing: overall,
      voice: overall,
      engagement: overall,
      overall,
    },
    reports,
    openIssues,
    hasBlockingIssues: openIssues.some((issue) => issue.severity === "high" || issue.severity === "critical"),
  };
}

function buildReplanSummary(
  runtimePackage: ChapterRuntimePackage | null,
  auditReports: AuditReport[] | undefined,
  replanRecommendation?: ReplanRecommendation | null,
) {
  if (runtimePackage?.replanRecommendation) {
    return runtimePackage.replanRecommendation;
  }
  if (replanRecommendation) {
    return replanRecommendation;
  }
  return buildReplanRecommendationFromAuditReports(auditReports);
}

function buildTriggerLabel(triggerType: string): string {
  switch (triggerType) {
    case "manual":
      return "Manual";
    case "auto_milestone":
      return "Auto milestone";
    case "before_pipeline":
      return "Before pipeline";
    default:
      return triggerType.replace(/_/g, " ");
  }
}

function buildWordControlModeLabel(mode: "prompt_only" | "balanced" | "hybrid" | string): string {
  switch (mode) {
    case "prompt_only":
      return "Natural length";
    case "balanced":
      return "Standard length control";
    case "hybrid":
      return "Hybrid length control";
    default:
      return mode;
  }
}

function formatVariance(value: number): string {
  const percentage = Math.round(value * 100);
  return `${percentage > 0 ? "+" : ""}${percentage}%`;
}

function SeverityBadge({ severity }: { severity: string }) {
  const variant = severity === "critical" || severity === "high" ? "default" : "secondary";
  return <Badge variant={variant}>{severity}</Badge>;
}

export function ChapterRuntimeLengthCard(props: {
  runtimePackage: ChapterRuntimePackage | null;
}) {
  const lengthControl = props.runtimePackage?.lengthControl ?? null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Length control and execution replay</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {lengthControl ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Control mode</div>
                <div className="mt-1 font-medium">{buildWordControlModeLabel(lengthControl.wordControlMode)}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {lengthControl.closingPhaseTriggered ? "Closing phase reached" : "Continuing normally"}
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Target and result</div>
                <div className="mt-1 font-medium">{lengthControl.finalWordCount} / {lengthControl.targetWordCount} words</div>
                <div className="mt-1 text-xs text-muted-foreground">Variance {formatVariance(lengthControl.variance)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Target range</div>
                <div className="mt-1 font-medium">{lengthControl.softMinWordCount}–{lengthControl.softMaxWordCount} words</div>
                <div className="mt-1 text-xs text-muted-foreground">Hard limit: {lengthControl.hardMaxWordCount} words</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-xs text-muted-foreground">Execution signals</div>
                <div className="mt-1 font-medium">Hard stops: {lengthControl.hardStopsTriggered}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  scene {lengthControl.generatedSceneCount}/{lengthControl.plannedSceneCount}
                </div>
              </div>
            </div>

            <div className="rounded-md border p-3 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">Length adjustment path</div>
              <div className="mt-1">
                {lengthControl.lengthRepairPath.length > 0
                  ? lengthControl.lengthRepairPath.join(" -> ")
                  : "No additional length adjustments were triggered."}
              </div>
              <div className="mt-1">
                {lengthControl.overlengthRepairApplied ? "An overlength adjustment was applied." : "No overlength adjustment was applied."}
              </div>
            </div>

            {lengthControl.sceneResults.length > 0 ? (
              <div className="space-y-2">
                {lengthControl.sceneResults.map((scene, index) => (
                  <div key={`${scene.sceneIndex}-${index}`} className="rounded-md border p-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">Scene {scene.sceneIndex}</Badge>
                      <Badge variant="secondary">{scene.actualWordCount} words</Badge>
                      <Badge variant="outline">{buildWordControlModeLabel(scene.wordControlMode)}</Badge>
                      <Badge variant={scene.sceneStatus === "compressed" ? "default" : "outline"}>{scene.sceneStatus}</Badge>
                    </div>
                    <div className="mt-2 text-muted-foreground">
                      {scene.roundCount} rounds, {scene.hardStopCount} hard stops
                      {scene.closingPhaseTriggered ? "; includes closing-phase control" : ""}
                    </div>
                    {scene.roundResults.length > 0 ? (
                      <div className="mt-2 space-y-1 rounded-md border bg-muted/15 p-2">
                        {scene.roundResults.map((round) => (
                          <div key={`${scene.sceneIndex}-${round.roundIndex}`} className="text-muted-foreground">
                            Round {round.roundIndex}: suggested {round.suggestedWordCount ?? "-"} words, actual {round.actualWordCount} words;{" "}
                            {round.isFinalRound ? "final round" : "intermediate round"},{" "}
                            {round.hardStopTriggered ? "hard stop triggered" : "ended naturally"}
                            {round.trimmedAtSentenceBoundary ? "; trimmed at a sentence boundary" : ""}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div className="text-muted-foreground">No length-control replay yet. Results will appear here after this chapter is generated.</div>
        )}
      </CardContent>
    </Card>
  );
}

export function ChapterRuntimeContextCard(props: {
  runtimePackage: ChapterRuntimePackage | null;
  chapterPlan?: StoryPlan | null;
  stateSnapshot?: StoryStateSnapshot | null;
}) {
  const plan = buildPlanView(props.runtimePackage, props.chapterPlan);
  const stateSnapshot = buildStateView(props.runtimePackage, props.stateSnapshot);
  const openConflicts = buildOpenConflictView(props.runtimePackage);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Chapter goals and context</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="space-y-1">
          <div className="font-medium">Chapter plan</div>
          {plan ? (
            <>
              <div className="text-muted-foreground">{plan.title}</div>
              <div>{plan.objective}</div>
              {(plan.planRole || plan.phaseLabel) ? (
                <div className="text-xs text-muted-foreground">
                  {[plan.planRole ? `Role: ${plan.planRole}` : "", plan.phaseLabel ? `Phase: ${plan.phaseLabel}` : ""].filter(Boolean).join(" | ")}
                </div>
              ) : null}
              {plan.participants.length > 0 ? (
                <div className="text-xs text-muted-foreground">Characters involved: {plan.participants.join(", ")}</div>
              ) : null}
              {plan.mustAdvance.length > 0 ? (
                <div className="text-xs text-muted-foreground">Must advance: {plan.mustAdvance.join("; ")}</div>
              ) : null}
              {plan.mustPreserve.length > 0 ? (
                <div className="text-xs text-muted-foreground">Must preserve: {plan.mustPreserve.join("; ")}</div>
              ) : null}
              {plan.replannedFromPlanId ? (
                <div className="text-xs text-muted-foreground">This chapter was changed by a replan.</div>
              ) : null}
              {plan.sourceIssueIds.length > 0 ? (
                <div className="text-xs text-muted-foreground">This chapter addresses {plan.sourceIssueIds.length} open audit issues.</div>
              ) : null}
              {plan.scenes.length > 0 ? (
                <div className="space-y-1 rounded-md border p-2 text-xs">
                  {plan.scenes.slice(0, 4).map((scene) => (
                    <div key={scene.id}>
                      <div className="font-medium">{scene.sortOrder}. {scene.title}</div>
                      <div className="text-muted-foreground">
                        {[scene.objective, scene.conflict, scene.reveal, scene.emotionBeat].filter(Boolean).join(" | ") || "No additional details"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="text-muted-foreground">No chapter plan yet.</div>
          )}
        </div>

        <div className="space-y-1">
          <div className="font-medium">State snapshot</div>
          {stateSnapshot ? (
            <>
              <div>{stateSnapshot.summary || "No summary yet"}</div>
              {stateSnapshot.characterStates.length > 0 ? (
                <div className="rounded-md border p-2 text-xs">
                  {stateSnapshot.characterStates.slice(0, 4).map((item) => (
                    <div key={item.characterId} className="text-muted-foreground">
                      {item.summary || item.emotion || item.currentGoal || item.characterId}
                    </div>
                  ))}
                </div>
              ) : null}
              {stateSnapshot.informationStates.length > 0 ? (
                <div className="text-xs text-muted-foreground">
                  Knowledge state: {stateSnapshot.informationStates.slice(0, 3).map((item) => item.fact).join("; ")}
                </div>
              ) : null}
            </>
          ) : (
            <div className="text-muted-foreground">No state snapshot yet.</div>
          )}
        </div>

        <div className="space-y-1">
          <div className="font-medium">Active conflicts</div>
          {openConflicts.length > 0 ? (
            <div className="space-y-2">
              {openConflicts.slice(0, 4).map((item) => (
                <div key={item.id} className="rounded-md border p-2 text-xs">
                  <div className="mb-1 flex items-center gap-2">
                    <SeverityBadge severity={item.severity} />
                    <span className="font-medium">{item.title}</span>
                  </div>
                  <div>{item.summary}</div>
                  {typeof item.lastSeenChapterOrder === "number" ? (
                    <div className="mt-1 text-muted-foreground">Last seen: Chapter {item.lastSeenChapterOrder}</div>
                  ) : null}
                  {item.resolutionHint ? (
                    <div className="mt-1 text-muted-foreground">Suggestion: {item.resolutionHint}</div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">No active conflicts.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ChapterRuntimeAuditCard(props: {
  runtimePackage: ChapterRuntimePackage | null;
  auditReports?: AuditReport[];
  replanRecommendation?: ReplanRecommendation | null;
  onReplan?: () => void;
  isReplanning?: boolean;
  lastReplanResult?: ReplanResult | null;
}) {
  const audit = buildAuditView(props.runtimePackage, props.auditReports);
  const scoreAvailable = props.runtimePackage
    ? props.runtimePackage.meta?.scoreAvailable !== false && !props.runtimePackage.meta?.riskTags?.includes("acceptance_gate_unavailable")
    : (props.auditReports ?? []).some(report => typeof report.overallScore === "number");
  const replanSummary = buildReplanSummary(
    props.runtimePackage,
    props.auditReports,
    props.replanRecommendation,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Current issues and suggested fixes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <div className="font-medium">{scoreAvailable ? `Overall score: ${audit.score.overall}` : "Review is incomplete; no score available"}</div>
          <Badge variant={audit.hasBlockingIssues ? "default" : "outline"}>
            {audit.hasBlockingIssues ? "Needs attention" : "Ready to continue"}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {audit.reports.length} audit reports, {audit.openIssues.length} unresolved issues.
        </div>
        {replanSummary ? (
          <div className="rounded-md border p-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">
                Future chapter plan: {replanSummary.recommended ? "Replan recommended" : "No changes recommended"}
              </div>
              {typeof props.onReplan === "function" ? (
                <Button
                  size="sm"
                  variant={replanSummary.recommended ? "default" : "outline"}
                  onClick={props.onReplan}
                  disabled={props.isReplanning}
                >
                  {props.isReplanning ? "Replanning..." : replanSummary.recommended ? "Run replan" : "View replan"}
                </Button>
              ) : null}
            </div>
            <div className="text-muted-foreground">{replanSummary.reason}</div>
            {replanSummary.blockingIssueIds.length > 0 ? (
              <div className="mt-1 text-muted-foreground">
                High-risk issues: {replanSummary.blockingIssueIds.length}
              </div>
            ) : null}
          </div>
        ) : null}
        {props.lastReplanResult ? (
          <div className="rounded-md border bg-muted/20 p-2 text-xs">
            <div className="font-medium">Latest planning adjustment</div>
            <div className="mt-1 text-muted-foreground">
              Affected chapters: {props.lastReplanResult.affectedChapterOrders.join(", ") || "None"}
            </div>
            <div className="text-muted-foreground">
              Adjustment window: {props.lastReplanResult.windowSize} | Trigger: {buildTriggerLabel(props.lastReplanResult.triggerType)}
            </div>
            {props.lastReplanResult.sourceIssueIds.length > 0 ? (
              <div className="text-muted-foreground">
                Source issues: {props.lastReplanResult.sourceIssueIds.length}
              </div>
            ) : null}
          </div>
        ) : null}
        {audit.openIssues.length > 0 ? (
          <div className="space-y-2">
            {audit.openIssues.slice(0, 6).map((issue) => (
              <div key={issue.id} className="rounded-md border p-2 text-xs">
                <div className="mb-1 flex items-center gap-2">
                  <SeverityBadge severity={issue.severity} />
                  <span className="font-medium">{issue.code}</span>
                </div>
                <div>{issue.description}</div>
                <div className="mt-1 text-muted-foreground">Evidence: {issue.evidence}</div>
                <div className="mt-1 text-muted-foreground">Suggestion: {issue.fixSuggestion}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground">No open issues.</div>
        )}
      </CardContent>
    </Card>
  );
}
