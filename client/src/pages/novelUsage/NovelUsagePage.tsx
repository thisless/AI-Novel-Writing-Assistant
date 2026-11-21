import { getNovelInvocation } from "@/api/novel/usage";
import { UsageTiming } from "./components/UsageTiming";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { getNovelUsage } from "@/api/novel";
import { Button } from "@/components/ui/button";
import { UsageOverview } from "./components/UsageOverview";
import { UsageLogTable } from "./components/UsageLogTable";
import { formatUsageTokens, usageFiltersFromParams, usageStageLabel, usageStatusLabel } from "./presentation";

export default function NovelUsagePage() {
  const { id: novelId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const filters = usageFiltersFromParams(params);
  const queryClient = useQueryClient();
  const queryKey = ["novelInvocationUsage", novelId, filters];
  const query = useInfiniteQuery({
    queryKey, initialPageParam: undefined as string | undefined,
    queryFn: ({pageParam}) => getNovelUsage(novelId, {...filters, cursor: pageParam, limit: 30}),
    getNextPageParam: last => last.data?.nextCursor ?? undefined, enabled: Boolean(novelId), retry: false,
    refetchInterval: q => autoRefresh && (q.state.data?.pages.length ?? 0) <= 1 ? 15000 : false,
  });
  const focusedId = params.get("invocation") ?? undefined;
  const focused = useQuery({ queryKey: ["novel-invocation", novelId, focusedId], queryFn: () => getNovelInvocation(novelId, focusedId!), enabled: Boolean(focusedId) });
  const data = query.data?.pages[0]?.data;
  const items = query.data?.pages.flatMap(page => page.data?.items ?? []) ?? [];
  const focusedItem = focused.data?.data?.item;
  if (focusedItem && !items.some(item => item.invocationId === focusedItem.invocationId)) items.unshift({ ...focusedItem, chapter: data?.facets.chapters.find(ch => ch.id === focusedItem.chapterId) ?? null });
  useEffect(() => { if (focusedId) document.getElementById(`usage-${focusedId}`)?.scrollIntoView({ block: "center", behavior: "smooth" }); }, [focusedId, focusedItem]);
  const jump = (id: string) => { const next = new URLSearchParams(params); next.set("invocation", id); setParams(next, { replace: true }); };
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, {replace: true});
  };
  return <div className="mx-auto max-w-7xl space-y-6 pb-10">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-5">
      <div><h1 className="text-2xl font-semibold">AI Usage and Invocation Log</h1><p className="mt-2 text-sm text-muted-foreground">{data?.novel.title ?? "This novel"} · View input, output, and cached usage for each generation.</p></div>
      <div className="flex flex-wrap gap-2"><Button asChild variant="ghost"><Link to={`/lab/director/${encodeURIComponent(novelId)}`}>Back to Director</Link></Button><Button asChild variant="ghost"><Link to="/novels">Back to Library</Link></Button></div>
    </header>
    {query.isError ? <div role="alert" className="flex flex-wrap items-center gap-3 text-sm"><p>{query.error instanceof Error ? query.error.message : "Failed to load AI usage for this novel."}</p><Button size="sm" variant="outline" onClick={() => void query.refetch()}>Retry</Button>{Object.keys(filters).length ? <Button size="sm" variant="ghost" onClick={() => setParams({}, {replace: true})}>Clear filters</Button> : null}</div> : null}
    {query.isPending ? <p className="py-10 text-sm text-muted-foreground">Loading AI usage…</p> : data ? <>
      <UsageOverview data={data} />
      <UsageTiming data={data} onJump={jump} />
      {focused.isError ? <p role="alert" className="text-sm text-destructive">Failed to load the selected invocation. Please select it again.</p> : null}
      {focusedItem ? <p className="text-xs text-muted-foreground">The selected invocation is shown in the log and may be outside the current filter or page. <button className="ml-2 text-primary" onClick={() => { const next = new URLSearchParams(params); next.delete("invocation"); setParams(next, { replace: true }); }}>Clear selection</button></p> : null}
      <section aria-label="Invocation log" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Invocation log</h2><div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <label className="flex items-center gap-2"><input type="checkbox" checked={autoRefresh} onChange={event => setAutoRefresh(event.target.checked)} />Auto-refresh</label>
          <Button size="sm" variant="ghost" disabled={query.isFetching} onClick={() => void queryClient.resetQueries({queryKey, exact: true})}>Refresh log</Button>
        </div></div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Filter label="Chapter" value={filters.chapterId} onChange={value => setFilter("chapterId", value)} options={data.facets.chapters.map(ch => ({value: ch.id, label: `Chapter ${ch.order} · ${ch.title}`}))} />
          <Filter label="Stage" value={filters.stage} onChange={value => setFilter("stage", value)} options={data.facets.stages.map(stage => ({value: stage, label: usageStageLabel(stage)}))} />
          <Filter label="Provider" value={filters.provider} onChange={value => setFilter("provider", value)} options={data.facets.providers.map(provider => ({value: provider, label: provider}))} />
          <Filter label="Model" value={filters.model} onChange={value => setFilter("model", value)} options={data.facets.models.map(model => ({value: model, label: model}))} />
          <Filter label="Status" value={filters.status} onChange={value => setFilter("status", value)} options={["completed", "partial", "failed"].map(status => ({value: status, label: usageStatusLabel(status)}))} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"><p>Current filter: {data.filteredSummary.recordedCallCount.toLocaleString("en-US")} calls · Reported {formatUsageTokens(data.filteredSummary.totalTokens)} tokens</p>{Object.keys(filters).length ? <Button size="sm" variant="ghost" onClick={() => setParams({}, {replace: true})}>Clear filters</Button> : null}</div>
        <UsageLogTable items={items} novelId={novelId} focusedId={focusedId} onJump={jump} />
        {query.hasNextPage ? <Button variant="outline" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? "Loading…" : "Load more invocations"}</Button> : null}
        {autoRefresh ? <p className="text-xs text-muted-foreground">The latest records refresh every 15 seconds. After loading older pages, select “Refresh log” to return to the latest records.</p> : null}
      </section>
    </> : null}
  </div>;
}

function Filter({label, value, options, onChange}: {label: string; value?: string; options: {value: string; label: string}[]; onChange: (value: string) => void}) {
  return <label className="min-w-0 space-y-1 text-xs text-muted-foreground"><span>{label}</span><select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground" value={value ?? ""} onChange={event => onChange(event.target.value)}><option value="">All {label}</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
