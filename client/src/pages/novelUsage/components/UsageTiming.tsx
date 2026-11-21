import type { NovelUsagePage } from "@ai-novel/shared/types/llmUsage";
import { formatUsageDuration, usageStageLabel } from "../presentation";

const colors = ["bg-primary", "bg-sky-500", "bg-amber-500", "bg-violet-500", "bg-emerald-500"];
export function UsageTiming({ data, onJump }: { data: NovelUsagePage; onJump: (id: string) => void }) {
  const timing = data.timing;
  return <section aria-label="Invocation timing" className="space-y-4 border-b border-border/60 pb-5">
    <div className="flex flex-wrap gap-6 text-sm"><p>Average duration <strong className="tabular-nums">{formatUsageDuration(timing.averageMs)}</strong></p><p>Slowest invocation {timing.slowest ? <button type="button" className="text-primary underline underline-offset-4" onClick={() => onJump(timing.slowest!.invocationId)}>{formatUsageDuration(timing.slowest.durationMs)} · View invocation</button> : "Not provided"}</p></div>
    <p className="text-xs text-muted-foreground">Duration and stage statistics include all timed invocations matching the current filters. Stage totals include retries; parallel invocation durations are added together and do not equal chapter generation wait time.</p>
    <details><summary className="cursor-pointer text-sm font-medium">Stage duration by chapter</summary>
      <div className="mt-4 space-y-5">{timing.chapters.map(row => {
        const total = row.steps.reduce((sum, step) => sum + step.durationMs, 0), chapter = data.facets.chapters.find(ch => ch.id === row.chapterId);
        return <div key={row.chapterId ?? "book"} className="space-y-2 text-xs"><p>{chapter ? `Chapter ${chapter.order} · ${chapter.title}` : "Book-level / no chapter"}{row.steps[0] ? <span className="ml-3 text-muted-foreground">Slowest stage: {usageStageLabel(row.steps[0].stage)} · {formatUsageDuration(row.steps[0].durationMs)}</span> : null}</p>
          <div className="flex h-3 overflow-hidden rounded bg-muted" role="img" aria-label={row.steps.map(step => `${usageStageLabel(step.stage)} ${formatUsageDuration(step.durationMs)}`).join("；")}>{row.steps.map((step, index) => <div key={step.stage ?? "unknown"} className={colors[index % colors.length]} style={{ width: `${total ? step.durationMs / total * 100 : 0}%` }} title={`${usageStageLabel(step.stage)} ${formatUsageDuration(step.durationMs)}`} />)}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">{row.steps.map((step, index) => <span key={step.stage ?? "unknown"}><span className={`mr-1 inline-block h-2 w-2 rounded-full ${colors[index % colors.length]}`} />{usageStageLabel(step.stage)} {formatUsageDuration(step.durationMs)}</span>)}</div>
        </div>;
      })}</div>
    </details>
  </section>;
}
