import { BookOpen, Globe2, Users, Layers, FileText, Map, Network, ChevronRight, ListChecks, Package, CalendarDays } from "lucide-react";
import type { ReactNode } from "react";
import type { Selection, WorkspaceBook } from "./model";
import { buildStoryDirectory, beatSelection, chapterSelection, sameSelection, beatChapterLabel } from "./planning";
import type { PlannedChapter } from "./planning";
import { CharacterDirectoryItem } from "./characters/CharacterDirectoryItem";

const chapterLabels = {
  waiting_planning: "Planning", waiting_writing: "Awaiting writing", generating: "Writing", reviewing: "Reviewing",
  quality_debt: "Needs revision", replan_required: "Needs adjustment", completed: "Ready to read", error: "Needs attention",
};

export function ResourceDirectory({ book, selected, onSelect }: { book: WorkspaceBook; selected: Selection; onSelect: (item: Selection) => void }) {
  const tree = buildStoryDirectory(book, book.planning);
  function row(item: Selection, label: string, icon?: ReactNode, note?: string) {
    const active = sameSelection(selected, item) || (item.kind === "resources" && selected.kind === "character_resources");
    return <button type="button" key={"id" in item ? item.id : item.kind} aria-current={active ? "true" : undefined}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-primary/10 font-medium text-primary" : "text-foreground/80"}`}
      onClick={() => onSelect(item)}>
      {icon}<span className="min-w-0 flex-1 truncate">{label}</span>{note ? <span className="shrink-0 text-[10px] text-muted-foreground">{note}</span> : null}
    </button>;
  }
  function chapterRow(item: PlannedChapter) {
    return row(chapterSelection(item), `${item.chapter?.order ?? item.plan?.chapterOrder}. ${item.chapter?.title ?? item.plan?.title}`, undefined,
      item.chapter ? chapterLabels[item.chapter.status] : "Awaiting manuscript");
  }
  function contains(rows: PlannedChapter[]) { return rows.some(item => sameSelection(chapterSelection(item), selected)); }
  function group(label: string, icon: ReactNode, count: number, children: ReactNode) {
    return <details open className="mt-5"><summary className="mb-2 flex cursor-pointer items-center gap-2 px-3 text-xs font-medium text-muted-foreground">{icon}{label}<span className="ml-auto">{count}</span></summary>{children}{count === 0 ? <p className="px-3 py-2 text-xs text-muted-foreground">No {label.toLowerCase()} yet.</p> : null}</details>;
  }
  return <nav aria-label="Novel resource directory" className="max-h-[70dvh] min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4 md:max-h-none">
    <p className="px-3 pb-3 text-xs font-medium tracking-widest text-muted-foreground">Story directory</p>
    {row({kind:"volumes"}, "Volumes & chapter plan", <Layers className="h-4 w-4" />)}
    {tree.volumes.map(({volume,beats,chapters,unassigned}) => <details key={volume.id} open={contains(chapters) || (selected.kind === "volume" && selected.id === volume.id) || (selected.kind === "beat" && selected.volumeId === volume.id)} className="mb-3">
      <summary className="cursor-pointer px-2 py-2 text-sm font-medium">{volume.title}</summary>
      <div className="ml-2">
        {row({kind:"volume",id:volume.id}, "View volume outline", <Layers className="h-3.5 w-3.5" />)}
        {beats.map(({beat,chapters:beatChapters}) => <details key={beat.key} className="group/beat" open={contains(beatChapters) || sameSelection(selected,beatSelection(volume.id,beat))}>
          <summary className="flex min-w-0 cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs text-muted-foreground [&::-webkit-details-marker]:hidden">
            <ChevronRight aria-hidden="true" className="h-3 w-3 shrink-0 transition-transform group-open/beat:rotate-90"/>
            <span className="min-w-0 flex-1 truncate" title={beat.title || beat.label}>{beat.title || beat.label}</span>
            <span title={beatChapterLabel(beatChapters)} className="max-w-[55%] shrink-0 truncate text-[10px] group-open/beat:hidden">{beatChapterLabel(beatChapters)}</span>
          </summary>
          <div className="ml-3">{row(beatSelection(volume.id,beat),"View beat goals")}{beatChapters.map(chapterRow)}{beatChapters.length === 0 ? <p className="px-3 py-2 text-xs text-muted-foreground">No chapter plans yet.</p> : null}</div>
        </details>)}
        {beats.length === 0 ? <p className="px-3 py-2 text-xs text-muted-foreground">Beats have not been planned yet.</p> : null}
        {unassigned.length ? <div><p className="px-3 py-2 text-xs text-muted-foreground">Unassigned chapters</p>{unassigned.map(chapterRow)}</div> : null}
      </div>
    </details>)}
    {tree.unassigned.length ? group(book.planning ? "Unassigned chapters" : "Chapters", <FileText className="h-3.5 w-3.5" />, tree.unassigned.length, tree.unassigned.map(chapterRow)) : null}
    {!book.planning ? group("Volume outlines", <Layers className="h-3.5 w-3.5" />, book.materials.volumes.length, book.materials.volumes.map(volume => row({kind:"volume",id:volume.id},volume.title))) : null}
    <p className="mt-6 px-3 pb-3 text-xs font-medium tracking-widest text-muted-foreground">Novel assets</p>
    {row({ kind: "story" }, "Story plan", <BookOpen className="h-4 w-4" />)}
    {row({ kind: "world" }, "World setting", <Globe2 className="h-4 w-4" />)}
    {row({ kind: "world_map" }, "World map", <Map className="h-4 w-4" />)}
    {row({ kind: "character_graph" }, "Character relationships", <Network className="h-4 w-4" />)}
    {row({ kind: "foreshadowing" }, "Foreshadowing", <ListChecks className="h-4 w-4" />)}
    {row({ kind: "resources" }, "Inventory & resources", <Package className="h-4 w-4" />)}
    {row({ kind: "characters" }, "Cast", <Users className="h-4 w-4" />, `${book.materials.characters.length} characters`)}
    {group("Characters", <Users className="h-3.5 w-3.5" />, book.materials.characters.length, <>
      {row({kind:"character_timeline"}, "Character timeline", <CalendarDays className="h-4 w-4"/>)}
      {book.materials.characters.map(character => <CharacterDirectoryItem key={character.id} character={character}
        active={selected.kind === "character" && selected.id === character.id} onSelect={() => onSelect({ kind: "character", id: character.id })} />)}
    </>)}
  </nav>;
}
