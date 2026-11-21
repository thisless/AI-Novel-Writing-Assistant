import {useMemo, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import type {DirectorNovelCharacterAppearances} from "@ai-novel/shared/types/director/characterAppearances";
import {getDirectorNovelCharacterAppearances} from "@/api/directorNext";
import {Button} from "@/components/ui/button";
import {InitialScheduleAction} from "./InitialScheduleAction";
import type {Selection, WorkspaceBook} from "../model";
import {appearanceDestination, appearanceLabels, appearanceTimelinePage, projectCastAppearanceRows, type AppearanceRow} from "./appearanceModel";

const symbols = {mention: "△", flashback: "◆", dream: "☾"};
const otherKinds = ["mention", "flashback", "dream"] as const;
const emptyChapters: DirectorNovelCharacterAppearances["chapters"] = [];

function AppearanceCell({row, name, onSelect}: {row: AppearanceRow; name: string; onSelect: (selection: Selection)=>void}) {
  const present = row.events.some(event => event.kind === "present");
  const planLabel = row.planned ? "Planned appearance" : row.chapterId === null && !row.planSource ? "Appearance schedule pending"
    : row.planSource ? "No planned on-page appearance" : "No planned appearance";
  const events = row.events.map(event => `${appearanceLabels[event.kind]}: ${event.summary}`);
  const coverageLabel = row.coverage === "untracked" ? "Unverified; absence cannot be determined" : row.coverage === "unwritten" ? "Awaiting manuscript" : "";
  const label = `${name} · Chapter ${row.chapterOrder} · ${row.chapterTitle}: ${[planLabel, ...events, coverageLabel || (events.length ? "" : "No appearance recorded")].filter(Boolean).join("; ")}`;
  return <button type="button" onClick={()=>onSelect(appearanceDestination(row))} title={label} aria-label={label}
    className="flex h-14 w-full min-w-12 flex-col items-center justify-center gap-2 px-1 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
    <span aria-hidden="true" className={`flex h-2 w-full items-center justify-center rounded-sm text-[10px] text-muted-foreground ${row.planned ? "border border-primary/50 bg-primary/5" : ""}`}>{row.chapterId === null && !row.planSource ? "◌" : null}</span>
    <span aria-hidden="true" className="flex h-5 w-full items-center justify-center gap-0.5 text-sm text-muted-foreground">
      {present ? <span data-appearance-kind="present" className="h-3 min-w-3 flex-1 rounded-sm bg-primary"/> : null}
      {otherKinds.filter(kind=>row.events.some(event=>event.kind===kind)).map(kind=><span key={kind} data-appearance-kind={kind}>{symbols[kind]}</span>)}
      {row.coverage !== "recorded" ? <span>{row.coverage === "untracked" ? "?" : "…"}</span> : !row.events.length ? <span className="opacity-40">—</span> : null}
    </span>
  </button>;
}

export function CastTimelineChart({book, chapters, onSelect}: {
  book: WorkspaceBook; chapters: DirectorNovelCharacterAppearances["chapters"]; onSelect: (selection: Selection)=>void;
}) {
  const [requestedPage, setRequestedPage] = useState<number | null>(null);
  const axis = useMemo(()=>projectCastAppearanceRows(chapters, null, book.planning), [chapters, book.planning]);
  const cast = useMemo(()=>book.materials.characters.map(character=>({character,
    rows: projectCastAppearanceRows(chapters, character.id, book.planning),
  })), [chapters, book.materials.characters, book.planning]);
  const window = appearanceTimelinePage(axis, "latest", requestedPage);
  if (!cast.length) return <p className="text-sm text-muted-foreground">This novel has no characters yet. Saved character profiles will appear here with their appearance schedules.</p>;
  if (!axis.length) return <p className="text-sm text-muted-foreground">This novel has no chapter plans yet. Character appearance timelines will appear here once plans are saved.</p>;
  const start = window.page * 24;
  const range = `Chapters ${window.rows[0].chapterOrder}–${window.rows[window.rows.length-1].chapterOrder}`;
  const pending = axis.filter(row=>row.chapterId === null && !row.planSource).length;
  const unknown = axis.filter(row=>row.coverage === "untracked").length;
  return <figure className="min-w-0 space-y-4" aria-label="Cast appearance timeline">
    <figcaption className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span>{cast.length} {cast.length === 1 ? "character" : "characters"} · {axis.length} {axis.length === 1 ? "chapter" : "chapters"}</span>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {window.pageCount > 1 ? <Button variant="ghost" size="sm" disabled={window.page===0} onClick={()=>setRequestedPage(window.page-1)}>Previous</Button> : null}
        <span aria-live="polite">{range}</span>
        {window.pageCount > 1 ? <Button variant="ghost" size="sm" disabled={window.page===window.pageCount-1} onClick={()=>setRequestedPage(window.page+1)}>Next</Button> : null}
      </div>
    </figcaption>
    <p className="text-xs leading-6 text-muted-foreground">Each row is a character and each column is a chapter. Outlined bars show planned appearances; solid bars show actual appearances. Select a cell to open its chapter or a name to view that character's profile.</p>
    {pending > 0 ? <p className="text-xs text-muted-foreground">{pending} {pending === 1 ? "chapter is" : "chapters are"} awaiting appearance schedules. Actual appearances will be added after the prose is saved and organized.</p> : null}
    {unknown > 0 ? <p className="text-xs text-muted-foreground">Appearance records for the current prose version have not been verified for {unknown} {unknown === 1 ? "chapter" : "chapters"}; character absence cannot be determined from them.</p> : null}
    <div role="region" aria-label={`Cast appearance timeline, ${range}`} tabIndex={0}
      className="max-h-[65dvh] max-w-full overflow-auto overscroll-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <table className="w-full border-collapse text-center text-xs" aria-label="Character appearances by chapter">
        <thead className="sticky top-0 z-20 bg-background"><tr>
          <th scope="col" className="sticky left-0 z-30 min-w-36 bg-background px-3 py-3 text-left font-medium">Character</th>
          {window.rows.map(row=><th key={appearanceDestination(row).id} scope="col" title={row.chapterTitle} className="min-w-12 px-1 py-3 font-normal text-muted-foreground">{row.chapterOrder}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-border/40">{cast.map(({character, rows})=><tr key={character.id}>
          <th scope="row" className="sticky left-0 z-10 bg-background px-2 text-left font-normal">
            <button type="button" className="flex w-full items-center gap-2 rounded px-1 py-3 text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={()=>onSelect({kind:"character",id:character.id})}>
              <span className="max-w-32 truncate" title={character.name}>{character.name}</span>
              {character.castRole === "protagonist" ? <span className="shrink-0 text-[10px] text-primary">Protagonist</span> : null}
            </button>
          </th>
          {rows.slice(start, start+window.rows.length).map(row=><td key={appearanceDestination(row).id} className="p-0"><AppearanceCell row={row} name={character.name} onSelect={onSelect}/></td>)}
        </tr>)}</tbody>
      </table>
    </div>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground" aria-label="Timeline legend">
      <span className="inline-flex items-center gap-1"><span aria-hidden="true" className="h-2 w-5 rounded-sm border border-primary/50"/>Planned appearance</span>
      <span className="inline-flex items-center gap-1"><span aria-hidden="true" className="h-3 w-5 rounded-sm bg-primary"/>Actual appearance</span>
      <span>△ Mentioned</span><span>◆ Flashback</span><span>☾ Dream</span><span>◌ Schedule pending</span><span>? Unverified</span><span>… Awaiting manuscript</span><span>— No record</span>
    </div>
  </figure>;
}

export function CastTimeline({book, onSelect, preview=false}: {book: WorkspaceBook; onSelect: (selection: Selection)=>void; preview?: boolean}) {
  const query = useQuery({queryKey:["director-character-appearances",book.novel.id,"overview"],
    queryFn:()=>getDirectorNovelCharacterAppearances(book.novel.id), enabled:!preview, retry:false, refetchInterval:10000});
  return <div className="min-w-0 space-y-5 px-2 pb-10 sm:px-6">
    <h2 className="text-2xl font-semibold">Character timeline</h2>
    <InitialScheduleAction book={book} preview={preview}/>
    {query.isError ? <p role="alert" className="text-sm text-destructive">Couldn't load appearance records. <Button variant="ghost" size="sm" onClick={()=>void query.refetch()}>Reload</Button></p>
      : query.isLoading && !preview ? <p className="text-sm text-muted-foreground">Loading cast appearance records…</p>
      : <CastTimelineChart key={book.novel.id} book={book} chapters={query.data?.data?.chapters ?? emptyChapters} onSelect={onSelect}/>}
  </div>;
}
