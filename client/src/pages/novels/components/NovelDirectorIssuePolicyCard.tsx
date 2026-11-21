import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DIRECTOR_ISSUE_ACTIONS,
  DIRECTOR_ISSUE_CATALOG,
  DIRECTOR_ISSUE_POLICY_PRESETS,
  resolveChapterReviewRetryPolicy,
  type DirectorIssueAction,
  type DirectorIssueCode,
  type DirectorIssuePolicyOverride,
} from "@ai-novel/shared/types/directorIssue";
import { getNovelDirectorIssuePolicy, saveNovelDirectorIssuePolicy } from "@/api/novelDirector";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChapterReviewRetryFields } from "@/components/settings/ChapterReviewRetryFields";

const ACTION_LABELS: Record<DirectorIssueAction, string> = {
  auto_retry: "Retry automatically",
  continue_with_warning: "Record a warning and continue",
  pause_for_manual: "Pause for manual handling",
  fail_task: "End the task",
};

const CONFIGURABLE_ISSUES = DIRECTOR_ISSUE_CATALOG;

export default function NovelDirectorIssuePolicyCard({ novelId }: { novelId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.tasks.directorIssuePolicy(novelId),
    queryFn: () => getNovelDirectorIssuePolicy(novelId),
  });
  const response = query.data?.data;
  const [draft, setDraft] = useState<DirectorIssuePolicyOverride | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (response) setDraft(response.override ?? {});
  }, [response]);

  const mutation = useMutation({
    mutationFn: (override: DirectorIssuePolicyOverride | null) => saveNovelDirectorIssuePolicy(novelId, override),
    onSuccess: async (result) => {
      setMessage(result.message ?? "Book-specific issue handling rules saved.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.directorIssuePolicy(novelId) });
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Failed to save book-specific issue handling rules."),
  });

  if (!response || draft === null) return null;
  const overrideActions = draft.issueActions ?? {};
  const savedActions = response.override?.issueActions ?? {};
  const hasCompleteActionMap = CONFIGURABLE_ISSUES.every(
    (entry) => overrideActions[entry.code] !== undefined,
  );
  const hasChanges = JSON.stringify(overrideActions) !== JSON.stringify(savedActions)
    || draft.maxAutomaticRetries !== response.override?.maxAutomaticRetries;
  const retryChanged = JSON.stringify(draft.chapterReviewRetryPolicy) !== JSON.stringify(response.override?.chapterReviewRetryPolicy);

  const setAction = (code: DirectorIssueCode, value: string) => {
    const nextActions = { ...overrideActions };
    if (!value) delete nextActions[code];
    else nextActions[code] = value as DirectorIssueAction;
    setDraft({ ...draft, issueActions: nextActions });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Book-specific issue handling preferences</CardTitle>
        <CardDescription>Choose a handling preset or adjust individual issues. Changes apply to future tasks after saving; safety protections still take priority.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          {DIRECTOR_ISSUE_POLICY_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="rounded-xl border border-border p-4 text-left transition-colors hover:bg-muted/40"
              onClick={() => setDraft({
                maxAutomaticRetries: preset.policy.maxAutomaticRetries,
                chapterReviewRetryPolicy: { ...preset.policy.chapterReviewRetryPolicy },
                issueActions: { ...preset.policy.issueActions },
              })}
            >
              <div className="text-sm font-semibold">{preset.name}</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">{preset.description}</div>
            </button>
          ))}
        </div>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2 text-sm">
          <span className="font-medium">Automatic retries during chapter runs</span>
          <select className="h-9 rounded-md border bg-background px-3 text-sm" value={draft.maxAutomaticRetries ?? response.effectivePolicy.maxAutomaticRetries} onChange={(event) => setDraft({ ...draft, maxAutomaticRetries: Number(event.target.value) })}>
            <option value={0}>No automatic retries</option>
            <option value={1}>Up to 1 retry</option>
          </select>
        </label>
        <ChapterReviewRetryFields value={draft.chapterReviewRetryPolicy ?? resolveChapterReviewRetryPolicy(response.effectivePolicy)}
          onChange={chapterReviewRetryPolicy => setDraft({ ...draft, chapterReviewRetryPolicy })} />
        {CONFIGURABLE_ISSUES.map((entry) => (
          <div key={entry.code} className="grid gap-2 rounded-md border p-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <div className="text-sm font-medium">{entry.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">Global: {ACTION_LABELS[response.effectivePolicy.issueActions[entry.code] ?? entry.defaultAction]}</div>
              {entry.lockedReason ? <div className="mt-1 text-xs text-amber-700">Safety note: {entry.lockedReason}{entry.enforcedAction ? ` When triggered, this will still ${ACTION_LABELS[entry.enforcedAction].toLowerCase()}.` : ""}</div> : null}
            </div>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={overrideActions[entry.code] ?? ""} onChange={(event) => setAction(entry.code, event.target.value)}>
              {!hasCompleteActionMap ? <option value="">Inherit global setting</option> : null}
              {DIRECTOR_ISSUE_ACTIONS.map((value) => <option key={value} value={value}>{ACTION_LABELS[value]}</option>)}
            </select>
          </div>
        ))}
        {hasChanges || retryChanged ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950" role="status">
            You changed this book's issue handling preferences. Saving affects future tasks. When a safety protection is triggered, the system may still pause or end the task and retain your choices for review.
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate(draft)}>{mutation.isPending ? "Saving…" : "Save book preferences"}</Button>
          <Button variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate(null)}>Restore global settings</Button>
          {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
