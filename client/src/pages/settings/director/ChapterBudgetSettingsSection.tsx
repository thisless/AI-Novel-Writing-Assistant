import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {DEFAULT_DIRECTOR_CHAPTER_TOKEN_LIMIT, directorChapterTokenLimitSchema, MAX_DIRECTOR_CHAPTER_TOKEN_LIMIT} from "@ai-novel/shared/types/director/chapterBudget";
import {getDirectorChapterBudgetSettings, saveDirectorChapterBudgetSettings} from "@/api/settings";
import {queryKeys} from "@/api/queryKeys";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";

export function ChapterBudgetSettingsSection() {
  const queries = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const query = useQuery({queryKey: queryKeys.settings.directorChapterBudget, queryFn: getDirectorChapterBudgetSettings});
  const value = draft ?? String(query.data?.data?.tokenLimit ?? DEFAULT_DIRECTOR_CHAPTER_TOKEN_LIMIT);
  const valid = value.trim() !== "" && directorChapterTokenLimitSchema.safeParse(Number(value)).success;
  const save = useMutation({mutationFn: () => saveDirectorChapterBudgetSettings({tokenLimit: Number(value)}),
    onSuccess: async response => {
      queries.setQueryData(queryKeys.settings.directorChapterBudget, response);
      setDraft(null);
      setFeedback(response.message ?? "Per-chapter AI usage limit saved. It will apply to new tasks.");
      await queries.invalidateQueries({queryKey: queryKeys.settings.directorChapterBudget});
    }, onError: error => setFeedback(error instanceof Error ? error.message : "Failed to save. Please try again.")});
  return <section className="space-y-3 py-4" aria-labelledby="chapter-budget-settings-title">
    <div className="space-y-1">
      <h2 id="chapter-budget-settings-title" className="text-base font-medium">Per-chapter AI usage limit</h2>
      <p className="text-sm text-muted-foreground">Set the cumulative AI usage limit per chapter for new tasks. When the limit is reached, or the remaining budget is insufficient for the next step, AI will save progress and ask whether you want to add more budget.</p>
    </div>
    <label className="block max-w-xs space-y-2 text-sm">Default limit (tokens)
      <Input type="number" min={16001} max={MAX_DIRECTOR_CHAPTER_TOKEN_LIMIT} step={1} value={value}
        disabled={query.isLoading || save.isPending} aria-invalid={!valid}
        onChange={event => {setDraft(event.target.value); setFeedback("");}}/>
    </label>
    <p className="text-xs leading-5 text-muted-foreground">Default: 100,000; range: 16,001–10,000,000. The total is based on uncached input and output tokens, and differs from the model's maximum output per request. Each task keeps the limit set when it starts.</p>
    {!valid ? <p className="text-xs text-destructive">Enter a whole number between 16,001 and 10,000,000.</p> : null}
    {query.isError ? <p role="alert" className="text-xs text-destructive">Failed to load settings. Please try again.<Button size="sm" variant="ghost" onClick={() => void query.refetch()}>Reload</Button></p> : null}
    <Button disabled={query.isLoading || query.isError || save.isPending || !valid} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save"}</Button>
    {feedback ? <p role="status" className="text-sm text-muted-foreground">{feedback}</p> : null}
  </section>;
}
