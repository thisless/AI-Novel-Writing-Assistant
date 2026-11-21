import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {Link} from "react-router-dom";
import type {DirectorChapterBudgetView} from "@ai-novel/shared/types/director/chapterBudget";
import {createDirectorCommandKey, submitDirectorCommand} from "@/api/directorNext";
import {queryKeys} from "@/api/queryKeys";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";

const stages = {draft: "Writing", review: "Chapter review", repair: "Revision", artifact_sync: "Asset sync"};
const format = (value: number) => value.toLocaleString("en-US");

export default function ChapterBudgetRecovery({budget, runId, novelId, expectedVersion, disabled = false}: {
  budget: DirectorChapterBudgetView; runId: string; novelId: string; expectedVersion: number; disabled?: boolean;
}) {
  const [limit, setLimit] = useState(String(budget.recommendedLimit));
  const [commandKey, setCommandKey] = useState(createDirectorCommandKey);
  const [applyToRemaining, setApplyToRemaining] = useState(false);
  const [deferred, setDeferred] = useState(false);
  const queries = useQueryClient();
  const minimum = Math.max(budget.tokenLimit, budget.usedTokens + budget.reserveTokens, applyToRemaining ? 16000 : 0) + 1;
  const valid = limit.trim() !== "" && Number.isSafeInteger(Number(limit)) && Number(limit) >= minimum && Number(limit) <= 10_000_000;
  const updateLimit = (value: string) => {setLimit(value); setCommandKey(createDirectorCommandKey());};
  const mutation = useMutation({mutationFn: () => {
    if (!valid) throw new Error(`The new chapter limit must be at least ${format(minimum)} tokens.`);
    return submitDirectorCommand({type: "resume", runId, expectedVersion, idempotencyKey: commandKey,
       chapterBudget: {jobId: budget.jobId, chapterId: budget.chapterId, metric: budget.metric, tokenLimit: Number(limit), applyToRemaining}});
  }, onSuccess: async () => {
    await Promise.all([
      queries.invalidateQueries({queryKey: queryKeys.directorNext.summary(novelId)}),
      queries.invalidateQueries({queryKey: queryKeys.directorNext.detail(novelId)}),
      queries.invalidateQueries({queryKey: queryKeys.directorNext.runs(false)}),
      queries.invalidateQueries({queryKey: queryKeys.directorNext.runs(true)}),
    ]);
  }});
  const busy = disabled || mutation.isPending || mutation.isSuccess;
  if (deferred) return <section id="director-chapter-budget" className="space-y-3 py-4" role="status">
    <p className="text-xs leading-5 text-muted-foreground">Chapter {budget.chapterOrder} is paused and its progress is saved. Adjust the budget when you're ready to continue.</p>
    <Button size="sm" variant="ghost" disabled={disabled} onClick={() => setDeferred(false)}>Adjust budget</Button>
  </section>;
  return <section id="director-chapter-budget" aria-labelledby="chapter-budget-title" className="scroll-mt-4 space-y-3 border-t border-border/60 py-4">
    <h3 id="chapter-budget-title" className="text-sm font-semibold">Chapter {budget.chapterOrder} usage and limit</h3>
    <p role="status" className="text-xs leading-5 text-muted-foreground">{budget.usedTokens >= budget.tokenLimit
      ? "This chapter has reached its usage limit. " : "The remaining budget is too low for the next step. "}The run is paused and its progress is saved. Increase the budget to continue from the saved progress.</p>
    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
      <dt className="text-muted-foreground">Used this chapter</dt><dd>{format(budget.usedTokens)} {budget.metric === "uncached_tokens_v1" ? "billable tokens" : "tokens"}</dd>
      <dt className="text-muted-foreground">Chapter limit</dt><dd>{format(budget.tokenLimit)} tokens</dd>
      <dt className="text-muted-foreground">{budget.stage ? stages[budget.stage] : "Next step"} reserve</dt><dd>{format(budget.reserveTokens)} tokens</dd>
    </dl>
    {budget.metric === "uncached_tokens_v1" ? <div className="space-y-1 text-xs leading-5 text-muted-foreground">
      <p>Billable usage is uncached input plus output, each counted once.</p>
      <p>Input {format(budget.promptTokens ?? 0)} · Cache hits {format(budget.cacheHitTokens ?? 0)} · Output {format(budget.completionTokens ?? 0)}</p>
      {budget.unclassifiedTokens ? <p>The API also reported {format(budget.unclassifiedTokens)} unclassified tokens. Without an input/output breakdown, they're conservatively included in this chapter's usage.</p> : null}
      <p>Raw total: {format(budget.rawTokens)} tokens. Billable usage is used to enforce the chapter limit.</p>
    </div> : <p className="text-xs leading-5 text-muted-foreground">This task uses raw cumulative tokens; historical usage keeps the same calculation.</p>}
    <label className="block space-y-2 text-xs">New chapter limit
      <Input type="number" min={minimum} max={10_000_000} step={1} value={limit} disabled={busy}
        aria-invalid={!valid} onChange={event => updateLimit(event.target.value)}/>
    </label>
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => updateLimit(String(budget.recommendedLimit))}>Use recommended limit: {format(budget.recommendedLimit)}</Button>
      <Button asChild size="sm" variant="ghost"><Link to={`/novels/${encodeURIComponent(novelId)}/ai-usage`}>View usage details</Link></Button>
    </div>
    {!valid ? <p className="text-xs text-destructive">Enter a whole-number limit between {format(minimum)} and 10,000,000.</p> : null}
    <label className="flex items-start gap-2 text-xs leading-5"><input type="checkbox" className="mt-1" checked={applyToRemaining} disabled={busy}
      onChange={event => {setApplyToRemaining(event.target.checked); setCommandKey(createDirectorCommandKey());}}/>Apply to later chapters in this task as well</label>
    <p className="text-xs leading-5 text-muted-foreground">{applyToRemaining
      ? "The new limit applies to this chapter and later chapters in the task; the global default is unchanged. "
      : "Only this chapter's limit changes; other chapters keep the task's current limit. "}Existing text and usage totals are preserved when you continue.</p>
    <Button className="w-full" disabled={busy || !valid} onClick={() => mutation.mutate()}>{mutation.isPending ? "Submitting…" : mutation.isSuccess ? "Submitted; resuming…" : "Add budget and continue this chapter"}</Button>
    <Button className="w-full" variant="ghost" disabled={busy} onClick={() => setDeferred(true)}>Keep paused</Button>
    {mutation.isError ? <p role="alert" className="text-xs text-destructive">{mutation.error.message}</p> : null}
  </section>;
}
