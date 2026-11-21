import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InvocationHistorySettings } from "@ai-novel/shared/types/llmUsage";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";

export function InvocationHistorySection() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<InvocationHistorySettings>();
  const queryKey = ["invocation-history-settings"];
  const query = useQuery({ queryKey, queryFn: async () => (await apiClient.get<{ data: InvocationHistorySettings }>("/settings/llm-history")).data.data });
  const save = useMutation({ mutationFn: (value: InvocationHistorySettings) => apiClient.put("/settings/llm-history", value),
    onSuccess: () => { setDraft(undefined); void queryClient.invalidateQueries({ queryKey }); } });
  const value = draft ?? query.data;
  return <section className="space-y-3 border-t border-border/60 pt-5">
    <h2 className="font-semibold">AI prompt and response history</h2>
    <p className="text-sm text-muted-foreground">Save writing prompts and model responses to view them in a novel's “AI Usage and Invocation Log.” This may include complete manuscripts, so enable it only if needed. Timing statistics are always recorded.</p>
    {value ? <form className="flex flex-wrap items-end gap-4 text-sm" onSubmit={event => { event.preventDefault(); save.mutate(value); }}>
      <label className="flex items-center gap-2 py-2"><input type="checkbox" checked={value.enabled} onChange={event => setDraft({ ...value, enabled: event.target.checked })} />Save prompts and responses</label>
      <label className="space-y-1"><span className="block text-xs text-muted-foreground">Retention (days)</span><input className="w-24 rounded-md border border-input bg-background p-2" type="number" required min={1} max={365} value={value.retentionDays} onChange={event => setDraft({ ...value, retentionDays: event.target.valueAsNumber })} /></label>
      <label className="space-y-1"><span className="block text-xs text-muted-foreground">Maximum compressed storage (MB)</span><input className="w-28 rounded-md border border-input bg-background p-2" type="number" required min={1} max={4096} value={value.maxMb} onChange={event => setDraft({ ...value, maxMb: event.target.valueAsNumber })} /></label>
      <Button type="submit" disabled={save.isPending}>Save history settings</Button>
    </form> : query.isPending ? <p className="text-sm">Loading settings…</p> : null}
    <p className="text-xs text-muted-foreground">Expired or oversized history is cleaned up every 15 minutes, starting with the oldest records. Disabling this stops saving new content; existing content is cleaned up according to the retention settings. Invocation usage is retained.</p>
    {save.isSuccess ? <p role="status" className="text-sm">History settings saved.</p> : null}
    {query.isError || save.isError ? <p role="alert" className="text-sm text-destructive">Failed to load or save history settings. Please try again.</p> : null}
  </section>;
}
