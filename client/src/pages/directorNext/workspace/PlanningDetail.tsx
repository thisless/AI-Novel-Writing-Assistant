import type { Selection, WorkspaceBook } from "./model";
import { buildStoryDirectory, beatSelection, chapterSelection } from "./planning";

export function PlanningDetail({book,selected,onSelect}: {book:WorkspaceBook;selected:Selection;onSelect:(item:Selection)=>void}) {
  const tree = buildStoryDirectory(book,book.planning);
  const group = tree.volumes.find(group => selected.kind === "volume" ? group.volume.id === selected.id
    : selected.kind === "beat" ? group.volume.id === selected.volumeId
    : group.chapters.some(row => selected.kind === "chapter" ? row.chapter?.id === selected.id : selected.kind === "plan" && row.plan?.id === selected.id));
  if (!group) return selected.kind === "chapter" && book.planning ? <p className="px-6 pb-4 text-xs text-muted-foreground">This chapter isn't linked to a volume or beat yet.</p> : null;
  const entry = group.chapters.find(row => selected.kind === "chapter" ? row.chapter?.id === selected.id : selected.kind === "plan" && row.plan?.id === selected.id);
  const beatGroup = group.beats.find(row => selected.kind === "beat" ? row.beat.key === selected.id : row.beat.key === entry?.plan?.beatKey);
  const beat = beatGroup?.beat;
  const compact = selected.kind === "chapter";
  const volume = group.volume;
  const chapters = selected.kind === "beat" ? beatGroup?.chapters ?? [] : group.chapters;
  const text = (label:string,value?:string|null) => value ? <section className="py-3"><h3 className="mb-2 text-sm font-medium text-muted-foreground">{label}</h3><p className="whitespace-pre-wrap leading-8">{value}</p></section> : null;
  const targets = entry?.plan;
  const goal = <>{text("Story goal",targets?.purpose)}{text("Chapter summary",targets?.summary)}{text("Key event",targets?.exclusiveEvent)}{text("Ending state",targets?.endingState)}</>;
  return <div className="mx-auto max-w-[42rem] px-2 pb-5 sm:px-6">
    <nav aria-label="Story outline location" className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <button className="hover:text-primary focus-visible:underline" onClick={()=>onSelect({kind:"volume",id:volume.id})}>{volume.title}</button>
      {beat ? <><span>/</span><button className="hover:text-primary focus-visible:underline" onClick={()=>onSelect(beatSelection(volume.id,beat))}>{beat.title || beat.label}</button></> : entry ? <span>/ Beat not linked</span> : null}
      {entry ? <span>/ Chapter {entry.plan?.chapterOrder}</span> : null}
    </nav>
    {compact ? targets ? <details className="bg-muted/25 px-4 py-3"><summary className="cursor-pointer text-sm">Chapter goals</summary>{goal}</details> : null : <>
      <h2 className="mb-4 text-2xl font-semibold">{selected.kind === "volume" ? volume.title : selected.kind === "beat" ? beat?.title || beat?.label : targets?.title}</h2>
      {selected.kind === "volume" ? <>
        {text("Volume story",volume.summary)}{text("Reader promise",volume.mainPromise)}{text("Main pressure",volume.primaryPressureSource)}{text("Volume climax",volume.climax)}{text("Volume payoff",volume.payoffType)}
        <h3 className="mt-5 text-sm font-medium">Beats · {group.beats.length}</h3>
        {group.beats.map(({beat,chapters})=><button key={beat.key} onClick={()=>onSelect(beatSelection(volume.id,beat))} className="flex w-full justify-between gap-3 border-b border-border/30 py-3 text-left text-sm hover:text-primary"><span>{beat.title || beat.label}</span><span className="text-xs text-muted-foreground">{chapters.filter(row=>row.chapter?.content?.trim()).length}/{chapters.length} chapters readable</span></button>)}
        {!group.beats.length ? <p className="py-3 text-sm text-muted-foreground">Beats have not been planned yet.</p> : null}
      </> : selected.kind === "beat" ? <>
        {text("Story direction",beat?.summary)}{text("Suggested chapter range",beat?.chapterSpanHint)}
        {beat?.mustDeliver.length ? <section className="py-3"><h3 className="mb-2 text-sm font-medium">Must deliver</h3><ul className="list-disc space-y-2 pl-5">{beat.mustDeliver.map((item,index)=><li key={index} className="leading-7">{item}</li>)}</ul></section> : null}
      </> : <><p className="mb-3 text-sm text-muted-foreground">Chapter plan · Awaiting manuscript</p>{goal}{text("Task instructions",targets?.taskSheet)}</>}
      {selected.kind !== "plan" ? <section className="mt-5"><h3 className="text-sm font-medium">Chapters in this section</h3>{chapters.map(row=><button key={row.plan?.id} onClick={()=>onSelect(chapterSelection(row))} className="flex w-full items-center justify-between gap-3 border-b border-border/30 py-3 text-left text-sm hover:text-primary"><span>Chapter {row.plan?.chapterOrder} · {row.chapter?.title ?? row.plan?.title}</span><span className="shrink-0 text-xs text-muted-foreground">{row.chapter?.content?.trim() ? "Ready to read" : "Awaiting manuscript"}</span></button>)}{!chapters.length ? <p className="py-3 text-sm text-muted-foreground">No chapter plans yet.</p> : null}</section> : null}
    </>}
  </div>;
}
