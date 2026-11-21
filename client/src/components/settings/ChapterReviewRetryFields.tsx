import { MAX_CHAPTER_REVIEW_RETRIES, type ChapterReviewRetryPolicy } from "@ai-novel/shared/types/directorIssue";

export function ChapterReviewRetryFields({ value, onChange }: {
  value: ChapterReviewRetryPolicy;
  onChange: (value: ChapterReviewRetryPolicy) => void;
}) {
  return (
    <div className="space-y-3 border-t pt-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium">Maximum manuscript review retries</span>
          <input type="number" min={0} max={MAX_CHAPTER_REVIEW_RETRIES} step={1}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value.maxRetries}
            onChange={event => {
              const maxRetries = Number(event.target.value);
              if (Number.isInteger(maxRetries) && maxRetries >= 0 && maxRetries <= MAX_CHAPTER_REVIEW_RETRIES) onChange({ ...value, maxRetries });
            }} />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">After retries are exhausted</span>
          <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value.onExhausted}
            onChange={event => onChange({ ...value, onExhausted: event.target.value as ChapterReviewRetryPolicy["onExhausted"] })}>
            <option value="continue_with_warning">Skip review and continue</option>
            <option value="pause_for_manual">Pause for manual handling</option>
          </select>
        </label>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Set 0–{MAX_CHAPTER_REVIEW_RETRIES} retries, excluding the initial manuscript review and the first check after revision. Reviews and corrections for the same chapter share this limit; 0 disables automatic retries.
        Skipping keeps the usable manuscript and marks the review incomplete. After a pause, continue from the novel workspace. The task stops if the manuscript is unusable or saving fails.
      </p>
    </div>
  );
}
