import { useEffect, useState } from "react";
import AiButton from "@/components/common/AiButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BookPayoffLedgerCard from "./BookPayoffLedgerCard";
import CollapsibleSummary from "./CollapsibleSummary";
import WorldInjectionHint from "./WorldInjectionHint";
import type { OutlineTabViewProps } from "./NovelEditView.types";
import DirectorTakeoverEntryPanel from "./DirectorTakeoverEntryPanel";
import SelectControl from "@/components/common/SelectControl";
import OutlineCurrentVolumeWorkspace from "./outline/OutlineCurrentVolumeWorkspace";
import OutlineResourceCommitments from "./outline/OutlineResourceCommitments";
import type { VolumeBeatImpactItem } from "@ai-novel/shared/types/novel";

type OutlineWorkspaceTab = "current" | "strategy" | "assets";

function versionStatusLabel(status: "draft" | "active" | "frozen"): string {
  if (status === "active") return "Active";
  if (status === "frozen") return "Frozen";
  return "Draft";
}

function versionStatusVariant(status: "draft" | "active" | "frozen"): "secondary" | "outline" | "default" {
  if (status === "active") return "default";
  if (status === "frozen") return "outline";
  return "secondary";
}

const readinessSteps = [
  {
    key: "canGenerateStrategy",
    label: "Volume strategy",
    description: "Review the recommended volume count, planning depth, and escalation ladder.",
  },
  {
    key: "canGenerateSkeleton",
    label: "Volume outline",
    description: "Define each volume's opening hook, source of pressure, and payoff.",
  },
  {
    key: "canGenerateBeatSheet",
    label: "Beat sheet",
    description: "Break down each volume's pacing after its outline is stable.",
  },
  {
    key: "canGenerateChapterList",
    label: "Chapter breakdown",
    description: "Break the plan down into chapters after the beat sheet is ready.",
  },
] as const;

function getNextOutlineAction(readiness: OutlineTabViewProps["readiness"]): string {
  if (!readiness.canGenerateStrategy) return "Generate a volume strategy";
  if (!readiness.canGenerateSkeleton) return "Generate the full volume outline";
  if (!readiness.canGenerateBeatSheet) return "The volume outline is ready. Next, create a beat sheet or chapter breakdown.";
  if (!readiness.canGenerateChapterList) return "Create a beat sheet for this volume before breaking it into chapters.";
  return "The volume strategy is ready. Continue with the beat sheet or chapter breakdown.";
}

function getVolumeScaleProfileLabel(profile: OutlineTabViewProps["volumeCountGuidance"]["volumeScaleProfile"]): string {
  const labels: Record<OutlineTabViewProps["volumeCountGuidance"]["volumeScaleProfile"], string> = {
    short: "Short-form",
    compact: "Compact novella",
    standard: "Standard novel",
    long: "Extended novel",
    epic: "Epic",
    mega: "Long-form epic",
  };
  return labels[profile] ?? "Structure recommendation";
}

function getBeatImpactStatusLabel(status: VolumeBeatImpactItem["status"]): string {
  if (status === "locked_with_draft") return "Locked by existing prose";
  if (status === "pending") return "Pending generation";
  return "Can apply to unwritten section";
}

function getBeatImpactStatusVariant(status: VolumeBeatImpactItem["status"]): "secondary" | "outline" | "default" {
  if (status === "locked_with_draft") return "secondary";
  if (status === "pending") return "outline";
  return "default";
}

function formatBeatChapterOrders(chapterOrders: number[]): string {
  if (chapterOrders.length === 0) {
    return "Chapters pending generation";
  }
  const sorted = chapterOrders.slice().sort((left, right) => left - right);
  return sorted[0] === sorted[sorted.length - 1]
    ? `Chapter ${sorted[0]}`
    : `Chapters ${sorted[0]}-${sorted[sorted.length - 1]}`;
}

export default function OutlineTab(props: OutlineTabViewProps) {
  const {
    worldInjectionSummary,
    hasCharacters,
    hasUnsavedVolumeDraft,
    generationNotice,
    readiness,
    volumeCountGuidance,
    customVolumeCountEnabled,
    customVolumeCountInput,
    onCustomVolumeCountEnabledChange,
    onCustomVolumeCountInputChange,
    onApplyCustomVolumeCount,
    onRestoreSystemRecommendedVolumeCount,
    strategyPlan,
    critiqueReport,
    isGeneratingStrategy,
    onGenerateStrategy,
    isCritiquingStrategy,
    onCritiqueStrategy,
    isGeneratingSkeleton,
    onGenerateSkeleton,
    onGoToCharacterTab,
    onGoToStructuredTab,
    latestStateSnapshot,
    payoffLedger,
    characterResources = [],
    draftText,
    volumes,
    onVolumeFieldChange,
    onOpenPayoffsChange,
    onAddVolume,
    onRemoveVolume,
    onMoveVolume,
    onSave,
    isSaving,
    volumeMessage,
    volumeVersions,
    selectedVersionId,
    onSelectedVersionChange,
    onCreateDraftVersion,
    isCreatingDraftVersion,
    onLoadSelectedVersionToDraft,
    onActivateVersion,
    isActivatingVersion,
    onFreezeVersion,
    isFreezingVersion,
    onLoadVersionDiff,
    isLoadingVersionDiff,
    diffResult,
    onAnalyzeDraftImpact,
    isAnalyzingDraftImpact,
    onAnalyzeVersionImpact,
    isAnalyzingVersionImpact,
    impactResult,
  } = props;

  const selectedVersion = volumeVersions.find((item) => item.id === selectedVersionId);
  const completedReadinessCount = readinessSteps.filter((item) => readiness[item.key]).length;
  const readinessProgress = Math.round((completedReadinessCount / Math.max(readinessSteps.length, 1)) * 100);
  const nextOutlineAction = getNextOutlineAction(readiness);
  const outlineStageReady = completedReadinessCount === readinessSteps.length;
  const [selectedVolumeId, setSelectedVolumeId] = useState(volumes[0]?.id ?? "");
  const [workspaceTab, setWorkspaceTab] = useState<OutlineWorkspaceTab>("current");
  const volumeCountModeLabel = volumeCountGuidance.userPreferredVolumeCount != null
    ? `Fixed at ${volumeCountGuidance.userPreferredVolumeCount} volumes`
    : volumeCountGuidance.respectedExistingVolumeCount != null
      ? `Using ${volumeCountGuidance.respectedExistingVolumeCount} volumes from the current draft`
      : `Using the system recommendation of ${volumeCountGuidance.systemRecommendedVolumeCount} volumes`;
  const volumeScaleProfileLabel = getVolumeScaleProfileLabel(volumeCountGuidance.volumeScaleProfile);

  useEffect(() => {
    if (!volumes.some((volume) => volume.id === selectedVolumeId)) {
      setSelectedVolumeId(volumes[0]?.id ?? "");
    }
  }, [selectedVolumeId, volumes]);

  const selectedVolume = volumes.find((volume) => volume.id === selectedVolumeId) ?? volumes[0];

  return (
    <div className="space-y-5">
      <DirectorTakeoverEntryPanel
        title="Resume volume strategy"
        description="AI will check whether the volume strategy and outline are complete, then either fill in missing parts or rerun the current step."
        entry={props.directorTakeoverEntry}
      />
      <section className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm">
      <div className="border-b border-border/60 bg-[linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--muted)/0.38)_100%)] px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">Volume strategy</h2>
              <Badge variant={outlineStageReady ? "default" : "outline"}>
                {completedReadinessCount}/{readinessSteps.length} ready
              </Badge>
              {hasUnsavedVolumeDraft ? <Badge variant="secondary">Unsaved draft</Badge> : null}
            </div>
            <div className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Define how the story progresses across volumes, then review the current volume's promise, pressure, payoff, and setup for the next volume.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <AiButton variant="outline" onClick={onGenerateStrategy} disabled={isGeneratingStrategy}>
              {isGeneratingStrategy ? "Generating..." : "Generate volume strategy"}
            </AiButton>
            <AiButton variant="outline" onClick={onCritiqueStrategy} disabled={isCritiquingStrategy || !strategyPlan}>
              {isCritiquingStrategy ? "Reviewing..." : "Review strategy with AI"}
            </AiButton>
            <AiButton onClick={onGenerateSkeleton} disabled={isGeneratingSkeleton || !readiness.canGenerateSkeleton}>
              {isGeneratingSkeleton ? "Generating..." : volumes.length > 0 ? "Regenerate volume outline" : "Generate volume outline"}
            </AiButton>
            <Button variant="secondary" onClick={onSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save volume workspace"}
            </Button>
          </div>
        </div>
      </div>
      <div className="space-y-5 p-5">
        <WorldInjectionHint worldInjectionSummary={worldInjectionSummary} />
        {!hasCharacters ? (
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <span>Add the characters before generating a volume strategy and outline.</span>
            <Button size="sm" variant="outline" onClick={onGoToCharacterTab}>Go to characters</Button>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          <span>{generationNotice}</span>
          {hasUnsavedVolumeDraft ? <Badge variant="secondary">Unsaved draft</Badge> : null}
        </div>
        <div className="grid items-start gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <Card className="self-start border-0 bg-muted/15 shadow-none">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base">Stage readiness</CardTitle>
                  <Badge variant={outlineStageReady ? "default" : "outline"}>
                    {completedReadinessCount}/{readinessSteps.length} ready
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-xl bg-background/70 p-3">
                  <div className="text-xs text-muted-foreground">Recommended next step</div>
                  <div className="mt-1 font-medium text-foreground">{nextOutlineAction}</div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${readinessProgress}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {outlineStageReady
                      ? "The volume strategy is ready to move forward."
                      : readiness.blockingReasons.length > 0
                        ? `${readiness.blockingReasons.length} blocking items still need attention.`
                        : "You can continue with this stage."}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {readinessSteps.map((item) => (
                    <div key={item.key} className="rounded-xl bg-background/70 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-foreground">{item.label}</div>
                        <Badge variant={readiness[item.key] ? "default" : "outline"}>
                          {readiness[item.key] ? "Ready" : "Not ready"}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</div>
                    </div>
                  ))}
                </div>

                {readiness.blockingReasons.length > 0 ? (
                  <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                    {readiness.blockingReasons.map((reason) => <div key={reason}>{reason}</div>)}
                  </div>
                ) : (
                  <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
                    This workspace is ready to move forward.
                  </div>
                )}
                {volumeMessage ? <div className="text-xs text-muted-foreground">{volumeMessage}</div> : null}
              </CardContent>
            </Card>

            <details className="group border-t border-border/60 pt-4">
              <summary className="cursor-pointer list-none">
                <CollapsibleSummary
                  title="Volume count and strategy review"
                  description="These details support planning. Start with the recommended next step and current volume, then expand this section for strategy review or volume-count controls."
                  meta={<Badge variant="outline">{volumeCountModeLabel}</Badge>}
                />
              </summary>

              <div className="mt-4 space-y-3">
                <Card className="self-start border-0 bg-muted/15 shadow-none">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <CardTitle className="text-base">Volume count recommendation</CardTitle>
                      <Badge variant="outline">{volumeCountModeLabel}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-background/70 p-3">
                        <div className="text-xs text-muted-foreground">Total chapter budget</div>
                        <div className="mt-1 text-lg font-semibold text-foreground">{volumeCountGuidance.chapterBudget} chapters</div>
                      </div>
                      <div className="rounded-xl bg-background/70 p-3">
                        <div className="text-xs text-muted-foreground">Recommended structural range</div>
                        <div className="mt-1 text-lg font-semibold text-foreground">
                          {volumeCountGuidance.decisionVolumeCountRange.min}-{volumeCountGuidance.decisionVolumeCountRange.max} volumes
                        </div>
                      </div>
                      <div className="rounded-xl bg-background/70 p-3">
                        <div className="text-xs text-muted-foreground">System-recommended volume count</div>
                        <div className="mt-1 text-lg font-semibold text-foreground">{volumeCountGuidance.systemRecommendedVolumeCount} volumes</div>
                      </div>
                      <div className="rounded-xl bg-background/70 p-3">
                        <div className="text-xs text-muted-foreground">Default detailed-planning range</div>
                        <div className="mt-1 text-lg font-semibold text-foreground">
                          {volumeCountGuidance.hardPlannedVolumeRange.min}-{volumeCountGuidance.hardPlannedVolumeRange.max} volumes
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-background/70 p-3 text-xs leading-6 text-muted-foreground">
                      Current structure: {volumeScaleProfileLabel}. {volumeCountGuidance.volumeCountRationale}
                      The chapter budget still considers {volumeCountGuidance.targetChapterRange.min}-{volumeCountGuidance.targetChapterRange.max} chapters per volume,
                      but the recommendation prioritizes stage promises, shifts in appeal, escalating stakes, and payoffs.
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={customVolumeCountEnabled ? "default" : "outline"}
                        onClick={() => onCustomVolumeCountEnabledChange(!customVolumeCountEnabled)}
                      >
                        {customVolumeCountEnabled ? "Hide custom volume count" : "Set custom volume count"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={onRestoreSystemRecommendedVolumeCount}>
                        Restore system recommendation
                      </Button>
                    </div>

                    {customVolumeCountEnabled ? (
                      <div className="rounded-xl bg-background/70 p-3">
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,180px)_auto_auto] sm:items-end">
                          <label className="space-y-1 text-sm">
                            <span className="text-xs text-muted-foreground">Set volume count</span>
                            <input
                              type="number"
                              min={volumeCountGuidance.allowedVolumeCountRange.min}
                              max={volumeCountGuidance.allowedVolumeCountRange.max}
                              className="w-full rounded-md border bg-background p-2"
                              value={customVolumeCountInput}
                              onChange={(event) => onCustomVolumeCountInputChange(event.target.value)}
                            />
                          </label>
                          <Button size="sm" onClick={onApplyCustomVolumeCount}>Apply volume count</Button>
                          <div className="text-xs text-muted-foreground">
                            Allowed range: {volumeCountGuidance.allowedVolumeCountRange.min}-{volumeCountGuidance.allowedVolumeCountRange.max} volumes. A custom count overrides the structural recommendation.
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                {critiqueReport ? (
                  <Card className="self-start border-0 bg-muted/15 shadow-none">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base">Volume strategy review</CardTitle>
                        <Badge variant={critiqueReport.overallRisk === "high" ? "secondary" : critiqueReport.overallRisk === "medium" ? "outline" : "default"}>
                          Risk: {critiqueReport.overallRisk}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="rounded-md border p-3 text-xs text-muted-foreground">{critiqueReport.summary}</div>
                      {critiqueReport.issues.length > 0 ? (
                        <div className="space-y-2">
                          {critiqueReport.issues.map((issue) => (
                            <div key={`${issue.targetRef}-${issue.title}`} className="rounded-md border p-3 text-xs">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{issue.targetRef}</Badge>
                                <Badge variant={issue.severity === "high" ? "secondary" : issue.severity === "medium" ? "outline" : "default"}>
                                  {issue.severity}
                                </Badge>
                              </div>
                              <div className="mt-2 font-medium">{issue.title}</div>
                              <div className="mt-1 text-muted-foreground">{issue.detail}</div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </details>
          </div>

          <details className="group border-t border-border/60 pt-4">
            <summary className="cursor-pointer list-none">
              <CollapsibleSummary
                title="Derived text, version control, and impact analysis"
                description="These tools are for review and comparison; you don't need to keep them open while editing the current volume outline."
              />
            </summary>

            <div className="mt-4 space-y-3">
              <Card className="self-start border-0 bg-muted/15 shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">Derived text preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea className="min-h-[220px] w-full rounded-md border bg-muted/20 p-3 text-sm" readOnly value={draftText} />
                </CardContent>
              </Card>

              <Card className="self-start border-0 bg-muted/15 shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">Version control</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {volumeVersions.length > 0 ? (
                    <>
                      <SelectControl className="w-full rounded-md border bg-background p-2 text-sm" value={selectedVersionId} onChange={(event) => onSelectedVersionChange(event.target.value)}>
                        {volumeVersions.map((version) => (
                          <option key={version.id} value={version.id}>
                            V{version.version} · {versionStatusLabel(version.status)}
                          </option>
                        ))}
                      </SelectControl>
                      {selectedVersion ? (
                        <div className="rounded-md border p-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">V{selectedVersion.version}</span>
                            <Badge variant={versionStatusVariant(selectedVersion.status)}>
                              {versionStatusLabel(selectedVersion.status)}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">Created: {new Date(selectedVersion.createdAt).toLocaleString()}</div>
                          <div className="mt-1 line-clamp-4 text-xs text-muted-foreground">{selectedVersion.diffSummary || "No change summary"}</div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="text-xs text-muted-foreground">No volume versions yet. Save a draft version first.</div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={onCreateDraftVersion} disabled={isCreatingDraftVersion || volumes.length === 0}>
                      {isCreatingDraftVersion ? "Saving..." : "Save as draft version"}
                    </Button>
                    <Button variant="outline" onClick={onLoadSelectedVersionToDraft} disabled={!selectedVersionId}>Replace current draft</Button>
                    <Button variant="secondary" onClick={onActivateVersion} disabled={isActivatingVersion || !selectedVersionId}>
                      {isActivatingVersion ? "Activating..." : "Set as active"}
                    </Button>
                    <Button variant="outline" onClick={onFreezeVersion} disabled={isFreezingVersion || !selectedVersionId}>
                      {isFreezingVersion ? "Freezing..." : "Freeze current version"}
                    </Button>
                    <Button variant="outline" onClick={onLoadVersionDiff} disabled={isLoadingVersionDiff || !selectedVersionId}>
                      {isLoadingVersionDiff ? "Loading..." : "View version differences"}
                    </Button>
                  </div>
                  {diffResult ? (
                    <div className="rounded-md border p-2 text-xs">
                      <div className="font-medium">Changes in v{diffResult.version}</div>
                      <div className="text-muted-foreground">Volumes changed: {diffResult.changedVolumeCount} | Chapters affected: {diffResult.changedChapterCount} | Lines changed: {diffResult.changedLines}</div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="self-start border-0 bg-muted/15 shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">Impact analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <AiButton variant="outline" onClick={onAnalyzeDraftImpact} disabled={isAnalyzingDraftImpact || volumes.length === 0}>
                      {isAnalyzingDraftImpact ? "Analyzing..." : "Analyze current draft"}
                    </AiButton>
                    <AiButton variant="outline" onClick={onAnalyzeVersionImpact} disabled={isAnalyzingVersionImpact || !selectedVersionId}>
                      {isAnalyzingVersionImpact ? "Analyzing..." : "Analyze current version"}
                    </AiButton>
                  </div>
                  {impactResult ? (
                    <div className="space-y-3 rounded-md border p-3 text-xs">
                      <div className="font-medium">Volume impact preview</div>
                      <div className="text-muted-foreground">Volumes affected: {impactResult.affectedVolumeCount} | Chapters affected: {impactResult.affectedChapterCount} | Lines changed: {impactResult.changedLines}</div>
                      {impactResult.affectedBeats && impactResult.affectedBeats.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {impactResult.defaultImpactAction ? <Badge variant="default">{impactResult.defaultImpactAction}</Badge> : null}
                            {typeof impactResult.staleBeatCount === "number" ? <Badge variant="outline">Unwritten beats: {impactResult.staleBeatCount}</Badge> : null}
                            {typeof impactResult.lockedBeatCount === "number" && impactResult.lockedBeatCount > 0 ? (
                              <Badge variant="secondary">Locked beats: {impactResult.lockedBeatCount}</Badge>
                            ) : null}
                          </div>
                          <div className="space-y-2">
                            {impactResult.affectedBeats.slice(0, 8).map((beat) => (
                              <div key={`${beat.volumeId}-${beat.beatKey}`} className="rounded-md bg-background/70 p-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium">Volume {beat.volumeOrder} · {beat.beatLabel}{beat.beatTitle ? ` · ${beat.beatTitle}` : ""}</span>
                                  <Badge variant={getBeatImpactStatusVariant(beat.status)}>
                                    {getBeatImpactStatusLabel(beat.status)}
                                  </Badge>
                                </div>
                                <div className="mt-1 text-muted-foreground">{formatBeatChapterOrders(beat.chapterOrders)}</div>
                              </div>
                            ))}
                          </div>
                          {impactResult.advancedImpactActions && impactResult.advancedImpactActions.length > 0 ? (
                            <div className="text-muted-foreground">
                              Advanced actions: {impactResult.advancedImpactActions.join(" / ")}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Run a volume impact analysis before activating this version.</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </details>
        </div>

        <Tabs value={workspaceTab} onValueChange={(value) => setWorkspaceTab(value as OutlineWorkspaceTab)} className="space-y-4">
          <TabsList className="h-auto flex-wrap justify-start bg-muted/60 p-1">
            <TabsTrigger value="current">Current volume</TabsTrigger>
            <TabsTrigger value="strategy">Strategy overview</TabsTrigger>
            <TabsTrigger value="assets">Asset constraints</TabsTrigger>
          </TabsList>

        <TabsContent value="strategy" className="mt-0 space-y-4">
        <Card className="border-0 bg-muted/15 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="text-base">Volume strategy summary</CardTitle>
                <div className="text-sm text-muted-foreground">Review the rewards and escalation across the whole novel, then select a volume below to edit it in detail.</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {strategyPlan ? (
                  <>
                    <Badge variant="outline">Recommended: {strategyPlan.recommendedVolumeCount} volumes</Badge>
                    <Badge variant="secondary">Detailed plans: {strategyPlan.hardPlannedVolumeCount} volumes</Badge>
                  </>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {strategyPlan ? (
              <>
                <div className="grid gap-3 xl:grid-cols-3">
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                    <div className="text-xs text-muted-foreground">Reader reward ladder</div>
                    <div className="mt-2 text-sm leading-6 text-foreground">{strategyPlan.readerRewardLadder}</div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                    <div className="text-xs text-muted-foreground">Escalation ladder</div>
                    <div className="mt-2 text-sm leading-6 text-foreground">{strategyPlan.escalationLadder}</div>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                    <div className="text-xs text-muted-foreground">Midpoint shift</div>
                    <div className="mt-2 text-sm leading-6 text-foreground">{strategyPlan.midpointShift}</div>
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 p-4 text-sm text-muted-foreground">
                  <div className="text-xs">Volume pacing overview</div>
                  <div className="mt-2 leading-6">
                    {strategyPlan.volumes
                      .map((volume) => `Volume ${volume.sortOrder}: ${volume.roleLabel}, ${volume.coreReward}`)
                      .join("；")}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
                No volume strategy yet. Select “Generate volume strategy” to get started.
              </div>
            )}
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="assets" className="mt-0 space-y-4">
        <BookPayoffLedgerCard
          latestStateSnapshot={latestStateSnapshot}
          payoffLedger={payoffLedger}
        />

        <OutlineResourceCommitments
          selectedVolume={selectedVolume}
          resources={characterResources}
        />
        </TabsContent>

        <TabsContent value="current" className="mt-0">
          <OutlineCurrentVolumeWorkspace
            selectedVolume={selectedVolume}
            strategyPlan={strategyPlan}
            volumes={volumes}
            onSelectedVolumeChange={setSelectedVolumeId}
            onAddVolume={onAddVolume}
            onRemoveVolume={onRemoveVolume}
            onMoveVolume={onMoveVolume}
            onVolumeFieldChange={onVolumeFieldChange}
            onOpenPayoffsChange={onOpenPayoffsChange}
            onGoToStructuredTab={onGoToStructuredTab}
          />
        </TabsContent>
        </Tabs>
      </div>
      </section>
    </div>
  );
}
