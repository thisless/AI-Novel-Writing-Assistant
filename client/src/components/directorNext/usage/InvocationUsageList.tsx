import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getDirectorUsage } from "@/api/directorNext";
import { formatCacheTokens } from "@/components/liveExecution/usage/presentation";
import { Button } from "@/components/ui/button";
export function InvocationUsageList({ runId, active = false }: {
    runId: string;
    active?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const query = useInfiniteQuery({ queryKey: ["directorInvocationUsage", runId], initialPageParam: undefined as string | undefined,
        queryFn: ({ pageParam }) => getDirectorUsage(runId, { cursor: pageParam }), getNextPageParam: last => last.data?.nextCursor ?? undefined,
        enabled: open, retry: false, refetchInterval: open && active ? 5000 : false });
    const summary = query.data?.pages[0]?.data?.recordedSummary;
    const items = query.data?.pages.flatMap(p => p.data?.items ?? []) ?? [];
    return <section className="border-t border-border/60 py-4">
 <button type="button" className="text-sm font-semibold" aria-expanded={open} onClick={() => setOpen(v => !v)}>{open ? "▾" : "▸"} AI usage</button>
 {open ? <div className="mt-3 space-y-3 text-xs">
 {query.isPending ? <p className="text-muted-foreground">Loading AI usage…</p> : query.isError ? <p className="text-muted-foreground">AI usage is unavailable. <button className="ml-2 underline" onClick={() => void query.refetch()}>Reload</button></p> : <>
 {summary ? <><p>Cache-hit tokens {formatCacheTokens(summary.inputCache.cacheHitTokens, "completed", summary.inputCache.cacheUsageStatus)}</p>
 <p>Cache-miss tokens {formatCacheTokens(summary.inputCache.cacheMissTokens, "completed", summary.inputCache.cacheUsageStatus)}</p>
 <p className="text-muted-foreground">{summary.recordedCallCount} calls recorded{summary.unknownCallCount + summary.invalidCallCount + summary.partialCallCount > 0 ? "; some calls have incomplete statistics." : "."} Historical calls don't include cache usage.</p></> : null}
 {!items.length ? <p className="text-muted-foreground">No AI usage has been recorded for this run.</p> : <ul className="divide-y divide-border/50">{items.map(item => <li key={item.invocationId} className="space-y-1 py-3">
 <p>{new Date(item.startedAt).toLocaleString()} · {item.stage ?? "Writing"}</p>
 <p className="break-words text-muted-foreground">{item.provider ?? "Unknown provider"} · {item.model ?? "Unknown model"} · {item.status === "completed" ? "Completed" : item.status === "partial" ? "Partial response" : "Failed"}</p>
 <p>Cache-hit tokens {formatCacheTokens(item.inputCache.cacheHitTokens, "completed", item.inputCache.cacheUsageStatus)}</p>
 <p>Cache-miss tokens {formatCacheTokens(item.inputCache.cacheMissTokens, "completed", item.inputCache.cacheUsageStatus)}</p>
 </li>)}</ul>}
 {query.hasNextPage ? <Button variant="ghost" size="sm" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>Load more calls</Button> : null}
 </>}
 </div> : null}</section>;
}
