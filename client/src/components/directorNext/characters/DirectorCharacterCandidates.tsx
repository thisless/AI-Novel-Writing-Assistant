import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import type {DirectorCharacterCandidatePage, DirectorCharacterCandidateReview, CharacterCandidateAction} from "@ai-novel/shared/types/director/characterCandidates";
import {getDirectorCharacterCandidates, resolveDirectorCharacterCandidates} from "@/api/directorNext";
import {Button} from "@/components/ui/button";
import {queryKeys} from "@/api/queryKeys";

export function useDirectorCharacterCandidates(runId: string, enabled: boolean) {
  return useQuery({queryKey: ["director-character-candidates", runId], enabled,
    queryFn: () => getDirectorCharacterCandidates(runId), refetchInterval: enabled ? 4000 : false});
}

function Review({review, page, runId, novelId}: {review: DirectorCharacterCandidateReview; page: DirectorCharacterCandidatePage; runId: string; novelId: string}) {
  const queryClient = useQueryClient();
  const pending = review.items.filter(i => i.status === "pending");
  const [choices, setChoices] = useState<Record<string, {action: CharacterCandidateAction | ""; targetId?: string}>>(() => Object.fromEntries(pending.map(i => [i.id,
    {action: i.recommendation === "defer" ? "" : i.recommendation, targetId: i.targetId ?? undefined}])));
  const mutation = useMutation({mutationFn: async () => {
    await resolveDirectorCharacterCandidates(runId, {reviewId: review.id, revision: review.revision, contentHash: review.contentHash,
      decisions: pending.map(i => ({candidateId: i.id, action: choices[i.id].action as CharacterCandidateAction, targetId: choices[i.id].targetId}))});
  }, onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({queryKey: ["director-character-candidates", runId]}),
      queryClient.invalidateQueries({queryKey: queryKeys.directorNext.summary(novelId)}),
      queryClient.invalidateQueries({queryKey: queryKeys.directorNext.detail(novelId)}),
      queryClient.invalidateQueries({queryKey: ["directorBookWorkspace", novelId]}),
      queryClient.invalidateQueries({queryKey: ["director-character-appearances", novelId]}),
    ]);
  }});
  const complete = pending.every(i => choices[i.id]?.action && (choices[i.id].action !== "merge" || choices[i.id].targetId));
  const handled = review.items.length - pending.length;
  return <div className="space-y-3 py-3">
    <p className="text-sm font-medium">Chapter {review.chapterOrder}{pending.length ? ` · ${pending.length} to review` : ` · ${handled} characters reviewed`}</p>
    {review.blocking ? <p className="text-xs leading-5 text-muted-foreground">Review this chapter's characters, then choose “Resume from saved progress.” The text is preserved, and confirmed characters will be used in later writing.</p> : null}
    {pending.map(item => <div key={item.id} className="space-y-2 rounded-md bg-muted/30 p-3">
      <p className="text-sm font-medium">{item.name}{item.role ? ` · ${item.role}` : ""}</p>
      {item.summary ? <p className="text-xs leading-5">{item.summary}</p> : null}
      <p className="text-xs leading-5 text-muted-foreground">{item.reason}</p>
      {item.evidence.length ? <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">View manuscript evidence</summary><p className="mt-2 whitespace-pre-wrap leading-5">{item.evidence.join("\n")}</p></details> : null}
      <label className="block text-xs">Decision
        <select aria-label={`Decision for ${item.name}`} className="mt-1 w-full rounded-md border border-input bg-background p-2" disabled={!page.editable || mutation.isPending}
          value={choices[item.id]?.action ?? ""} onChange={e => setChoices(c => ({...c, [item.id]: {...c[item.id], action: e.target.value as CharacterCandidateAction | ""}}))}>
          <option value="">Select an action</option><option value="create">Add as a novel character</option><option value="merge">Link to an existing character</option><option value="ignore">Ignore this candidate</option>
        </select>
      </label>
      {choices[item.id]?.action === "merge" ? <label className="block text-xs">Character to link
        <select aria-label={`Character to link for ${item.name}`} className="mt-1 w-full rounded-md border border-input bg-background p-2" disabled={!page.editable || mutation.isPending}
          value={choices[item.id]?.targetId ?? ""} onChange={e => setChoices(c => ({...c, [item.id]: {...c[item.id], targetId: e.target.value}}))}>
          <option value="">Select a novel character</option>{page.characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label> : null}
    </div>)}
    {pending.length ? <>
      {!page.editable ? <p className="text-xs text-muted-foreground">Review these after this chapter batch finishes. Pending character reviews won't block fully automatic writing.</p> : null}
      <Button className="h-auto w-full whitespace-normal py-2" disabled={!page.editable || !complete || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Saving…" : "Confirm character decisions"}</Button>
    </> : null}
    {mutation.isError ? <p role="alert" className="text-xs text-destructive">{mutation.error.message}</p> : null}
  </div>;
}

export default function DirectorCharacterCandidates({page, runId, novelId}: {page?: DirectorCharacterCandidatePage; runId: string; novelId: string}) {
  if (!page?.reviews.length) return null;
  const pending = page.reviews.filter(r => r.items.some(i => i.status === "pending"));
  const handled = page.reviews.flatMap(r => r.items).filter(i => i.status !== "pending").length;
  return <section className="border-t border-border/60 py-4" aria-label="Chapter characters">
    <h3 className="text-sm font-semibold">Characters found in the manuscript</h3>
    {handled ? <p className="mt-2 text-xs text-muted-foreground">{handled} character candidates reviewed in this run. View character profiles in the directory.</p> : null}
    {pending.map(review => <Review key={`${review.id}:${review.revision}`} review={review} page={page} runId={runId} novelId={novelId}/>)}
  </section>;
}
