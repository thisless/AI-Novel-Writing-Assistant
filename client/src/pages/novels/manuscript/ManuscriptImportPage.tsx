import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { ManuscriptEncoding, ManuscriptPartitionUnit, ManuscriptUnitRole } from "@ai-novel/shared/types/manuscript";
import { createManuscriptImport, getManuscriptSession, splitManuscript, saveManuscriptPartition, confirmManuscriptImport, getManuscriptSourceText } from "@/api/manuscripts";
import { Button } from "@/components/ui/button";
import { useIsMobileViewport } from "@/components/layout/mobile/useIsMobileViewport";
import { featureFlags } from "@/config/featureFlags";
import { DesktopManuscriptNotice, ManuscriptDirectory, ManuscriptNotice } from "./ManuscriptUI";
import { manuscriptRoleLabels, moveManuscriptBoundary, mergeManuscriptPrevious, splitManuscriptUnit } from "./partitionModel";
import "./manuscript.css";

export default function ManuscriptImportPage() {
  const mobile=useIsMobileViewport();
  return mobile?<DesktopManuscriptNotice/>:!featureFlags.manuscriptRevisionEnabled?<ManuscriptNotice>Manuscript revision is not enabled. <Link to="/novels" className="ml-2 underline">Back to novels</Link></ManuscriptNotice>:<DesktopManuscriptImport/>;
}
function DesktopManuscriptImport() {
  const navigate=useNavigate(), cache=useQueryClient();
  const [params,setParams]=useSearchParams();
  const sessionId=params.get("sessionId")??"";
  const [title,setTitle]=useState("");
  const [narrativeForm,setNarrativeForm]=useState<"long_novel"|"short_story">("long_novel");
  const [mode,setMode]=useState<"upload"|"paste">("upload");
  const [file,setFile]=useState<File|null>(null),[pastedText,setPastedText]=useState("");
  const [encoding,setEncoding]=useState<ManuscriptEncoding>("utf-8");
  const [draft,setDraft]=useState<ManuscriptPartitionUnit[]>([]),[selectedId,setSelectedId]=useState("");
  const [boundary,setBoundary]=useState(0),[splitPoint,setSplitPoint]=useState(0),[position,setPosition]=useState(0);
  const [confirmed,setConfirmed]=useState(false),[localError,setLocalError]=useState("");
  const readRef=useRef<HTMLTextAreaElement>(null);
  const importKey=useRef(crypto.randomUUID()), confirmKey=useRef(crypto.randomUUID());
  const sessionQuery=useQuery({queryKey:["manuscript-import",sessionId],queryFn:()=>getManuscriptSession(sessionId),enabled:!!sessionId});
  const session=sessionQuery.data;
  useEffect(()=>{if(session){setDraft(session.units);setSelectedId(current=>session.units.some(unit=>unit.draftId===current)?current:session.units[0]?.draftId??"");setConfirmed(false);}},[session]);
  useEffect(()=>{confirmKey.current=crypto.randomUUID();setConfirmed(false);},[title,draft]);
  const selected=draft.find(unit=>unit.draftId===selectedId);
  useEffect(()=>{setBoundary(selected?.range.start??0);setSplitPoint(selected?Math.floor((selected.range.start+selected.range.end)/2):0);setPosition(selected?.range.start??0);},[selectedId]);
  const from=selected?Math.max(selected.range.start,Math.min(position,Math.max(selected.range.start,selected.range.end-1))):0;
  const to=selected?Math.min(selected.range.end,from+12000):0;
  const source=useQuery({queryKey:["manuscript-source",session?.source.sourceHash,from,to],queryFn:()=>getManuscriptSourceText(session!.projectId,session!.sourceId,from,to),enabled:!!session && to>from});
  const changed=!!session && JSON.stringify(draft)!==JSON.stringify(session.units);
  const upload=useMutation({mutationFn:async()=>{
     const created=await createManuscriptImport({title:title.trim(),pastedText:mode==="paste"?pastedText:undefined,encoding,narrativeForm,requestKey:importKey.current},mode==="upload"?file??undefined:undefined);
    setParams({sessionId:created.sessionId});
     const stored=await getManuscriptSession(created.sessionId);
    return splitManuscript(stored);
  },onSuccess:value=>cache.setQueryData(["manuscript-import",value.id],value)});
  const resplit=useMutation({mutationFn:()=>splitManuscript(session!),onSuccess:value=>cache.setQueryData(["manuscript-import",sessionId],value)});
  const save=useMutation({mutationFn:()=>saveManuscriptPartition(sessionId,{expectedSessionVersion:session!.version,sourceHash:session!.source.sourceHash,units:draft}),onSuccess:value=>cache.setQueryData(["manuscript-import",sessionId],value)});
   const create=useMutation({mutationFn:()=>confirmManuscriptImport(sessionId,{expectedSessionVersion:session!.version,sourceHash:session!.source.sourceHash,coverageHash:session!.coverage!.coverageHash,title:title.trim(),requestKey:confirmKey.current}),onSuccess:result=>navigate(`/novels/${result.novelId}/revision`)});
  const error=localError||upload.error?.message||save.error?.message||create.error?.message||resplit.error?.message;
  const busy=upload.isPending||save.isPending||create.isPending||resplit.isPending;
  const updateSelected=(patch:Partial<ManuscriptPartitionUnit>)=>setDraft(items=>items.map(item=>item.draftId===selectedId?{...item,...patch}:item));
  const edit=(fn:()=>ManuscriptPartitionUnit[])=>{try{setDraft(fn());setLocalError("");}catch(error){setLocalError(error instanceof Error?error.message:"Unable to adjust chapter boundaries.");}};
  const coverage=session?.coverage;
  const valid=!!session && !changed && coverage?.complete && !coverage.unresolvedCount && coverage.bodyUnitCount>0;
  const roleOptions=useMemo(()=>Object.entries(manuscriptRoleLabels),[]);
  const reset=()=>{setParams({});setDraft([]);setSelectedId("");importKey.current=crypto.randomUUID();};
  return <section className="manuscript-workspace mx-auto max-w-[1800px]" aria-label="Import manuscript for revision">
    <header className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-4"><div><p className="text-xs text-muted-foreground">Novels / Import manuscript</p><h1 className="mt-1 text-xl font-semibold">Create a traceable revision copy</h1><p className="mt-2 text-sm text-muted-foreground">The original file and text are preserved permanently. Review each AI revision before accepting it.</p></div><Button asChild variant="ghost"><Link to="/novels">Back to novels</Link></Button></header>
    <ol aria-label="Import steps" className="flex shrink-0 gap-6 text-sm"><li className={!session?"font-medium":"text-muted-foreground"}>1. Upload manuscript</li><li className={session?"font-medium":"text-muted-foreground"}>2. Confirm chapter divisions</li><li className="text-muted-foreground">3. Create revision copy</li></ol>
    {!sessionId?<div className="grid min-h-0 flex-1 gap-8 overflow-auto lg:grid-cols-[minmax(0,1fr)_300px]">
       <div className="max-w-3xl space-y-5 pb-4"><label className="block space-y-2 text-sm"><span>Title</span><input className="manuscript-field" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Name this revision copy" maxLength={200}/></label>
         <label className="block space-y-2 text-sm"><span>Format</span><select className="manuscript-field max-w-48" value={narrativeForm} onChange={e=>{setNarrativeForm(e.target.value as "long_novel"|"short_story");importKey.current=crypto.randomUUID();}}><option value="long_novel">Long-form novel</option><option value="short_story">Short story</option></select></label><p className="text-sm text-muted-foreground">Short stories use your confirmed sections as segments. If there are no headings, you can confirm the full text as one section.</p>
         <div className="flex gap-2" aria-label="Manuscript input method"><Button variant={mode==="upload"?"secondary":"ghost"} onClick={()=>setMode("upload")}>Upload TXT</Button><Button variant={mode==="paste"?"secondary":"ghost"} onClick={()=>setMode("paste")}>Paste full text</Button></div>
        {mode==="upload"?<label className="flex min-h-52 cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-input bg-muted/20 px-6 py-8 text-center"><span className="text-base font-medium">Choose a TXT manuscript</span><span className="text-sm text-muted-foreground">Bytes and line breaks are preserved. Existing works won't be overwritten.</span><input type="file" accept=".txt,text/plain" aria-label="Choose a TXT manuscript" onChange={e=>{const picked=e.target.files?.[0]??null;setFile(picked);if(picked&&!title)setTitle(picked.name.replace(/\.txt$/i,""));importKey.current=crypto.randomUUID();}} className="sr-only"/><span className="rounded-md bg-secondary px-4 py-2 text-sm text-secondary-foreground">Choose TXT file</span>{file?<span className="text-sm tabular-nums">{file.name} · {file.size.toLocaleString()} bytes</span>:null}</label>:<label className="block space-y-2 text-sm"><span>Full manuscript text</span><textarea aria-label="Full manuscript text" className="manuscript-field min-h-72 font-sans leading-7" value={pastedText} onChange={e=>{setPastedText(e.target.value);importKey.current=crypto.randomUUID();}} placeholder="Paste the complete manuscript, including the table of contents, foreword, and ending"/></label>}
        <label className="flex items-center gap-3 text-sm"><span>Text encoding</span><select aria-label="Text encoding" className="manuscript-field max-w-48" value={encoding} onChange={e=>{setEncoding(e.target.value as ManuscriptEncoding);importKey.current=crypto.randomUUID();}}><option value="utf-8">UTF-8 (default)</option><option value="utf-16le">UTF-16 LE</option><option value="utf-16be">UTF-16 BE</option><option value="gb18030">GB18030</option></select></label>
        <p className="text-xs leading-6 text-muted-foreground">Maximum file size: 20 MiB and 3 million characters. If decoding fails, you'll be asked to choose another file; malformed text won't be ignored or truncated.</p>
      </div><aside className="space-y-4 rounded-lg bg-muted/30 p-5"><h2 className="text-lg font-semibold">What this step does</h2><p className="text-sm leading-7">Saves the complete manuscript and suggests chapter divisions. The table of contents, foreword, and afterword are also assigned sections for you to review.</p><p className="text-sm leading-7 text-muted-foreground">The end-to-end workflow is currently available for long-form novels. Short-story support will come separately. The source won't be added to the global knowledge base, and no prose will be generated or rewritten.</p></aside>
    </div>:sessionQuery.isPending?<ManuscriptNotice>Restoring manuscript and chapter-division session…</ManuscriptNotice>:sessionQuery.isError?<ManuscriptNotice error>{sessionQuery.error.message}<Button variant="ghost" onClick={()=>void sessionQuery.refetch()}>Retry loading</Button></ManuscriptNotice>:session?<>
      <label className="flex shrink-0 items-center gap-3 text-sm"><span className="shrink-0">Revision copy title</span><input className="manuscript-field max-w-md" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Enter a title for this revision copy" maxLength={200}/></label>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-sm"><p>Source: {session.source.originalFileName||"Pasted text"} · {session.source.encoding.toUpperCase()} · Fully read <strong className="tabular-nums">{session.source.charCount.toLocaleString()}</strong> characters</p><Button variant="ghost" size="sm" onClick={reset}>Choose another manuscript</Button></div>
      {!draft.length?<Button variant="outline" disabled={busy} onClick={()=>resplit.mutate()}>Retry full manuscript analysis</Button>:null}
      {session.createdNovelId?<ManuscriptNotice>This manuscript has been created as a revision copy.<Link className="ml-2 underline" to={`/novels/${session.createdNovelId}/revision`}>Open the source novel</Link></ManuscriptNotice>:null}
      <div className="grid min-h-0 flex-1 gap-6 grid-cols-[240px_minmax(0,1fr)]">
        <nav className="manuscript-scroll pr-2" aria-label="Manuscript section index"><h2 className="mb-3 text-sm font-semibold">Chapters and other sections</h2><ManuscriptDirectory items={draft.map(item=>({...item,id:item.draftId}))} selectedId={selectedId} onSelect={setSelectedId} render={unit=><><span className="block break-words">{unit.title}</span><span className="block text-xs font-normal text-muted-foreground">{manuscriptRoleLabels[unit.role]} · {(unit.range.end-unit.range.start).toLocaleString()} characters{unit.needsReview?" · Needs review":""}</span></>}/></nav>
        <section className="manuscript-scroll space-y-4 pr-2" aria-label="Locate source text and confirm boundaries">{selected?<>
          <div className="grid grid-cols-[minmax(0,1fr)_240px] gap-4"><label className="space-y-1 text-sm"><span>Section title</span><input className="manuscript-field" value={selected.title} onChange={e=>updateSelected({title:e.target.value})}/></label><label className="space-y-1 text-sm"><span>Section type</span><select aria-label="Section type" className="manuscript-field" value={selected.role} onChange={e=>updateSelected({role:e.target.value as ManuscriptUnitRole})}>{roleOptions.map(([role,label])=><option key={role} value={role}>{label}</option>)}</select></label></div>
          <p className="text-xs tabular-nums text-muted-foreground">Source range {selected.range.start.toLocaleString()}–{selected.range.end.toLocaleString()} · Original line breaks preserved · Read-only</p>
          {source.isPending?<ManuscriptNotice>Loading source text…</ManuscriptNotice>:source.isError?<ManuscriptNotice error>Unable to load source text. Please choose another location.</ManuscriptNotice>:<textarea ref={readRef} aria-label="Source text, read-only" readOnly value={source.data??""} className="manuscript-field manuscript-reading min-h-64 resize-y bg-muted/20" onSelect={e=>setSplitPoint(from+e.currentTarget.selectionStart)}/>}
          <div className="flex flex-wrap items-end gap-2"><label className="space-y-1 text-xs"><span>Character position (zero-based)</span><input type="number" min={selected.range.start} max={selected.range.end-1} className="manuscript-field w-40" value={position} onChange={e=>setPosition(Number(e.target.value))}/></label><span className="pb-2 text-xs text-muted-foreground">Showing {from.toLocaleString()}–{to.toLocaleString()}. For long chapters, you can navigate farther into the text.</span></div>
          <details className="space-y-3 border-t border-border/50 pt-3"><summary className="cursor-pointer text-sm font-medium">Adjust chapter boundaries</summary><p className="text-xs leading-6 text-muted-foreground">Click a split point in the source text or enter a character position. Adjacent sections will adjust together, and no source text will be lost.</p><div className="flex flex-wrap items-end gap-2"><label className="space-y-1 text-xs"><span>Section start</span><input type="number" className="manuscript-field w-36" value={boundary} onChange={e=>setBoundary(Number(e.target.value))}/></label><Button variant="outline" size="sm" disabled={draft[0]?.draftId===selectedId} onClick={()=>edit(()=>moveManuscriptBoundary(draft,selectedId,boundary))}>Move start</Button><Button variant="outline" size="sm" disabled={draft[0]?.draftId===selectedId} onClick={()=>edit(()=>mergeManuscriptPrevious(draft,selectedId))}>Merge with previous section</Button></div><div className="flex flex-wrap items-end gap-2"><label className="space-y-1 text-xs"><span>Split before character</span><input type="number" className="manuscript-field w-36" value={splitPoint} onChange={e=>setSplitPoint(Number(e.target.value))}/></label><Button variant="outline" size="sm" onClick={()=>edit(()=>splitManuscriptUnit(draft,selectedId,splitPoint,crypto.randomUUID()))}>Split into two sections</Button></div></details>
          <label className="flex items-start gap-2 text-sm leading-6"><input type="checkbox" className="mt-1 accent-primary" checked={!selected.needsReview} onChange={e=>updateSelected({needsReview:!e.target.checked})}/><span>Confirm this section's title, boundaries, and type</span></label>
        </>:<ManuscriptNotice>Chapter boundaries haven't been confirmed. You can mark the full text as one chapter and split it later if needed.</ManuscriptNotice>}</section>
      </div>
       <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3"><div><p className="text-sm tabular-nums">Server coverage: {coverage?.complete?"100%":"Incomplete"} · {coverage?.bodyUnitCount??0} {narrativeForm==="short_story"?"sections":"chapters"} / {coverage?.attachmentUnitCount??0} other sections · Needs review: {coverage?.unresolvedCount??0}</p><p className="mt-1 text-xs text-muted-foreground">{changed?"Boundary changes are unsaved. Validate and save them first.":"The table of contents and front/back matter stay with the source and won't be mixed into the prose."}</p></div><div className="flex flex-wrap gap-2"><Button variant="ghost" size="sm" disabled={busy} onClick={()=>setDraft(items=>items.map(item=>({...item,needsReview:false})))}>Confirm all sections</Button><Button variant="secondary" disabled={busy||!changed} onClick={()=>save.mutate()}>{save.isPending?"Validating…":"Validate and save divisions"}</Button></div></div>
      <label className="flex shrink-0 items-center gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={!valid} onChange={e=>setConfirmed(e.target.checked)} className="accent-primary"/>Confirm all chapter divisions and create a revision copy using only the source text</label>
    </>:null}
    {error?<ManuscriptNotice error>{error}</ManuscriptNotice>:null}
    <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3"><p className="text-xs text-muted-foreground">The original file won't be changed, existing books won't be overwritten, and no prose will be generated.</p>{!sessionId?<Button disabled={busy||!title.trim()||(mode==="upload"?!file:!pastedText.trim())} onClick={()=>{setLocalError("");upload.mutate();}}>{upload.isPending?"Saving and analyzing…":"Analyze contents and chapters"}</Button>:<Button disabled={busy||!valid||!confirmed||!title.trim()||!!session?.createdNovelId} onClick={()=>create.mutate()}>{create.isPending?"Creating…":"Create revision copy"}</Button>}</footer>
  </section>;
}
