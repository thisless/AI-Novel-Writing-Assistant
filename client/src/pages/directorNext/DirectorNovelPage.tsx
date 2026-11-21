import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { getDirectorRunDetail, getDirectorRuntimeStatus, getDirectorSummary, getDirectorWorkspace, type DirectorDriver } from "@/api/directorNext";
import {directorPollInterval} from "./polling";
import { getNovelDetail } from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import DirectorPanel from "@/components/directorNext/DirectorPanel";
import DirectorBadge from "@/components/directorNext/DirectorBadge";
import {OutlineBookSource} from "@/components/outlines/OutlineBookSource";
import OutlineWritingControls from "@/components/outlines/OutlineWritingControls";
import DirectorStart from "@/components/directorNext/DirectorStart";
import { ResizableWorkspace } from "@/components/layout/resizableWorkspace";
import { previewStates, previewTimeline, previewView } from "./preview";
import { NovelWorkspace, previewBook, resolveSavedReview } from "./workspace";
import { useGenerationFollow, useWorkspaceActivity } from "./generation";
import DirectorVersionControl from "@/components/directorVersion/DirectorVersionControl";
import { DirectorChapterEditor, DirectorChapterPlanEditor } from "./workspace/editing";

export default function DirectorNovelPage({ previewOnly = false }: { previewOnly?: boolean }) {
  const { novelId: routeNovelId = "" } = useParams();
  const novelId = previewOnly ? "preview" : routeNovelId;
  const [params, setParams] = useSearchParams();
  const location=useLocation();
  const navigate = useNavigate();
  const preview = novelId === "preview";
  const queryClient = useQueryClient();
  const [editingChapterId, setEditingChapterId] = useState<string|null>(null);
  const [editedChapter, setEditedChapter] = useState<{id:string;revision:number}|null>(null);
  useEffect(()=>{setEditingChapterId(null);setEditedChapter(null);},[novelId]);
  const follow = useGenerationFollow(novelId, preview);
  useEffect(()=>{
    const type=params.get("review");
    if (!preview && type && [...params.keys()].some(key=>key!=="review")) setParams({review:type},{replace:true});
  },[params,preview,setParams]);
  const [directorOpen, setDirectorOpen] = useState(true);
  const poll = (query: {state: {error: unknown; errorUpdateCount: number}}) => directorPollInterval(query.state.error, query.state.errorUpdateCount);
  const summaryQuery = useQuery({ queryKey: queryKeys.directorNext.summary(novelId), queryFn: () => getDirectorSummary(novelId), enabled: !preview && !!novelId, retry: false, refetchInterval: poll });
  const runId = summaryQuery.data?.data?.runId;
  const detailQuery = useQuery({ queryKey: [...queryKeys.directorNext.detail(novelId),runId], queryFn: () => getDirectorRunDetail(runId!), enabled: !preview && !!runId && !summaryQuery.isError, retry: false, refetchInterval: poll });
  const diagnosticQuery = useQuery({queryKey: ["directorRuntimeStatus",novelId], queryFn: () => getDirectorRuntimeStatus(novelId), enabled: !preview && !!novelId && (summaryQuery.isError || detailQuery.isError), retry: false, refetchInterval: false});
  const bookQuery = useQuery({ queryKey: ["directorBookWorkspace",novelId], queryFn: () => getDirectorWorkspace(novelId), enabled: !preview && !!novelId, retry: false, refetchInterval: query => query.state.error ? directorPollInterval(query.state.error,query.state.errorUpdateCount) : 10000 });
  const book = preview ? previewBook : bookQuery.data?.data;
  const savedReview=book ? resolveSavedReview(book,params) : null;
  const detail = detailQuery.data?.data;
  const novelQuery = useQuery({queryKey: ["directorNovelMetadata",novelId],queryFn:()=>getNovelDetail(novelId),enabled:!preview && !!novelId,retry:false});
  const view = preview ? previewView(params.get("state") ?? "running") : detail?.view ?? summaryQuery.data?.data;
  useWorkspaceActivity(novelId, preview, view?.workspaceActivity, detail ? detailQuery.dataUpdatedAt : summaryQuery.dataUpdatedAt);
  const error = detailQuery.error ?? summaryQuery.error;
  const diagnostic = diagnosticQuery.data?.data;
  const metadata = novelQuery.data?.data;
  useEffect(() => {
    if (!preview && metadata?.directorVersion === "v1") navigate(`/novels/${encodeURIComponent(novelId)}/edit`, {replace: true});
  }, [metadata?.directorVersion, navigate, novelId, preview]);
  const startForm = !preview && book && metadata ? (range: {from:number;to:number}|null, driver: DirectorDriver = "assisted") => book.outlineBinding ? <OutlineWritingControls key={`${view?.runId ?? novelId}:${book.chapters.filter(chapter=>chapter.content?.trim()).length}`} book={book} initialStory={metadata.description ?? ""} worldId={metadata.worldId}/> : <DirectorStart key={`${view?.runId ?? novelId}:${range?.from ?? "planning"}`} novelId={novelId} estimatedChapterCount={book.novel.estimatedChapterCount} nextChapter={Math.max(0,...book.chapters.filter(chapter=>chapter.content?.trim()).map(chapter=>chapter.order))+1} initialStory={metadata.description ?? ""} worldId={metadata.worldId} suggestedRange={range} initialDriver={driver}/> : null;

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1920px] flex-col gap-3">
      <header className="flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border/60 pb-2">
        <div className="flex min-w-0 flex-1 basis-full flex-wrap items-center gap-x-4 gap-y-2 lg:basis-auto">
          <h1 title={book?.novel.title} className="min-w-0 truncate text-lg font-semibold">{book?.novel.title ?? "Novel writing"}</h1>
          {!preview ? <DirectorVersionControl novelId={novelId} version="v2"/> : <span className="text-sm">Director V2</span>}
          {!error && view ? <DirectorBadge view={view} novelId={novelId} modeOnly/> : null}
          <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm" title="Automatically open materials or chapters as they're generated. Chapter text supports live preview.">
            <input type="checkbox" checked={follow.enabled} disabled={preview || !!editingChapterId} onChange={event => follow.setEnabled(event.target.checked)} className="h-4 w-4 accent-primary"/>
            Follow generation
          </label>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1 [&_button]:h-8 [&_a]:h-8">
          {!previewOnly ? <Button asChild variant="ghost"><Link to="/novels">Back to library</Link></Button> : null}
          <Button variant="ghost" aria-expanded={directorOpen} onClick={() => setDirectorOpen(open => !open)}>{directorOpen ? "Hide Director panel" : "Show Director panel"}</Button>
          {params.has("review") ? <Button asChild variant="ghost"><Link to={`/lab/director/${encodeURIComponent(novelId)}`}>Back to this novel</Link></Button> : null}
          {!previewOnly ? <Button asChild variant="ghost"><Link to="/lab/director">Run history</Link></Button> : null}
          {!preview ? <Button asChild variant="ghost"><Link to={`/novels/${encodeURIComponent(novelId)}/ai-usage`}>AI usage</Link></Button> : null}
        </div>
      </header>
      {book?.outlineBinding ? <OutlineBookSource binding={book.outlineBinding}/> : null}
      {follow.disconnected ? <p role="status" className="text-xs text-muted-foreground">The chapter preview connection was interrupted and is reconnecting. The writing task is still running.</p> : null}
      {preview ? <details className="rounded-md bg-muted/30 px-4 py-3"><summary className="cursor-pointer text-xs text-muted-foreground">Sample preview · Switch Director state</summary><p className="mt-3 text-xs text-muted-foreground">This page uses sample content; writing commands are disabled.</p><div className="mt-3 flex flex-wrap gap-2">{previewStates.map((state) => <Button key={state.id} size="sm" variant={(params.get("state") ?? "running") === state.id ? "default" : "ghost"} onClick={() => setParams({ state: state.id })}>{state.label}</Button>)}</div></details> : null}
      <ResizableWorkspace id="director-novel-layout" className="min-h-0 flex-1" label="Adjust the width of the manuscript and Director panel" defaultLeft={76} minLeft={580} minRight={280} breakpoint={920} left={<div className="flex h-full min-h-0 min-w-0 flex-col">
          {!preview && bookQuery.isError ? <div role="alert" className="mb-4 space-y-2 rounded-md bg-destructive/5 p-4"><p className="text-sm text-destructive">Couldn't load this novel's content. {book ? "You can still view the last loaded content." : ""}</p><Button variant="outline" size="sm" onClick={() => void bookQuery.refetch()}>Reload novel</Button></div> : null}
          {book ? <NovelWorkspace key={novelId} book={book} preview={preview} review={params} onLeaveReview={()=>setParams({})} followGeneration={follow.enabled && !editingChapterId} generation={follow.snapshot} activity={view?.workspaceActivity} onEditChapter={preview ? undefined : setEditingChapterId} editedChapter={editedChapter} /> : <p className="py-12 text-sm text-muted-foreground">{bookQuery.isLoading ? "Loading novel content…" : "No content to display."}</p>}
        </div>} right={directorOpen ? <aside aria-label="Director panel" className="h-full min-h-0 min-w-0 overflow-y-auto overscroll-contain">
          {!preview && error ? <div role="alert" className="space-y-3 py-4"><p className="text-sm text-destructive">{error instanceof Error ? error.message : "Couldn't load Director information."}</p>
            {diagnostic ? <div className="space-y-2 text-sm"><p>Saved run status: {diagnostic.status} · version {diagnostic.controlVersion}</p>{diagnostic.lastFailure ? <p>Most recent interruption: {diagnostic.lastFailure.message}</p> : null}<p className="text-muted-foreground">Writing progress is temporarily unavailable. Resolve the issue and reload.</p></div> : diagnosticQuery.isError ? <p className="text-sm">Run diagnostics are also temporarily unavailable.</p> : null}
            <Button variant="outline" onClick={() => void Promise.all([summaryQuery.refetch(), ...(runId ? [detailQuery.refetch()] : []), diagnosticQuery.refetch()])}>Reload</Button></div>
            : view ? <DirectorPanel view={view} novelId={novelId} outlineBound={Boolean(book?.outlineBinding)} timeline={preview ? previewTimeline : detail?.timeline} preview={preview} startForm={startForm} reviewTarget={savedReview ? location.pathname+location.search : undefined} reviewReady={Boolean(savedReview?.ready) && !bookQuery.isError} reviewRunId={savedReview?.runId} reviewVersion={savedReview?.controlVersion}
                renderPlanEditor={!preview && !bookQuery.isError && savedReview?.ready && savedReview.type==="chapter_task_sheet" && savedReview.plan ? input=><DirectorChapterPlanEditor novelId={novelId} plan={savedReview.plan!} {...input}/> : undefined}/>
              : <p className="py-4 text-sm text-muted-foreground">{summaryQuery.isLoading || detailQuery.isLoading ? "Loading Director information…" : "Choose a writing range to continue with AI using this novel's content."}</p>}
          {!error && !view ? startForm?.(null):null}
        </aside> : null}/>
      {!preview && editingChapterId ? <DirectorChapterEditor key={`${novelId}:${editingChapterId}`} novelId={novelId} chapterId={editingChapterId}
        onClose={()=>setEditingChapterId(null)} onSaved={async()=>{
          await queryClient.invalidateQueries({queryKey:["directorBookWorkspace",novelId]});
          setEditedChapter(previous=>({id:editingChapterId,revision:(previous?.revision ?? 0)+1}));
        }}/> : null}
    </div>
  );
}
