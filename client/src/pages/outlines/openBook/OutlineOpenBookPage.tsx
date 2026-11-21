import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { outlineOpenBookInputSchema, type OutlineOpenBookInput } from "@ai-novel/shared/types/outlineOpenBook";
import { createOutlineOpenBook, getOutline, getOutlineBookBinding, getOutlineRevision, listOutlineRevisions, previewOutlineOpenBook } from "@/api/outlines";
import { createDirectorCommandKey } from "@/api/directorNext";
import { Button } from "@/components/ui/button";
import { useIsMobileViewport } from "@/components/layout/mobile/useIsMobileViewport";
import { OutlinePreservationDetails } from "@/components/outlines/OutlinePreservationDetails";
import { findOutlineNodeTitle } from "../outlineNodes";
import { suggestedChapterCount, suggestVolumeQuotas } from "./model";
import { presentOutlineOpenBookError } from "./errorPresentation";

export default function OutlineOpenBookPage() {
  const { id = "" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobileViewport = useIsMobileViewport();
  const outline = useQuery({ queryKey: ["outline", id], queryFn: () => getOutline(id), enabled: !!id });
  const revisions = useQuery({ queryKey: ["outline-revisions", id], queryFn: () => listOutlineRevisions(id), enabled: !!id });
  const binding = useQuery({ queryKey: ["outline-book-binding", id], queryFn: () => getOutlineBookBinding(id), enabled: !!id });
  const revisionId = searchParams.get("revisionId") ?? revisions.data?.find(item=>item.version===outline.data?.currentVersion)?.id ?? "";
  const revision = revisions.data?.find(item => item.id === revisionId);
  const revisionDetail = useQuery({ queryKey: ["outline-revision", id, revisionId], queryFn: () => getOutlineRevision(id, revisionId), enabled: !!id && !!revisionId && !binding.data });
  const document = revisionDetail.data?.document;
  const currentVersion = outline.data?.currentVersion ?? 0;
  const [title, setTitle] = useState("");
  const [count, setCount] = useState(80);
  const [length, setLength] = useState(3000);
  const [quotas, setQuotas] = useState<Record<string, number>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  useEffect(() => {
    if (!document) return;
    const total=suggestedChapterCount(document);
    setTitle(document.story.title || outline.data?.title || ""); setCount(total); setQuotas(suggestVolumeQuotas(document,total));
  }, [revisionDetail.data?.id]);
  const request = useMemo<OutlineOpenBookInput>(()=>({revisionId,expectedProjectVersion:currentVersion,
    bookSettings:{title:title.trim(),estimatedChapterCount:count,defaultChapterLength:length},volumeQuotas:quotas,allowOptimize:[]}),[revisionId,currentVersion,title,count,length,quotas]);
  const requestKey=JSON.stringify(request);
  const creation=useRef<{hash:string;key:string}|null>(null);
  const preview = useMutation({ mutationFn: (input:OutlineOpenBookInput) => previewOutlineOpenBook(id,input) });
  const matches=!!preview.data && JSON.stringify(preview.variables)===requestKey;
  useEffect(()=>{setConfirmed(false);creation.current=null;},[requestKey]);
  const create = useMutation({mutationFn:()=>{
    if (!matches || !confirmed) throw new Error("Review the preview and confirm the chapter count and preserved content first.");
    const hash=preview.data!.requestHash;
    if (creation.current?.hash!==hash) creation.current={hash,key:createDirectorCommandKey()};
    return createOutlineOpenBook(id,{...preview.variables!,requestHash:hash,idempotencyKey:creation.current!.key});
  },onSuccess:result=>navigate(result.sourceRoute)});
  const back=<Button asChild variant="ghost"><Link to={`/outlines/${id}`}>Back to outline</Link></Button>;
  if (isMobileViewport) return <section className="mx-auto max-w-xl space-y-3 py-8"><h1 className="text-xl font-semibold">Confirm the outline and start a novel on desktop</h1><p className="text-sm text-muted-foreground">You can continue with a linked novel from the writing workspace.</p>{back}</section>;
  if (outline.isLoading || revisions.isLoading || binding.isLoading) return <p className="py-8 text-sm text-muted-foreground">Loading outline source and binding information…</p>;
  if (binding.isError || outline.isError || revisions.isError) return <section className="space-y-3"><p role="alert" className="text-sm text-destructive">Could not verify the outline source and binding information. Reload and try again.</p><Button variant="secondary" onClick={()=>void Promise.all([outline.refetch(),revisions.refetch(),binding.refetch()])}>Reload</Button>{back}</section>;
  // Resolve an existing binding before validating a revision deep-link: never offer a second book.
  if (binding.data) return <main className="mx-auto max-w-3xl space-y-5 py-8">{back}<h1 className="text-2xl font-semibold">Continue this novel</h1><p>{binding.data.title} · Using outline revision v{binding.data.revisionVersion}</p><p className="text-sm text-muted-foreground">An outline can be linked to only one novel. New revisions to the standalone outline will not automatically replace this novel's source.</p><Button asChild><Link to={binding.data.sourceRoute}>Open writing workspace</Link></Button></main>;
  if (outline.data?.boundNovelId) return <section className="space-y-3"><p role="alert">Outline binding information is incomplete. Check the source; a duplicate novel will not be created.</p>{back}</section>;
  if (revisionDetail.isLoading) return <p className="py-8 text-sm text-muted-foreground">Loading selected outline revision…</p>;
  if (!revision || revisionDetail.isError || !document) return <section className="space-y-3"><p role="alert" className="text-sm text-destructive">Could not find this outline revision. Select another version.</p>{back}</section>;
  const unsaved=revision.version===currentVersion && !!outline.data?.document && JSON.stringify(outline.data.document)!==JSON.stringify(document);
  const quotaTotal=Object.values(quotas).reduce((sum,value)=>sum+value,0);
  const valid=outlineOpenBookInputSchema.safeParse(request).success && (!document.volumes.length || quotaTotal===count);
  const error=create.error ?? preview.error;
  const checked=matches ? preview.data : undefined;
  const shownError=error ? presentOutlineOpenBookError(error.message,document) : null;
  return <main className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-4" aria-label="Start a novel from an outline">
    <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border/50 pb-4"><div><p className="text-xs text-muted-foreground">Outline / {outline.data?.title}</p><h1 className="mt-1 text-2xl font-semibold">Bring this outline into novel creation</h1><p className="mt-2 text-sm text-muted-foreground">Source: revision v{revision.version}{revision.version!==currentVersion ? ` · The current version is v${currentVersion}; this action will use the selected revision only` : " · Using this revision only"}; pending suggestions are excluded.</p></div>{back}</header>
    <div className="grid min-h-0 flex-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-h-0 min-w-0 space-y-6 overflow-y-auto overscroll-contain pr-2">
          <section className="space-y-4"><h2 className="text-lg font-semibold">Novel settings</h2>
            <label className="block space-y-1.5"><span className="text-sm">Title</span><input className="h-10 w-full rounded-md border border-input bg-background px-3" value={title} onChange={event=>setTitle(event.target.value)}/></label>
            <div className="grid grid-cols-2 gap-4"><label className="space-y-1.5 text-sm"><span className="block">Target chapters</span><input aria-label="Target chapters" className="h-10 w-full rounded-md border border-input bg-background px-3" type="number" min={1} max={2000} value={count} onChange={event=>{const total=Number(event.target.value);setCount(total);setQuotas(suggestVolumeQuotas(document,total));}}/></label><label className="space-y-1.5 text-sm"><span className="block">Approx. words per chapter</span><input aria-label="Approx. words per chapter" className="h-10 w-full rounded-md border border-input bg-background px-3" type="number" min={500} max={10000} value={length} onChange={event=>setLength(Number(event.target.value))}/></label></div>
          </section>
          {document.volumes.length ? <section className="space-y-3 border-t border-border/50 pt-5"><h2 className="text-lg font-semibold">Chapter allocation</h2><p className="text-xs leading-6 text-muted-foreground">Adjust the chapter budget. No empty chapters will be created for sections that have not been expanded. The total must equal {count} chapters.</p>{[...document.volumes].sort((a,b)=>a.order-b.order).map(volume=><label key={volume.nodeId} className="flex items-center justify-between gap-4 text-sm"><span className="min-w-0 break-words">{volume.title || "Untitled volume"}<span className="ml-2 text-xs text-muted-foreground">{volume.planningDepth==="rough" ? "High-level outline" : "Detailed outline"}</span></span><input aria-label={`Estimated chapters for ${volume.title}`} className="h-9 w-24 shrink-0 rounded-md border border-input bg-background px-2 text-right tabular-nums" type="number" min={Math.max(1,document.chapters.filter(chapter=>chapter.volumeNodeId===volume.nodeId).length)} max={count} value={quotas[volume.nodeId] ?? 0} onChange={event=>setQuotas(current=>({...current,[volume.nodeId]:Number(event.target.value)}))}/></label>)}{quotaTotal!==count ? <p role="alert" className="text-sm text-destructive">Volume total: {quotaTotal} chapters. Adjust it to {count}.</p> : null}</section> : null}
          <section className="space-y-3 border-t border-border/50 pt-5"><h2 className="text-lg font-semibold">What will be preserved</h2><p className="text-sm leading-6 text-muted-foreground">Existing outline content will be preserved. Blank fields can be filled in, and immutable facts will always constrain the writing.</p>{document.facts.filter(fact=>fact.immutable).map(fact=><p key={fact.nodeId} className="text-sm leading-6"><strong>{fact.title}: </strong>{fact.content}</p>)}<Button variant="ghost" size="sm" onClick={()=>setShowDetails(value=>!value)} aria-expanded={showDetails}>{showDetails ? "Hide preservation details" : "Show preservation details"}</Button>{showDetails ? checked ? <OutlinePreservationDetails policy={checked.policy} document={document}/> : <p className="text-sm text-muted-foreground">Check the novel setup to review preservation details for each field.</p> : null}</section>
          <section className="space-y-3 border-t border-border/50 py-5"><h2 className="text-lg font-semibold">What comes next</h2><p className="text-sm leading-6 text-muted-foreground">Keep distant planning at the volume level and plan chapters closer to when you write them. After starting, confirm preparation for each stage before authorizing chapter text generation.</p><p className="text-xs text-muted-foreground">Unsaved local changes and unapplied AI suggestions are not included.</p></section>
        </section>
        <aside className="min-h-0 space-y-4 overflow-y-auto overscroll-contain rounded-lg bg-muted/30 p-5" aria-label="This handoff"><h2 className="text-lg font-semibold">This handoff</h2>{checked ? <>
          <p className="text-sm leading-7">{checked.counts.volumes} volumes · {checked.counts.chapters} existing chapter outlines<br/>{checked.counts.characters} character drafts · {checked.counts.payoffs} planned payoffs</p>
          <div className="space-y-3 border-t border-border/50 pt-4"><h3 className="text-sm font-medium">Chapter ranges by volume</h3>{checked.mapping.volumes.map(volume=><section key={volume.nodeId} className="text-sm"><p className="font-medium">{findOutlineNodeTitle(document,volume.nodeId)}</p><p className="mt-1 tabular-nums text-muted-foreground">Estimated {volume.chapterQuota} chapters · Chapters {volume.from}–{volume.to}</p>{checked.mapping.chapters.filter(chapter=>chapter.volumeId===volume.volumeId).map(chapter=><p key={chapter.nodeId} className="mt-1 text-xs leading-6 text-muted-foreground">Chapter {chapter.chapterOrder} · {findOutlineNodeTitle(document,chapter.nodeId)}</p>)}</section>)}</div>
          <p className="text-xs leading-6 text-muted-foreground">Only existing chapter outlines listed above will be created; unexpanded sections remain a budget. Foreshadowing is added as a plan and linked to the ledger only after there is evidence in the text.</p>
          {checked.warnings.map((warning,index)=><p key={index} className="text-sm leading-6 text-warning">{warning}</p>)}
          <label className="flex cursor-pointer items-start gap-2 border-t border-border/50 pt-4 text-sm leading-6"><input type="checkbox" className="mt-1 shrink-0 accent-primary" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/><span>I confirm the chapter count for each volume, chapter ranges, and preserved content. Use revision v{checked.revisionVersion} only.</span></label>
        </> : <p className="text-sm leading-7 text-muted-foreground">Review the novel settings and chapter allocation, then check the handoff.</p>}</aside>
    </div>
    {unsaved ? <p role="alert" className="shrink-0 text-sm text-warning">The outline has unsaved changes. Return to the outline and save them before starting.</p> : null}
    {shownError ? <div role="alert" className="flex shrink-0 flex-wrap items-center gap-2 text-sm text-destructive"><span>{shownError.message}</span>{shownError.nodeId ? <Button asChild variant="ghost" size="sm"><Link to={`/outlines/${id}?nodeId=${encodeURIComponent(shownError.nodeId)}`}>Edit “{shownError.nodeTitle}”</Link></Button> : null}<Button variant="ghost" size="sm" onClick={()=>void Promise.all([binding.refetch(),outline.refetch(),revisions.refetch()])}>Recheck source and binding</Button>{back}</div> : null}
    <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3"><p className="max-w-md text-xs leading-6 text-muted-foreground">After creation, you can review and confirm writing preparation. No model is called and no text is generated automatically.</p><div className="flex gap-2"><Button variant="secondary" onClick={()=>{setConfirmed(false);preview.mutate(request);}} disabled={!valid || unsaved || preview.isPending || create.isPending}>{preview.isPending ? "Checking…" : "Review novel setup"}</Button><Button onClick={()=>create.mutate()} disabled={!matches || !confirmed || unsaved || create.isPending}>{create.isPending ? "Creating…" : "Create novel and review setup"}</Button></div></footer>
  </main>;
}
