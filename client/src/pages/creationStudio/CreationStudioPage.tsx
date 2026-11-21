import { getBookAnalysis } from "@/api/bookAnalysis";
import { ShortStoryReferenceSummary } from "@/components/creation/ShortStoryReferenceSummary";
import { isReadableBookAnalysisSection } from "@/pages/bookAnalysis/bookAnalysisWorkspaceViewModel";
import type { BookAnalysisSectionKey } from "@ai-novel/shared/types/bookAnalysis";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, Check, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type {
  CreationDirection,
  NarrativeForm,
} from "@ai-novel/shared/types/creationStudio";
import type { WritingPlatform, WritingPlatformPreference } from "@ai-novel/shared/types/writingPlatform";
import {
  confirmCreationDirection,
  getCreationStudioTask,
  interpretCreationIdea,
  regenerateCreationDirections,
} from "@/api/creationStudio";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

function normalizeTarget(form: NarrativeForm, value: number): number {
  if (form === "short_story") return Math.max(3000, Math.min(30000, Math.round(value)));
  return Math.max(50000, Math.min(3_000_000, Math.round(value)));
}

const BOOK_ANALYSIS_SECTION_LABELS: Record<BookAnalysisSectionKey, string> = {
  overview: "Analysis overview",
  plot_structure: "Plot structure",
  timeline: "Story timeline",
  character_system: "Character system",
  worldbuilding: "Worldbuilding",
  themes: "Themes",
  style_technique: "Style and technique",
  market_highlights: "Market appeal",
};

export default function CreationStudioPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const taskId = searchParams.get("taskId")?.trim() ?? "";
  const shortStoryEntry = searchParams.get("form") === "short_story";
  const longNovelEntry = searchParams.get("form") === "long_novel";
  const [referenceGoal, setReferenceGoal] = useState("Draw on the structure, pacing, and style to create a complete new short story.");
  const [referenceSections, setReferenceSections] = useState<BookAnalysisSectionKey[]>([]);
  const [idea, setIdea] = useState("");
  const [selectedDirectionId, setSelectedDirectionId] = useState("");
  const [narrativeForm, setNarrativeForm] = useState<NarrativeForm>("short_story");
  const [targetWordCount, setTargetWordCount] = useState(8000);
  const [confirmedBaseline, setConfirmedBaseline] = useState("");
  const [initialPlatformPreference, setInitialPlatformPreference] = useState<WritingPlatformPreference>("ai_recommend");
  const [writingPlatform, setWritingPlatform] = useState<WritingPlatform>("fanqie_free");

  const taskQuery = useQuery({
    queryKey: ["creation-studio", taskId],
    queryFn: () => getCreationStudioTask(taskId),
    enabled: Boolean(taskId),
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      return status === "queued" || status === "running" ? 1500 : false;
    },
    retry: false,
  });
  const task = taskQuery.data?.data ?? null;
  const [retryClock, setRetryClock] = useState(Date.now);
  const retryAt = task?.diagnostic?.retryAt;
  const retryWaiting = Boolean(retryAt && Date.parse(retryAt) > retryClock);
  useEffect(() => {
    if (!retryWaiting) return;
    const timer = window.setTimeout(() => setRetryClock(Date.now()), 1000);
    return () => window.clearTimeout(timer);
  }, [retryWaiting, retryClock]);
  const interpretation = task?.interpretation ?? null;
  const referenceAnalysisId = searchParams.get("bookAnalysisId") ?? task?.referenceSelection?.analysisId ?? "";
  const referenceDocumentId = searchParams.get("sourceDocumentId") ?? task?.referenceSelection?.documentId ?? "";
  const referenceRequested = Boolean(referenceAnalysisId || referenceDocumentId || task?.reference);
  const referenceQuery = useQuery({ queryKey: ["short-story-reference", referenceAnalysisId],
    queryFn: () => getBookAnalysis(referenceAnalysisId), enabled: Boolean(referenceAnalysisId && !interpretation), retry: false });
  const sourceAnalysis = referenceQuery.data?.data;
  const availableReferenceSections = sourceAnalysis?.sections.filter((section) =>
    (section.status === "succeeded" || section.frozen) && isReadableBookAnalysisSection(section)
  ) ?? [];
  const referenceUnavailable = referenceRequested && !interpretation && (!sourceAnalysis || sourceAnalysis.documentId !== referenceDocumentId || sourceAnalysis.status !== "succeeded");
  const referenceSelectionReady = !referenceRequested || (!referenceUnavailable && Boolean(referenceGoal.trim()) && referenceSections.length > 0);
  const canGenerateWithoutIdea = referenceRequested && referenceSelectionReady;
  useEffect(() => {
    if (!sourceAnalysis) return;
    const availableKeys = new Set(availableReferenceSections.map((section) => section.sectionKey));
    const selectedKeys = task?.referenceSelection?.sectionKeys ?? availableReferenceSections.map((section) => section.sectionKey);
    setReferenceSections(selectedKeys.filter((key) => availableKeys.has(key)));
  }, [sourceAnalysis]);
  useEffect(() => {
    if (task?.referenceSelection) setReferenceGoal(task.referenceSelection.goal);
  }, [task?.taskId, task?.referenceSelection?.goal]);

  useEffect(() => {
    if (!task) return;
    setIdea((current) => current || task.idea);
    if (!interpretation) return;
    setNarrativeForm(interpretation.recommendedNarrativeForm);
    setTargetWordCount(interpretation.recommendedTargetWordCount);
    setSelectedDirectionId((current) => current || interpretation.directions[0].id);
    setWritingPlatform(interpretation.recommendedWritingPlatform);
    setConfirmedBaseline(`${interpretation.recommendedNarrativeForm}:${interpretation.recommendedTargetWordCount}:${interpretation.recommendedWritingPlatform}`);
  }, [task?.taskId, interpretation]);

  const currentScaleKey = `${narrativeForm}:${targetWordCount}:${writingPlatform}`;
  const scaleNeedsRefresh = Boolean(interpretation && confirmedBaseline && currentScaleKey !== confirmedBaseline);
  const selectedDirection = useMemo(
    () => interpretation?.directions.find((direction) => direction.id === selectedDirectionId) ?? null,
    [interpretation, selectedDirectionId],
  );

  const interpretMutation = useMutation({
    mutationFn: () => taskId && task?.status === "failed" ? regenerateCreationDirections(taskId, {
      ...(referenceRequested ? {reference:{analysisId:referenceAnalysisId,documentId:referenceDocumentId,sectionKeys:referenceSections,goal:referenceGoal.trim()}} : {}),
      narrativeForm: referenceRequested || shortStoryEntry ? "short_story" : narrativeForm,
      targetWordCount, writingPlatformPreference: initialPlatformPreference,
    }) : interpretCreationIdea({
      ...(referenceRequested ? {reference:{analysisId:referenceAnalysisId,documentId:referenceDocumentId,sectionKeys:referenceSections,goal:referenceGoal.trim()}} : {}),
      idea: idea.trim(),
      preferredNarrativeForm: shortStoryEntry ? "short_story" : undefined,
      ...(longNovelEntry ? {preferredNarrativeForm: "long_novel" as const} : {}),
      writingPlatformPreference: initialPlatformPreference,
    }),
    onSuccess: (response) => {
      const created = response.data;
      if (!created) return;
      queryClient.setQueryData(["creation-studio", created.taskId], response);
      setSearchParams({ taskId: created.taskId, ...(referenceRequested ? {form:"short_story"} : {}) }, { replace: true });
      if (created.status === "failed") { toast.error(created.diagnostic?.message ?? created.error ?? "The story directions were not completed. Review the failure details to continue."); return; }
      toast.success("AI has prepared two story directions.");
    },
    onError: async (error) => {
      if (taskId) await queryClient.invalidateQueries({ queryKey: ["creation-studio", taskId] });
      toast.error(error instanceof Error ? error.message : "Could not interpret this idea. Try again.");
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: () => regenerateCreationDirections(taskId, {
      narrativeForm,
      targetWordCount: normalizeTarget(narrativeForm, targetWordCount),
      writingPlatformPreference: writingPlatform,
      feedback: "Revise both directions to fit the updated story length and target platform.",
    }),
    onSuccess: async (response) => {
      setConfirmedBaseline(`${narrativeForm}:${normalizeTarget(narrativeForm, targetWordCount)}:${writingPlatform}`);
      setSelectedDirectionId(response.data?.interpretation?.directions[0].id ?? "");
      await queryClient.invalidateQueries({ queryKey: ["creation-studio", taskId] });
      toast.success("Directions updated for the new story length.");
    },
    onError: async (error) => { await queryClient.invalidateQueries({queryKey:["creation-studio",taskId]}); toast.error(error instanceof Error ? error.message : "Failed to update directions."); },
  });

  const confirmMutation = useMutation({
    mutationFn: () => {
      if (!selectedDirection) throw new Error("Select a direction first.");
      return confirmCreationDirection(taskId, {
        directionId: selectedDirection.id,
        narrativeForm,
        targetWordCount: normalizeTarget(narrativeForm, targetWordCount),
        idempotencyKey: `creation:${taskId}:${selectedDirection.id}`,
        writingPlatform,
      });
    },
    onSuccess: (response) => {
      if (response.data?.resumeRoute) navigate(response.data.resumeRoute);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to start writing."),
  });

  if (taskId && taskQuery.isLoading) {
    return <CenteredStatus label="Restoring your idea…" />;
  }

  return (
    <div className="w-full space-y-10 px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-3 text-muted-foreground hover:text-foreground">
          <Link to="/novels"><ArrowLeft className="mr-2 h-4 w-4" />Back to stories</Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
          <Link to="/novels/create">
            Full setup
            <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      <section className="w-full pt-3 sm:pt-8">
        <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
          {shortStoryEntry ? "Short story · 3,000–30,000 words" : "AI Writing Studio"}
        </div>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-foreground sm:text-5xl lg:text-[3.5rem]">
          {shortStoryEntry ? "Turn a spark of an idea into a complete short story" : "Turn a spark of an idea into a complete story"}
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
          {shortStoryEntry
            ? "Write a scene, a character, or an emotion you want to explore. AI will shape it into two clear directions, then write the complete story after you choose one."
            : "You don't need to plan the structure first. Describe what you want to express, and AI will suggest a story length and two clear directions."}
        </p>
      </section>

      {task?.status === "failed" ? <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm" role="status">
        <p>{task.diagnostic?.message ?? task.error ?? "Directions are not ready yet. You can continue from this page."}</p>
        {task.diagnostic ? <p className="mt-2 text-xs text-muted-foreground">Diagnostic ID: {task.diagnostic.id} · Attempts: {task.diagnostic.attempts} · {task.diagnostic.model ?? "Unknown model"}</p> : null}
        {retryWaiting && retryAt ? <p className="mt-2 text-xs text-muted-foreground">Try again after {new Date(retryAt).toLocaleTimeString("en-US")}.</p> : null}
        {interpretation ? <Button className="mt-3" variant="outline" onClick={() => regenerateMutation.mutate()} disabled={regenerateMutation.isPending || retryWaiting}>Regenerate directions</Button> : null}
      </div> : null}
      {task?.reference ? <div className="space-y-3"><ShortStoryReferenceSummary reference={task.reference} confirmed={Boolean(task.novelId)} />
        {task.reference.sourceState !== "available" && !task.novelId ? <Button variant="outline" onClick={() => regenerateMutation.mutate()} disabled={regenerateMutation.isPending || retryWaiting}>Reload reference and generate directions</Button> : null}
      </div> : referenceRequested ? <section className="space-y-3 rounded-xl bg-muted/30 p-4" aria-label="Reference writing settings">
        <p className="text-sm font-medium">Reference novel: {sourceAnalysis?.documentTitle ?? "Loading reference…"}</p>
        {referenceUnavailable && !referenceQuery.isLoading ? <p className="text-sm text-destructive">The reference is unavailable or its analysis is incomplete. Return to the reference novel page and choose another source.</p> : null}
        <label className="block text-sm">What would you like to draw on?<Input className="mt-2" value={referenceGoal} maxLength={4000} onChange={(event) => setReferenceGoal(event.target.value)} /></label>
        <div className="flex flex-wrap gap-4 text-sm" aria-label="Choose analysis findings">{availableReferenceSections.map((section) => <label className="flex items-center gap-2" key={section.sectionKey}>
          <input type="checkbox" checked={referenceSections.includes(section.sectionKey)} onChange={(event) => setReferenceSections((keys) => event.target.checked ? [...keys,section.sectionKey] : keys.filter((key) => key !== section.sectionKey))} />
          {BOOK_ANALYSIS_SECTION_LABELS[section.sectionKey] ?? section.sectionKey}
        </label>)}</div>
      </section> : null}
      {!interpretation ? (
        <section
          aria-labelledby="creation-idea-heading"
          className="mx-auto w-full max-w-4xl rounded-2xl bg-muted/20 p-3 shadow-[0_14px_44px_rgba(15,23,42,0.06)] transition focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/30 sm:p-4"
        >
          <div className="flex items-start justify-between gap-4 px-1 pt-1">
            <div>
              <div className="text-xs font-medium text-muted-foreground">01 · Your idea</div>
              <h2 id="creation-idea-heading" className="mt-2 text-xl font-semibold tracking-[-0.02em]">
                Where does the story begin?
              </h2>
            </div>
            {idea ? (
              <span className="pt-1 text-xs tabular-nums text-muted-foreground">
                {idea.length.toLocaleString()} / 12,000
              </span>
            ) : null}
          </div>
          <textarea
            value={idea}
            readOnly={Boolean(taskId)}
            onChange={(event) => setIdea(event.target.value)}
            placeholder={referenceRequested
              ? "Optional. AI can create an original short story from the reference; you can also add a new character or conflict…"
              : "For example: A girl who can always hear lies meets the one person whose honesty she can't discern…"}
            aria-label={shortStoryEntry ? "Describe a short story idea" : "Describe a story idea"}
            className="mt-5 min-h-[180px] w-full resize-none bg-transparent px-1 py-1 text-base leading-7 text-foreground outline-none placeholder:text-muted-foreground/60 sm:text-lg sm:leading-8"
            maxLength={12000}
            autoFocus
          />
          <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <span className="shrink-0">Target platform</span>
              <Select
                value={initialPlatformPreference}
                onValueChange={(value) => setInitialPlatformPreference(value as WritingPlatformPreference)}
              >
                <SelectTrigger aria-label="Choose target platform" className="h-9 min-w-[11rem] rounded-md px-2.5 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai_recommend">Let AI choose</SelectItem>
                  <SelectItem value="fanqie_free">Fanqie Free Web Fiction</SelectItem>
                  {!shortStoryEntry ? <SelectItem value="qidian_male">Qidian (male-oriented)</SelectItem> : null}
                  {!shortStoryEntry ? <SelectItem value="jinjiang_female">Jinjiang (female-oriented)</SelectItem> : null}
                  <SelectItem value="zhihu_story">Zhihu Short Stories</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="text-xs leading-5 text-muted-foreground">{referenceRequested ? "You can leave this blank; AI will create original short story directions from the reference." : "A character, an image, or a conflict is enough to get started."}</span>
              <Button
                size="lg"
                className="h-11 rounded-full px-6 shadow-none"
                onClick={() => interpretMutation.mutate()}
                disabled={(!idea.trim() && !canGenerateWithoutIdea) || interpretMutation.isPending || retryWaiting || !referenceSelectionReady}
              >
                {interpretMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate story directions
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <div className="space-y-6">
          <Card className="border-border/70 bg-muted/20">
            <CardContent className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_18rem]">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-primary">How AI understands your story</div>
                <p className="mt-2 text-sm leading-7 text-foreground">{interpretation.understanding}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{interpretation.recommendationReason}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Platform recommendation: {interpretation.writingPlatformReason}</p>
                {interpretation.productionFoundation ? (
                  <div className="mt-4 border-t border-border/60 pt-3">
                    <div className="text-xs text-muted-foreground">AI-recommended foundation</div>
                    <div className="mt-1 text-sm font-medium text-foreground">
                      {interpretation.productionFoundation.genre.path}
                      <span className="mx-2 text-muted-foreground">×</span>
                      {interpretation.productionFoundation.primaryStoryMode.path}
                      {interpretation.productionFoundation.secondaryStoryMode
                        ? ` + ${interpretation.productionFoundation.secondaryStoryMode.path}`
                        : ""}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {interpretation.productionFoundation.summary}
                    </p>
                  </div>
                ) : null}
              </div>
              <ScaleControls
                shortOnly={referenceRequested}
                narrativeForm={narrativeForm}
                targetWordCount={targetWordCount}
                onFormChange={(form) => {
                  setNarrativeForm(form);
                  setTargetWordCount(form === "short_story" ? 8000 : 200000);
                  setWritingPlatform("fanqie_free");
                }}
                onTargetChange={setTargetWordCount}
                writingPlatform={writingPlatform}
                onPlatformChange={setWritingPlatform}
              />
            </CardContent>
          </Card>

          {scaleNeedsRefresh ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/60 bg-amber-50/50 px-4 py-3 dark:bg-amber-950/10">
              <p className="text-sm text-muted-foreground">The story length or target platform changed. Ask AI to adapt the directions.</p>
              <Button
                variant="outline"
                onClick={() => regenerateMutation.mutate()}
                disabled={regenerateMutation.isPending}
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", regenerateMutation.isPending && "animate-spin")} />
                Update directions
              </Button>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {interpretation.directions.map((direction) => (
              <DirectionCard
                key={direction.id}
                direction={direction}
                selected={direction.id === selectedDirectionId}
                onSelect={() => setSelectedDirectionId(direction.id)}
              />
            ))}
          </div>

          <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-2xl border bg-background/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium">{selectedDirection ? `Start with “${selectedDirection.title}”` : "Choose a direction"}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {narrativeForm === "short_story" ? "A complete short story will be generated." : "Auto Director will continue preparing the full-length novel."}
              </div>
            </div>
            <Button
              size="lg"
              onClick={() => confirmMutation.mutate()}
              disabled={!selectedDirection || scaleNeedsRefresh || confirmMutation.isPending || task?.status === "failed" || Boolean(task?.reference && task.reference.sourceState !== "available")}
            >
              {confirmMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Confirm direction and start
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DirectionCard(props: {
  direction: CreationDirection;
  selected: boolean;
  onSelect: () => void;
}) {
  const direction = props.direction;
  return (
    <button type="button" className="h-full text-left" onClick={props.onSelect} aria-pressed={props.selected}>
      <Card className={cn(
        "h-full transition hover:border-primary/50 hover:shadow-sm",
        props.selected && "border-primary ring-2 ring-primary/15",
      )}>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-semibold">{direction.title}</h2>
            <span className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
              props.selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
            )}>
              {props.selected ? <Check className="h-3.5 w-3.5" /> : null}
            </span>
          </div>
          <p className="text-sm leading-7 text-foreground">{direction.premise}</p>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <DirectionFact label="Core experience" value={direction.coreExperience} />
            <DirectionFact label="Protagonist" value={direction.protagonist} />
            <DirectionFact label="Central conflict" value={direction.centralConflict} />
            <DirectionFact label="Ending promise" value={direction.endingPromise} />
          </div>
          <div className="flex flex-wrap gap-2">
            {direction.styleKeywords.map((keyword) => (
              <span key={keyword} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{keyword}</span>
            ))}
          </div>
        </CardContent>
      </Card>
    </button>
  );
}

function DirectionFact(props: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{props.label}</div>
      <div className="mt-1 leading-6">{props.value}</div>
    </div>
  );
}

function ScaleControls(props: {
  shortOnly?: boolean;
  narrativeForm: NarrativeForm;
  targetWordCount: number;
  onFormChange: (value: NarrativeForm) => void;
  onTargetChange: (value: number) => void;
  writingPlatform: WritingPlatform;
  onPlatformChange: (value: WritingPlatform) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border bg-background p-4">
      <div className="text-xs font-medium text-muted-foreground">Story length</div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="sm"
          variant={props.narrativeForm === "short_story" ? "default" : "outline"}
          onClick={() => props.onFormChange("short_story")}
        >
          Short story
        </Button>
        <Button
          type="button"
          size="sm"
          variant={props.narrativeForm === "long_novel" ? "default" : "outline"}
          disabled={props.shortOnly}
          onClick={() => props.onFormChange("long_novel")}
        >
          Novel
        </Button>
      </div>
      <label className="block">
        <span className="text-xs text-muted-foreground">Target word count</span>
        <Input
          className="mt-1"
          type="number"
          min={props.narrativeForm === "short_story" ? 3000 : 30001}
          max={props.narrativeForm === "short_story" ? 30000 : 3000000}
          step={1000}
          value={props.targetWordCount}
          onChange={(event) => props.onTargetChange(Number(event.target.value))}
        />
      </label>
      <div className="block">
        <span className="text-xs text-muted-foreground">Target platform</span>
        <Select
          value={props.writingPlatform}
          onValueChange={(value) => props.onPlatformChange(value as WritingPlatform)}
        >
          <SelectTrigger className="mt-1 h-10 rounded-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fanqie_free">Fanqie Free Web Fiction</SelectItem>
            {props.narrativeForm === "long_novel" ? <SelectItem value="qidian_male">Qidian (male-oriented)</SelectItem> : null}
            {props.narrativeForm === "long_novel" ? <SelectItem value="jinjiang_female">Jinjiang (female-oriented)</SelectItem> : null}
            {props.narrativeForm === "short_story" ? <SelectItem value="zhihu_story">Zhihu Short Stories</SelectItem> : null}
          </SelectContent>
        </Select>
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">AI will adapt the opening, pacing, payoff, and prose style for the selected platform.</p>
      </div>
    </div>
  );
}

function CenteredStatus({ label }: { label: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}
