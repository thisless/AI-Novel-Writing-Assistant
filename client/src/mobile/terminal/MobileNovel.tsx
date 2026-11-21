import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { getNovelDetail } from "@/api/novel";
import { Button } from "@/components/ui/button";
import { MobileChapter } from "./MobileChapter";
import { MobileTaskPanel } from "./MobileTaskPanel";

export function MobileNovel({ novelId, chapterId }: { novelId: string; chapterId?: string }) {
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ["mobileNovel", novelId], queryFn: () => getNovelDetail(novelId), refetchInterval: 10000 });
  const novel = query.data?.data;
  if (!novel) return <section>{query.isError ? <><p role="alert">Could not load the novel.</p><Button onClick={() => void query.refetch()}>Try again</Button></> : <p role="status">Loading novel…</p>}</section>;
  const written = novel.chapters.filter(chapter => Boolean(chapter.content?.trim()));
  const selected = chapterId ? novel.chapters.find(chapter => chapter.id === chapterId) : written[written.length - 1] ?? novel.chapters[0];
  return <section className="space-y-5">
    <Button asChild variant="ghost" size="sm"><Link to="/novels">Back to novels</Link></Button>
    <header className="space-y-2"><h1 className="text-xl font-semibold">{novel.title}</h1><p className="text-sm text-muted-foreground">Written: {written.length} / {novel.estimatedChapterCount ?? novel.chapters.length} chapters · Planned: {novel.chapters.length} chapters</p></header>
    <MobileTaskPanel novelId={novelId} version={novel.directorVersion ?? "v1"} />
    <label className="block space-y-2 text-sm"><span>Chapters and status</span><select className="w-full rounded-md border bg-background px-3 py-3 text-base" value={selected?.id ?? ""} onChange={event => navigate(`/novels/${encodeURIComponent(novelId)}/chapters/${encodeURIComponent(event.target.value)}`)}>
      {novel.chapters.map(chapter => <option key={chapter.id} value={chapter.id}>Chapter {chapter.order} · {chapter.title} · {chapter.content?.trim() ? "Ready to read" : "Not generated"}</option>)}
    </select></label>
    {chapterId && !selected ? <p role="alert">Chapter not found. Select one from the list.</p> : null}
    {selected ? <MobileChapter key={selected.id} novelId={novelId} chapter={selected} /> : <p className="text-sm text-muted-foreground">Chapters will appear here after the outline is saved.</p>}
  </section>;
}
