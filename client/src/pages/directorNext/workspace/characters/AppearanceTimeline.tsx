import {useState} from "react";
import type {CharacterAppearance} from "@ai-novel/shared/types/director/characterAppearances";
import {Button} from "@/components/ui/button";
import {appearanceDestination, appearanceLabels, appearanceTimelinePage, type AppearanceBoundary, type AppearanceRow, type AppearanceDestination} from "./appearanceModel";

const symbols = {present: "●", mention: "△", flashback: "◆", dream: "☾"};
const eventKinds: CharacterAppearance["kind"][] = ["present", "mention", "flashback", "dream"];
const nodeClass = "relative h-8 w-9 bg-background p-0 text-lg";

function ChapterNode({row, label, symbol, onSelect, active = false}: {
  row: AppearanceRow; label: string; symbol: string; onSelect: (target:AppearanceDestination)=>void; active?: boolean;
}) {
  const description = `Chapter ${row.chapterOrder} · ${row.chapterTitle}: ${label}`;
  return <Button type="button" variant="ghost" size="sm"
    className={`${nodeClass} ${active ? "font-bold text-primary" : "text-muted-foreground"}`}
    aria-label={description} title={description} onClick={()=>onSelect(appearanceDestination(row))}>
    <span aria-hidden="true">{symbol}</span>
  </Button>;
}

export function AppearanceTimeline({rows, boundary, onSelect}: {
  rows: AppearanceRow[]; boundary: AppearanceBoundary; onSelect: (target:AppearanceDestination)=>void;
}) {
  const [requestedPage, setRequestedPage] = useState<number | null>(null);
  const window = appearanceTimelinePage(rows, boundary, requestedPage);
  if (!window.rows.length) return null;
  const range = `Chapters ${window.rows[0].chapterOrder}–${window.rows[window.rows.length-1].chapterOrder}`;
  return <figure className="min-w-0 max-w-full space-y-3" aria-label="Character appearance timeline">
    <figcaption className="flex flex-wrap items-center justify-between gap-2">
      <h4 className="font-medium">Appearance timeline</h4>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {window.pageCount > 1 ? <Button type="button" variant="ghost" size="sm" aria-label="View previous chapters"
          disabled={window.page===0} onClick={()=>setRequestedPage(window.page-1)}>Previous</Button> : null}
        <span aria-live="polite">{range}</span>
        {window.pageCount > 1 ? <Button type="button" variant="ghost" size="sm" aria-label="View next chapters"
          disabled={window.page===window.pageCount-1} onClick={()=>setRequestedPage(window.page+1)}>Next</Button> : null}
      </div>
    </figcaption>
    <p className="text-xs text-muted-foreground">View appearances by chapter. Select a symbol to open its chapter; scroll horizontally to see the rest of this range.</p>
    <div className="max-w-full overflow-x-auto overscroll-x-contain rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      role="region" aria-label={`Appearance timeline, ${range}`} tabIndex={0}>
      <table className="w-full border-collapse text-center text-xs" aria-label="Planned appearances and prose records">
        <thead><tr>
          <th scope="col" className="sticky left-0 z-10 min-w-16 bg-background px-2 py-2 text-left font-normal text-muted-foreground">Chapter</th>
          {window.rows.map(row=><th key={appearanceDestination(row).id} scope="col" className="min-w-12 px-1 py-2 font-normal text-muted-foreground">{row.chapterOrder}</th>)}
        </tr></thead>
        <tbody>{["planned", "actual"].map(lane=><tr key={lane}>
          <th scope="row" className="sticky left-0 z-10 bg-background px-2 py-3 text-left align-top font-medium">{lane==="planned" ? "Planned" : "In prose"}</th>
          {window.rows.map(row=><td key={appearanceDestination(row).id} className="relative px-1 py-3 align-top">
            <span aria-hidden="true" className="absolute inset-x-0 top-7 h-px bg-border/70"/>
            <div className="relative flex flex-col items-center gap-1">
              {lane==="planned" ? row.chapterId === null && !row.planSource
                ? <ChapterNode row={row} label="Appearance schedule pending; view chapter plan" symbol="◌" onSelect={onSelect}/>
                : row.planned ? <ChapterNode row={row} label="Planned appearance" symbol="○" onSelect={onSelect}/>
                  : <span className="relative inline-flex h-8 items-center bg-background px-2 text-muted-foreground" aria-label="No planned appearance">—</span>
                : <>
                  {eventKinds.filter(kind=>row.events.some(event=>event.kind===kind)).map(kind=><ChapterNode key={kind} row={row}
                    label={`${appearanceLabels[kind]}: ${row.events.find(event=>event.kind===kind)!.summary}`} symbol={symbols[kind]} active={kind==="present"} onSelect={onSelect}/>)}
                  {row.coverage!=="recorded" ? <ChapterNode row={row} label={row.coverage==="untracked" ? "Unverified; absence cannot be determined" : "Awaiting manuscript"}
                    symbol={row.coverage==="untracked" ? "?" : "…"} onSelect={onSelect}/>
                    : !row.events.length ? <span className="relative inline-flex h-8 items-center bg-background px-2 text-muted-foreground" aria-label="Verified; no appearance recorded">—</span> : null}
                </>}
            </div>
          </td>)}
        </tr>)}</tbody>
      </table>
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Timeline legend">
      <span>○ Planned appearance</span>
      {eventKinds.map(kind=><span key={kind}>{symbols[kind]} {appearanceLabels[kind]}</span>)}
      <span>◌ Schedule pending</span><span>? Unverified</span><span>… Awaiting manuscript</span><span>— No record</span>
    </div>
  </figure>;
}
