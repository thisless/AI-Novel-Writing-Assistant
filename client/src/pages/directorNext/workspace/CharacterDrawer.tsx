import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCharacterTimeline } from "@/api/novel";
import { getCharacterDynamicsOverview } from "@/api/novelCharacterDynamics";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { AppDialogContent, Dialog } from "@/components/ui/dialog";
import { visibleCharacterHistory } from "./model";
import type { WorkspaceBook, WorkspaceCharacter } from "./model";
import { previewCharacterHistory } from "./previewBook";
import {CharacterAppearances} from "./characters/CharacterAppearances";

export function CharacterDrawer({ book, character, readingOrder, preview, onClose, onChapter, onPlan, onResources }: {
  book: WorkspaceBook; character: WorkspaceCharacter; readingOrder: number | null; preview: boolean;
  onClose: () => void; onChapter: (id: string) => void; onPlan: (id: string) => void;
  onResources?: (id:string) => void;
}) {
  const [latest, setLatest] = useState(false);
  const historyQuery = useQuery({
    queryKey: ["director-workspace", "character-history", book.novel.id, character.id],
    queryFn: () => getCharacterTimeline(book.novel.id, character.id), enabled: !preview, retry: false, refetchInterval: 10000,
  });
  // The existing overview contains mutable latest fields even when chapterOrder is supplied.
  // Request/display it only after the reader explicitly chooses latest state.
  const latestQuery = useQuery({
    queryKey: queryKeys.novels.characterDynamicsOverview(book.novel.id),
    queryFn: () => getCharacterDynamicsOverview(book.novel.id), enabled: !preview && latest, retry: false, refetchInterval: 10000,
  });
  const history = visibleCharacterHistory(preview ? previewCharacterHistory[character.id] ?? [] : historyQuery.data?.data ?? [], latest ? "latest" : readingOrder);
  const latestCharacter = latestQuery.data?.data?.characters.find(row => row.characterId === character.id);
  const currentGoal = preview ? character.currentGoal : latestCharacter?.currentGoal;
  const currentState = preview ? (character.id === "lin" ? "Admitted Shen Zhi into the city and began investigating the old city mark." : null) : latestCharacter?.currentState;
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <AppDialogContent title={character.name} description="View character changes and their chapter sources" className="left-auto right-0 top-0 h-dvh max-h-dvh w-full max-w-md translate-x-0 translate-y-0 rounded-none sm:w-[420px]">
      <div className="flex gap-2" role="group" aria-label="Character record range">
        <Button size="sm" variant={!latest ? "default" : "ghost"} onClick={() => setLatest(false)}>Up to this chapter</Button>
        <Button size="sm" variant={latest ? "default" : "ghost"} onClick={() => setLatest(true)}>Latest status</Button>
      </div>
      <p className="mt-3 text-xs leading-6 text-muted-foreground">{latest ? "Includes saved records from the entire novel and may reveal later plot developments." : readingOrder === null ? "Select a chapter to read before viewing changes within that range." : `Showing changes through Chapter ${readingOrder} only.`}</p>
      {onResources ? <Button size="sm" variant="ghost" className="mt-3" onClick={()=>onResources(character.id)}>View inventory & resources</Button> : null}
      {latest ? <section className="mt-6 space-y-3 rounded-md bg-muted/40 p-4">
        <h3 className="text-sm font-medium">Latest saved status</h3>
        {!preview && latestQuery.isError ? <p role="alert" className="text-sm text-destructive">Couldn't load the latest status. <Button size="sm" variant="ghost" onClick={() => void latestQuery.refetch()}>Reload</Button></p>
          : latestQuery.isLoading && !preview ? <p className="text-sm text-muted-foreground">Loading latest status…</p>
            : <><p className="whitespace-pre-wrap text-sm leading-7">{currentState || "No status description"}</p><p className="whitespace-pre-wrap text-sm leading-7"><span className="text-muted-foreground">Action goal: </span>{currentGoal || "No action goal"}</p><p className="text-xs text-muted-foreground">No chapter-by-chapter history snapshot is available for this status.</p></>}
      </section> : null}
      <CharacterAppearances novelId={book.novel.id} characterId={character.id} preview={preview} boundary={latest ? "latest" : readingOrder} planning={book.planning} onSelect={target=>{if(target.kind==="chapter") onChapter(target.id);else onPlan(target.id);onClose();}}/>
      <section className="mt-7"><h3 className="text-sm font-semibold">Other changes</h3>
        {!preview && historyQuery.isError ? <p role="alert" className="mt-4 text-sm text-destructive">Couldn't load character changes. <Button size="sm" variant="ghost" onClick={() => void historyQuery.refetch()}>Reload</Button></p>
          : !preview && historyQuery.isLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading character changes…</p>
            : history.length === 0 ? <p className="mt-4 text-sm leading-7 text-muted-foreground">{readingOrder === null && !latest ? "No chapter selected." : "No sourced changes in this range. Character details are available below."}</p>
              : <ol className="mt-3 divide-y divide-border/50">{history.map(event => {
                const source = book.chapters.find(chapter => event.chapterId ? chapter.id === event.chapterId : chapter.order === event.chapterOrder);
                return <li key={event.id} className="space-y-2 py-4"><h4 className="text-sm font-medium">{event.title}</h4><p className="whitespace-pre-wrap text-sm leading-7 text-foreground/80">{event.content}</p>
                  {source ? <Button size="sm" variant="ghost" className="-ml-3 text-xs text-primary" onClick={() => { onChapter(source.id); onClose(); }}>Source: Chapter {source.order} · {source.title}</Button>
                    : <p className="text-xs text-muted-foreground">{typeof event.chapterOrder === "number" ? `Source: Chapter ${event.chapterOrder} (prose not in directory)` : "Chapter source not specified"}</p>}
                </li>;
              })}</ol>}
      </section>
      <details className="mt-6 border-t border-border/50 pt-5"><summary className="cursor-pointer text-sm font-medium">Character profile · Novel-wide details</summary><dl className="mt-4 space-y-4 text-sm leading-7">
        <div><dt className="text-muted-foreground">Identity</dt><dd>{character.role}</dd></div><div><dt className="text-muted-foreground">Personality</dt><dd>{character.personality || "Not provided"}</dd></div><div><dt className="text-muted-foreground">Narrative role</dt><dd>{character.storyFunction || "Not provided"}</dd></div>
      </dl></details>
    </AppDialogContent>
  </Dialog>;
}
