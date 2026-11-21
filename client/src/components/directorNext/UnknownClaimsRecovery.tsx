import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import type {DirectorUnknownClaimsView} from "@ai-novel/shared/types/director/unknownClaims";
import {createDirectorCommandKey, submitDirectorCommand} from "@/api/directorNext";
import {queryKeys} from "@/api/queryKeys";
import {Button} from "@/components/ui/button";

export default function UnknownClaimsRecovery({claims, runId, novelId, expectedVersion, disabled = false}: {
  claims: DirectorUnknownClaimsView; runId: string; novelId: string; expectedVersion: number; disabled?: boolean;
}) {
  const [checked, setChecked] = useState(false);
  const [commandKey, setCommandKey] = useState(createDirectorCommandKey);
  const [deferred, setDeferred] = useState(false);
  const queries = useQueryClient();
  const mutation = useMutation({mutationFn: () => {
    if (!checked) throw new Error("Open this chapter and review its text before confirming that it should be run again.");
    return submitDirectorCommand({type: "resume", runId, expectedVersion, idempotencyKey: commandKey,
      resolveUnknownClaims: {chapterId: claims.chapterId}});
  }, onSuccess: async () => {
    await Promise.all([
      queries.invalidateQueries({queryKey: queryKeys.directorNext.summary(novelId)}),
      queries.invalidateQueries({queryKey: queryKeys.directorNext.detail(novelId)}),
      queries.invalidateQueries({queryKey: queryKeys.directorNext.runs(false)}),
      queries.invalidateQueries({queryKey: queryKeys.directorNext.runs(true)}),
    ]);
  }});
  const busy = disabled || mutation.isPending || mutation.isSuccess;
  if (deferred) return <section id="director-unknown-claims" className="space-y-3 py-4" role="status">
    <p className="text-xs leading-5 text-muted-foreground">Chapter {claims.chapterOrder} is paused and its progress is saved. Review the text and return here when you're ready.</p>
    <Button size="sm" variant="ghost" disabled={disabled} onClick={() => setDeferred(false)}>Review pending step</Button>
  </section>;
  return <section id="director-unknown-claims" aria-labelledby="unknown-claims-title" className="scroll-mt-4 space-y-3 border-t border-border/60 py-4">
    <h3 id="unknown-claims-title" className="text-sm font-semibold">Chapter {claims.chapterOrder} has a result awaiting confirmation</h3>
    <p role="status" className="text-xs leading-5 text-muted-foreground">The run stopped before this step's result was saved, so we can't tell whether it finished. To avoid running it twice, the run is paused until you confirm.</p>
    <p className="text-xs leading-5 text-muted-foreground">Open Chapter {claims.chapterOrder} from the directory and review its text. If the text is complete and correct, check the box below; AI will rerun this step and continue. If anything is missing or incorrect, don't confirm—leave the run paused.</p>
    <label className="flex items-start gap-2 text-xs leading-5"><input type="checkbox" className="mt-1" checked={checked} disabled={busy}
      onChange={event => {setChecked(event.target.checked); setCommandKey(createDirectorCommandKey());}}/>I've reviewed Chapter {claims.chapterOrder} and confirmed that its text is complete</label>
    <Button className="w-full" disabled={busy || !checked} onClick={() => mutation.mutate()}>{mutation.isPending ? "Submitting…" : mutation.isSuccess ? "Submitted; resuming…" : "Confirm and rerun this step"}</Button>
    <Button className="w-full" variant="ghost" disabled={busy} onClick={() => setDeferred(true)}>Keep paused</Button>
    {mutation.isError ? <p role="alert" className="text-xs text-destructive">{mutation.error.message}</p> : null}
  </section>;
}
