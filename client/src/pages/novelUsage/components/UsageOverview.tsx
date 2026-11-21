import type { NovelUsagePage, NovelUsageSummary } from "@ai-novel/shared/types/llmUsage";
import { formatUsageTokens, usageCoverageNotes, usageTime } from "../presentation";

export function UsageOverview({ data }: { data: NovelUsagePage }) {
  const summary = data.summary;
  return <section aria-label="Recorded book usage" className="space-y-5 border-b border-border/60 pb-6">
    <h2 className="text-sm font-semibold">Recorded book usage</h2>
    <dl className="grid grid-cols-2 gap-x-8 gap-y-5 lg:grid-cols-4">
      <Metric label="Total tokens" value={summary.totalTokens} />
      <div><Metric label="Input tokens" value={summary.promptTokens} /><div className="mt-2 space-y-1 text-xs text-muted-foreground tabular-nums">
        <p>Cache hits {formatUsageTokens(summary.cacheHitTokens)}</p>
        <p>Cache misses {formatUsageTokens(summary.cacheMissTokens)}</p>
      </div></div>
      <Metric label="Output tokens" value={summary.completionTokens} />
      <div><dt className="text-xs text-muted-foreground">Recorded invocations</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{summary.recordedCallCount.toLocaleString("en-US")}</dd><p className="mt-2 text-xs text-muted-foreground">{summary.failedCallCount} failed · {summary.partialCallCount} partial</p></div>
    </dl>
    <div className="space-y-1 text-xs leading-relaxed text-muted-foreground">
      <p>Total tokens include input and output. Cache hits and misses are part of input and are not added again to the total.</p>
      <p>The log records completed invocations; usage for an in-progress generation is updated when the invocation ends.</p>
      <p>{data.firstRecordedAt ? `Earliest invocation: ${usageTime(data.firstRecordedAt)}. ` : "This novel has no invocation records. "}Unrecorded historical invocations cannot be calculated retroactively; usage not returned by the provider is shown as “Not provided.”</p>
      {usageCoverageNotes(summary).map(note => <p key={note}>{note}</p>)}
    </div>
    {data.chapterBreakdown.length ? <details className="pt-2">
      <summary className="cursor-pointer text-sm font-medium">Usage by chapter</summary>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs tabular-nums"><thead className="text-muted-foreground"><tr><th className="py-2 font-normal">Chapter / scope</th><th className="px-3 font-normal">Invocations</th><th className="px-3 font-normal">Input</th><th className="px-3 font-normal">Output</th><th className="px-3 font-normal">Total tokens</th></tr></thead><tbody className="divide-y divide-border/50">{data.chapterBreakdown.map(row => <tr key={row.chapterId ?? "book"}><td className="py-3">{row.label}{row.unknownUsageCallCount || row.partialCallCount ? <span className="ml-2 text-muted-foreground">Incomplete stats</span> : null}</td><td className="px-3">{row.recordedCallCount}</td><td className="px-3">{formatUsageTokens(row.promptTokens)}</td><td className="px-3">{formatUsageTokens(row.completionTokens)}</td><td className="px-3">{formatUsageTokens(row.totalTokens)}</td></tr>)}</tbody></table></div>
    </details> : null}
  </section>;
}

function Metric({label, value}: {label: string; value: NovelUsageSummary["totalTokens"]}) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-2 text-2xl font-semibold tabular-nums">{formatUsageTokens(value)}</dd></div>;
}
