import type { Selection, WorkspaceBook } from "./model";
import {WorldDetail,StoryDetail,CharacterDetail,CastOverview,PlanningOverview} from "./assets";
import {CharacterAppearances} from "./characters/CharacterAppearances";

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return <section className="space-y-3 py-5"><h3 className="text-sm font-medium text-muted-foreground">{label}</h3><p className="whitespace-pre-wrap text-base leading-8">{value || "Not provided"}</p></section>;
}

export function AssetDetail({ book, selected, onCharacter, onSelect, preview=false }: { book: WorkspaceBook; selected: Selection; onCharacter: (id: string) => void; onSelect?: (selection:Selection)=>void; preview?:boolean }) {
  const { materials } = book;
  const character = selected.kind === "character" ? materials.characters.find(row => row.id === selected.id) : null;
  const volume = selected.kind === "volume" ? materials.volumes.find(row => row.id === selected.id) : null;
  return <div className="mx-auto max-w-[42rem] px-2 pb-10 sm:px-6">
    <p className="mb-3 text-xs tracking-widest text-muted-foreground">Novel materials</p>
    <h2 className="mb-5 text-2xl font-semibold">{character?.name ?? volume?.title ?? (selected.kind === "world" ? materials.world?.name ?? "World setting" : selected.kind === "characters" ? "Cast" : selected.kind === "volumes" ? "Volumes & chapter plan" : "Story plan")}</h2>
    {selected.kind === "story" ? <StoryDetail materials={materials}/> : null}
    {selected.kind === "world" ? <WorldDetail world={materials.world}/> : null}
    {selected.kind === "characters" ? <CastOverview book={book} onSelect={onSelect}/> : null}
    {selected.kind === "volumes" ? <PlanningOverview book={book} onSelect={onSelect}/> : null}
    {character && onSelect ? <CharacterAppearances novelId={book.novel.id} characterId={character.id} boundary="latest" preview={preview} planning={book.planning} onSelect={onSelect}/> : null}
    {character ? <CharacterDetail character={character} onCharacter={onCharacter} onResources={onSelect ? id=>onSelect({kind:"character_resources",id}) : undefined}/> : null}
    {volume ? <div className="divide-y divide-border/40"><Field label="Volume story" value={volume.summary} /><Field label="Reader promise" value={volume.mainPromise} /><Field label="Planned chapter count" value={String(volume.chapterCount)} /></div> : null}
  </div>;
}
