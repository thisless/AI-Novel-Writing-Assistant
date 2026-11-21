import {useQuery} from "@tanstack/react-query";
import type {VolumePlanDocument} from "@ai-novel/shared/types/novel";
import {getDirectorCharacterAppearances} from "@/api/directorNext";
import {Button} from "@/components/ui/button";
import {appearanceDestination, appearanceLabels, projectAppearanceRows, summarizeAppearances, visibleAppearances, type AppearanceBoundary, type AppearanceRow, type AppearanceDestination} from "./appearanceModel";
import {AppearanceTimeline} from "./AppearanceTimeline";

const chapterLabel = (order: number | null) => order === null ? "No record" : `Chapter ${order}`;

export function AppearanceList({rows, boundary, onSelect}: {
  rows: AppearanceRow[]; boundary: AppearanceBoundary; onSelect: (target:AppearanceDestination)=>void;
}) {
  if (boundary === null) return <p className="text-sm text-muted-foreground">Select a chapter to read, or switch to “Latest status” to view appearances across the novel.</p>;
  const stats = summarizeAppearances(rows, boundary);
  const visible = visibleAppearances(rows, boundary);
  const recorded = visible.filter(row => row.events.length > 0);
  const planned = visible.filter(row => row.planned);
  const unknown = visible.filter(row => row.coverage === "untracked").length;
  const pending = visible.filter(row => row.chapterId === null && !row.planSource).length;
  const awaitingProse = visible.length > 0 && visible.every(row=>row.coverage === "unwritten");
  return <div className="min-w-0 space-y-4 text-sm leading-6">
    <dl className="flex flex-wrap gap-x-6 gap-y-2">
      <div><dt className="text-muted-foreground">First recorded appearance</dt><dd>{chapterLabel(stats.first)}</dd></div>
      <div><dt className="text-muted-foreground">Most recent appearance</dt><dd>{chapterLabel(stats.last)}</dd></div>
      <div><dt className="text-muted-foreground">Chapters with appearances</dt><dd>{awaitingProse ? "Awaiting prose" : `${stats.count} ${stats.count === 1 ? "chapter" : "chapters"}`}</dd></div>
    </dl>
    {pending > 0 ? <p className="text-sm text-muted-foreground">This range includes saved chapter plans; appearance schedules are still pending for {pending} {pending === 1 ? "chapter" : "chapters"}. Chapter tasks will be prepared when you start writing those chapters. Actual appearances are recorded only after the final prose is saved and organized.</p> : null}
    <AppearanceTimeline key={String(boundary)} rows={rows} boundary={boundary} onSelect={onSelect}/>
    <div><h4 className="font-medium">Planned appearances</h4>
      <p className="text-xs text-muted-foreground">Based on the initial chapter schedule and detailed tasks. Detailed tasks take precedence; prose records are used to verify actual appearances.</p>
      {planned.length ? <div className="mt-2 flex flex-wrap gap-1">{planned.map(row=><Button key={appearanceDestination(row).id} size="sm" variant="ghost" onClick={()=>onSelect(appearanceDestination(row))}>Chapter {row.chapterOrder}</Button>)}</div>
        : <p className="mt-2 text-muted-foreground">{pending > 0 ? "Appearance schedules will be filled in after chapter tasks are generated." : "No appearances are planned in this range."}</p>}
    </div>
    {stats.missed.length > 0 ? <p className="text-muted-foreground">An appearance is planned for Chapters {stats.missed.join(", ")}, but the prose record does not confirm it. Review the schedule if needed; this reminder does not pause writing.</p> : null}
    {unknown > 0 ? <p className="text-xs text-muted-foreground">{unknown} {unknown === 1 ? "chapter is" : "chapters are"} missing a complete appearance record for the current prose version; this does not count as an absence.</p> : null}
    {recorded.length ? <ol className="divide-y divide-border/40">{recorded.map(row=><li key={appearanceDestination(row).id} className="space-y-2 py-3">
      <Button variant="ghost" size="sm" className="-ml-3" onClick={()=>onSelect(appearanceDestination(row))}>Chapter {row.chapterOrder} · {row.chapterTitle}</Button>
      {row.events.map(event=><div key={event.kind} className="space-y-1"><p><span className="mr-2 text-xs text-muted-foreground">{appearanceLabels[event.kind]}</span>{event.summary}</p>
        <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Prose evidence</summary><p className="mt-1 whitespace-pre-wrap">{event.evidence}</p></details></div>)}
    </li>)}</ol> : <p className="text-muted-foreground">No verified character appearances in this range.</p>}
  </div>;
}

export function CharacterAppearances({novelId, characterId, boundary, onSelect, planning, preview=false}: {
  novelId: string; characterId: string; boundary: AppearanceBoundary; onSelect: (target:AppearanceDestination)=>void; planning?:VolumePlanDocument; preview?:boolean;
}) {
  const query = useQuery({queryKey: ["director-character-appearances", novelId, characterId],
    queryFn: ()=>getDirectorCharacterAppearances(novelId,characterId), enabled: !preview, retry:false, refetchInterval:10000});
  return <section className="min-w-0 space-y-3 py-5"><h3 className="text-sm font-semibold">Character appearance timeline</h3>
    {query.isError ? <p role="alert" className="text-sm text-destructive">Couldn't load appearance records. <Button variant="ghost" size="sm" onClick={()=>void query.refetch()}>Reload</Button></p>
      : query.isLoading && !preview ? <p className="text-sm text-muted-foreground">Loading appearance records…</p>
      : <AppearanceList key={characterId} rows={projectAppearanceRows(query.data?.data?.chapters ?? [],planning,characterId)} boundary={boundary} onSelect={onSelect}/>}
  </section>;
}
