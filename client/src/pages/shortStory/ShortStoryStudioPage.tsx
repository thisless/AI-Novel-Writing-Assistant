import { ShortStoryReferenceSummary } from "@/components/creation/ShortStoryReferenceSummary";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Download,
  FileText,
  Loader2,
  PencilLine,
  RefreshCw,
  Save,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { ShortStoryRevisionImpact } from "@ai-novel/shared/types/creationStudio";
import {
  applyShortStoryRevision,
  deriveShortStoryLongForm,
  getShortStory,
  previewShortStoryRevision,
  previewShortStoryReplan,
  retryShortStoryProduction,
  updateShortStorySegment,
} from "@/api/creationStudio";
import { downloadNovelExport } from "@/api/novel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

function createDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function ShortStoryStudioPage() {
  const novelId = useParams<{ id: string }>().id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [revisionInstruction, setRevisionInstruction] = useState("");
  const [revisionImpact, setRevisionImpact] = useState<ShortStoryRevisionImpact | null>(null);

  const storyQuery = useQuery({
    queryKey: ["short-story", novelId],
    queryFn: () => getShortStory(novelId),
    enabled: Boolean(novelId),
    refetchInterval: (query) => {
      const production = query.state.data?.data?.production;
      if (production?.diagnostic?.retryAt && Date.parse(production.diagnostic.retryAt) > Date.now()) return 1000;
      const status = production?.status;
      return status === "queued" || status === "running" ? 1800 : false;
    },
  });
  const story = storyQuery.data?.data ?? null;
  const isProducing = story?.production.status === "queued" || story?.production.status === "running";

  useEffect(() => {
    if (!story || editing) return;
    setDrafts(Object.fromEntries(story.segments.map((segment) => [segment.id, segment.content])));
  }, [story, editing]);

  const changedSegments = useMemo(() => {
    if (!story) return [];
    return story.segments.filter((segment) => (drafts[segment.id] ?? segment.content) !== segment.content);
  }, [drafts, story]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!story) return;
      for (const segment of changedSegments) {
        await updateShortStorySegment(novelId, segment.id, {
          content: drafts[segment.id] ?? segment.content,
          expectedVersion: segment.version,
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["short-story", novelId] });
      setEditing(false);
      setRevisionImpact(null);
      toast.success("Text saved. A snapshot of the previous version was preserved.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to save. Refresh and try again."),
  });

  const revisionPreviewMutation = useMutation({
    mutationFn: () => previewShortStoryRevision(novelId, { instruction: revisionInstruction.trim() }),
    onSuccess: (response) => {
      setRevisionImpact(response.data ?? null);
    },
    onError: async (error) => { await queryClient.invalidateQueries({queryKey:["short-story",novelId]}); toast.error(error instanceof Error ? error.message : "Could not interpret this revision."); },
  });

  const replanPreviewMutation = useMutation({
    mutationFn: () => previewShortStoryReplan(novelId),
    onSuccess: (response) => setRevisionImpact(response.data ?? null),
    onError: async (error) => { await queryClient.invalidateQueries({queryKey:["short-story",novelId]}); toast.error(error instanceof Error ? error.message : "Could not generate a revision plan."); },
  });

  const revisionApplyMutation = useMutation({
    mutationFn: () => {
      if (!revisionImpact) throw new Error("The revision preview has expired.");
      return applyShortStoryRevision(novelId, revisionImpact.intentVersionId);
    },
    onSuccess: async () => {
      setRevisionImpact(null);
      setRevisionInstruction("");
      await queryClient.invalidateQueries({ queryKey: ["short-story", novelId] });
      toast.success("Revision started for the confirmed scope.");
    },
    onError: async (error) => {
      setRevisionImpact(null);
      await queryClient.invalidateQueries({ queryKey: ["short-story", novelId] });
      toast.error(error instanceof Error ? error.message : "Failed to apply revision.");
    },
  });

  const exportMutation = useMutation({
    mutationFn: () => downloadNovelExport(novelId, "txt", "full", story?.novel.title),
    onSuccess: ({ blob, fileName }) => {
      createDownload(blob, fileName);
      toast.success("Export started.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Export failed."),
  });

  const deriveMutation = useMutation({
    mutationFn: () => deriveShortStoryLongForm(novelId),
    onSuccess: (response) => {
      if (response.data?.resumeRoute) navigate(response.data.resumeRoute);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not expand this into a full-length novel."),
  });

  const retryMutation = useMutation({
    mutationFn: () => retryShortStoryProduction(novelId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["short-story", novelId] });
      toast.success("Generation resumed from where it stopped.");
    },
    onError: async (error) => {
      await queryClient.invalidateQueries({ queryKey: ["short-story", novelId] });
      toast.error(error instanceof Error ? error.message : "Failed to resume generation.");
    },
  });

  if (storyQuery.isLoading) {
    return <CenteredStatus label="Opening story…" />;
  }
  if (!story) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <h1 className="text-xl font-semibold">This story is temporarily unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">Return to the story list and try again.</p>
        <Button asChild className="mt-5"><Link to="/novels">Back to stories</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-w-0 bg-muted/15 p-3 sm:p-4 xl:p-5">
      <header className="mb-4 rounded-xl border bg-background px-4 py-3 shadow-sm sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="-ml-2 shrink-0 text-muted-foreground">
                <Link to="/novels"><ArrowLeft className="mr-1.5 h-4 w-4" />Stories</Link>
              </Button>
              <span className="h-4 w-px bg-border" />
              <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{story.novel.title}</h1>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {story.intent?.understanding ?? "AI is working out the creative direction for this story."}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending || !story.continuousContent}
            >
              <Download className="mr-2 h-4 w-4" />{exportMutation.isPending ? "Exporting…" : "Export story"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => deriveMutation.mutate()}
              disabled={deriveMutation.isPending || isProducing}
            >
              <BookOpen className="mr-2 h-4 w-4" />{deriveMutation.isPending ? "Preparing…" : "Expand into a novel"}
            </Button>
          </div>
        </div>
      </header>

      {story.reference ? <div className="mb-4"><ShortStoryReferenceSummary reference={story.reference} /></div> : null}
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <main className="min-w-0 space-y-4">
          {isProducing ? (
            <Card className="border-primary/20 bg-primary/[0.03] shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="truncate font-medium">{story.production.currentAction ?? "AI is writing the full story"}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">{Math.round(story.production.progress * 100)}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.max(3, Math.round(story.production.progress * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {story.production.recoveryAction ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm" role="status">
              <div className="font-medium text-destructive">
                {story.production.recoveryAction === "preview_replan" ? "Review the new story direction"
                  : story.production.recoveryAction === "preview_revision" ? "Review the revision scope"
                  : story.production.recoveryAction === "retry_revision" ? "Revision paused" : "Generation paused"}
              </div>
              <p className="mt-1 break-words text-muted-foreground">
                {story.production.checkpointSummary ?? story.production.diagnostic?.message ?? story.production.error ?? "You can continue from the saved content."}
              </p>
              {story.production.recoveryAction === "preview_replan" ? (
                <Button className="mt-3" size="sm" onClick={() => { setRevisionImpact(null); replanPreviewMutation.mutate(); }}
                  disabled={replanPreviewMutation.isPending || revisionApplyMutation.isPending || editing}>
                  {replanPreviewMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {replanPreviewMutation.isPending ? "Preparing revision plan…" : "Review revision plan"}
                </Button>
              ) : story.production.recoveryAction === "preview_revision" ? (
                <p className="mt-2 text-muted-foreground">Saved text and its previous-version snapshot will be preserved. Describe your request under “Revise the story in one sentence,” then preview and confirm.</p>
              ) : (
                <Button className="mt-3" variant="outline" size="sm" onClick={() => retryMutation.mutate()}
                  disabled={retryMutation.isPending || editing || revisionPreviewMutation.isPending || Boolean(story.production.diagnostic?.retryAt && Date.parse(story.production.diagnostic.retryAt) > Date.now())}>
                  {retryMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  {story.production.recoveryAction === "retry_revision" ? "Continue revision" : "Continue generation"}
                </Button>
              )}
              {story.production.diagnostic ? (
                <details className="mt-3 text-xs leading-6 text-muted-foreground">
                  <summary className="cursor-pointer">View failure details</summary>
                  <p>{story.production.diagnostic.message}</p>
                  <p>Diagnostic ID: {story.production.diagnostic.id} · Attempts: {story.production.diagnostic.attempts}</p>
                  <p>Model: {story.production.diagnostic.provider ?? "Unknown"} / {story.production.diagnostic.model ?? "Unknown"}</p>
                  <p>Finish reason: {story.production.diagnostic.response.finishReason ?? "Unknown"} · HTTP: {story.production.diagnostic.response.httpStatus ?? "Unknown"}</p>
                  {story.production.diagnostic.retryAt ? <p>Retry time: {new Date(story.production.diagnostic.retryAt).toLocaleString("en-US")}</p> : null}
                </details>
              ) : null}
              {revisionImpact?.mode === "replan" ? (
                <RevisionPreview
                  impact={revisionImpact}
                  applying={revisionApplyMutation.isPending || editing || isProducing || replanPreviewMutation.isPending}
                  onCancel={() => setRevisionImpact(null)}
                  onConfirm={() => revisionApplyMutation.mutate()}
                />
              ) : null}
            </div>
          ) : null}

          <section className="min-w-0 overflow-hidden rounded-xl border bg-background shadow-sm">
            <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-medium">{editing ? "Edit story" : "Complete draft"}</div>
                  <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                    {story.continuousContent.replace(/\s+/g, "").length.toLocaleString("en-US")} characters
                    {editing && changedSegments.length > 0 ? ` · ${changedSegments.length} unsaved changes` : ""}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDrafts(Object.fromEntries(story.segments.map((segment) => [segment.id, segment.content])));
                        setEditing(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || changedSegments.length === 0}>
                      {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save changes
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={isProducing || revisionApplyMutation.isPending || revisionPreviewMutation.isPending || replanPreviewMutation.isPending || story.segments.length === 0}>
                    <PencilLine className="mr-2 h-4 w-4" />Edit directly
                  </Button>
                )}
              </div>
            </div>

            <article className="min-h-[calc(100vh-15rem)] px-5 py-7 sm:px-8 sm:py-9 xl:px-10 2xl:px-12">
              {story.segments.length === 0 ? (
                <div className="flex min-h-[45vh] items-center justify-center text-sm text-muted-foreground">
                  {isProducing ? "The first section will appear here when it is ready." : "No story text yet."}
                </div>
              ) : editing ? (
                <div className="overflow-hidden rounded-lg border border-input bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                  {story.segments.map((segment) => (
                    <textarea
                      key={segment.id}
                      aria-label="Story text"
                      value={drafts[segment.id] ?? segment.content}
                      onChange={(event) => setDrafts((current) => ({ ...current, [segment.id]: event.target.value }))}
                      className="block w-full resize-none border-0 bg-transparent px-5 py-3 text-[16px] leading-8 outline-none first:pt-6 last:pb-6"
                      style={{ minHeight: `${Math.max(180, Math.ceil((drafts[segment.id] ?? segment.content).length / 42) * 32)}px` }}
                    />
                  ))}
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-[16px] leading-8 text-foreground selection:bg-primary/15">
                  {story.continuousContent || "Story generation is still in progress."}
                </div>
              )}
            </article>
          </section>
        </main>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card className="border-primary/15 shadow-sm">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold">
                  <WandSparkles className="h-4 w-4 text-primary" />
                  Revise the story in one sentence
                </div>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">Preview the impact first. AI will revise the text only after you confirm.</p>
              </div>
              <textarea
                value={revisionInstruction}
                onChange={(event) => {
                  setRevisionInstruction(event.target.value);
                  setRevisionImpact(null);
                }}
                placeholder="For example: Make the ending warmer while keeping the protagonist's final choice."
                className="min-h-32 w-full resize-y rounded-lg border border-input bg-background px-3.5 py-3 text-sm leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                disabled={isProducing || story.production.recoveryAction === "preview_replan"}
              />
              <Button
                className="w-full"
                onClick={() => revisionPreviewMutation.mutate()}
                disabled={!revisionInstruction.trim() || revisionPreviewMutation.isPending || replanPreviewMutation.isPending || revisionApplyMutation.isPending || editing || isProducing || story.production.recoveryAction === "preview_replan"}
              >
                {revisionPreviewMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Preview revision scope
              </Button>

              {story.production.diagnostic && !story.production.recoveryAction && !revisionPreviewMutation.isPending ? <div className="rounded-lg bg-destructive/5 p-3 text-sm leading-6" role="status">
                <p>{story.production.diagnostic.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">Diagnostic ID: {story.production.diagnostic.id} · Attempts: {story.production.diagnostic.attempts}</p>
              </div> : null}
              {revisionImpact && revisionImpact.mode !== "replan" ? (
                <RevisionPreview
                  impact={revisionImpact}
                  applying={revisionApplyMutation.isPending || editing || isProducing || replanPreviewMutation.isPending || revisionPreviewMutation.isPending}
                  onCancel={() => setRevisionImpact(null)}
                  onConfirm={() => revisionApplyMutation.mutate()}
                />
              ) : null}
            </CardContent>
          </Card>

          <details className="rounded-xl border bg-background px-4 py-3 text-sm shadow-sm">
            <summary className="cursor-pointer font-medium">Story direction and suggestions</summary>
            <div className="mt-4 space-y-4 border-t pt-4 text-muted-foreground">
              <div>
                <div className="text-xs font-medium text-foreground">Creative direction</div>
                <p className="mt-1.5 leading-6">{story.intent?.direction.premise ?? "Not generated yet"}</p>
              </div>
              {story.plan?.qualityDebt.length ? (
                <div>
                  <div className="text-xs font-medium text-foreground">Areas to improve</div>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5">
                    {story.plan.qualityDebt.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ) : (
                <p>No general quality suggestions need attention.</p>
              )}
            </div>
          </details>
        </aside>
      </div>
    </div>
  );
}

function RevisionPreview(props: {
  impact: ShortStoryRevisionImpact;
  applying: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const impact = props.impact;
  const strategyLabel = impact.recommendedStrategy === "local_patch"
    ? "Make a focused edit"
    : impact.recommendedStrategy === "rewrite_downstream"
      ? "Revise downstream sections"
      : "Replan the entire story";
  return (
    <div className={impact.mode === "replan" ? "mt-4 rounded-lg bg-background/80 p-4" : "rounded-xl border border-primary/25 bg-primary/[0.03] p-4"}>
      <div className="font-medium">{impact.mode === "replan" ? "Story revision plan" : "How AI understands the revision"}</div>
      <p className="mt-2 text-sm leading-6">{impact.understoodGoal}</p>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <PreviewFact label="Suggested approach" value={strategyLabel} />
        <PreviewFact label="Affected sections" value={String(impact.affectedSegmentIds.length)} />
        <PreviewFact label="Ending" value={impact.changesEnding ? "Will change" : "Preserved"} />
        <PreviewFact label="Core intent" value={impact.changesCoreIntent ? "Will change" : "Preserved"} />
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{impact.summary}</p>
      {impact.direction ? <div className="mt-4 text-sm leading-6"><strong>{impact.direction.title}</strong><p>{impact.direction.premise}</p></div> : null}
      {impact.endingPromise ? <p className="mt-3 text-sm leading-6"><strong>Ending plan:</strong> {impact.endingPromise}</p> : null}
      {impact.preservedFacts?.length ? <div className="mt-3 text-sm leading-6"><strong>Preserved story facts</strong><ul className="list-disc pl-5">{impact.preservedFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul></div> : null}
      {impact.segmentPurposes?.length ? <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-6">{impact.segmentPurposes.map((segment) => <li key={segment.order}>{segment.purpose}</li>)}</ol> : null}
      <p className="mt-3 text-xs leading-5 text-muted-foreground">Confirm to generate the revision and update the story when complete. Closing the preview keeps the current text unchanged.</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={props.onCancel} disabled={props.applying}>Not now</Button>
        <Button onClick={props.onConfirm} disabled={props.applying}>
          {props.applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {impact.mode === "replan" ? "Confirm and continue" : "Confirm and apply"}
        </Button>
      </div>
    </div>
  );
}

function PreviewFact(props: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background px-3 py-2">
      <div className="text-xs text-muted-foreground">{props.label}</div>
      <div className="mt-1 font-medium">{props.value}</div>
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
