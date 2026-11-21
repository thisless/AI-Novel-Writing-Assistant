import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getNovelList } from "@/api/novel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MobileShelf() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["mobileShelf", page, search], queryFn: () => getNovelList({ page, limit: 20, search }), refetchInterval: 10000 });
  const data = query.data?.data;
  return <section className="space-y-4">
    <h1 className="text-xl font-semibold">My novels</h1>
    <p className="text-sm text-muted-foreground">Track progress, read chapters, or continue a novel's tasks. Create novels and plan their materials on desktop.</p>
    <Input aria-label="Search novels" placeholder="Search novels" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />
    {query.isError ? <p role="alert">Could not load novels. <Button variant="ghost" onClick={() => void query.refetch()}>Try again</Button></p> : null}
    {query.isPending ? <p role="status">Loading novels…</p> : null}
    <div className="divide-y">{data?.items.map(novel => <Link className="block space-y-2 py-4" key={novel.id} to={`/novels/${encodeURIComponent(novel.id)}/edit`}>
      <h2 className="font-medium">{novel.title}</h2>
      <p className="text-sm text-muted-foreground">Written: {novel.bookProgress?.writtenChapters ?? 0} / {novel.bookProgress?.targetChapters ?? novel.estimatedChapterCount ?? novel._count.chapters} chapters · Planned: {novel._count.chapters} chapters</p>
      {novel.latestAutoDirectorTask?.currentItemLabel ? <p className="text-sm">{novel.latestAutoDirectorTask.currentItemLabel}</p> : null}
    </Link>)}</div>
    {data && data.total === 0 ? <p className="py-6 text-sm text-muted-foreground">No novels yet. Create one on desktop, then follow its progress here.</p> : null}
    {data && data.totalPages > 1 ? <div className="flex items-center justify-between"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-sm">{page} / {data.totalPages}</span><Button variant="outline" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Next</Button></div> : null}
  </section>;
}
