import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getNovelInvocation } from "@/api/novel/usage";
import { Button } from "@/components/ui/button";
import { formatUsageDuration, usageStatusLabel } from "../presentation";

export function InvocationDetail({ novelId, invocationId, onJump }: { novelId: string; invocationId: string; onJump: (id: string) => void }) {
  const query = useQuery({ queryKey: ["novel-invocation", novelId, invocationId], queryFn: () => getNovelInvocation(novelId, invocationId) });
  const data = query.data?.data;
  if (query.isPending) return <p className="py-3">Loading messages and response…</p>;
  if (query.isError) return <div role="alert"><p>Failed to load invocation details.</p><Button variant="ghost" onClick={() => void query.refetch()}>Retry</Button></div>;
  if (!data) return null;
  return <div className="space-y-4 py-3 text-xs">
    <p className="break-all text-muted-foreground">Invocation ID: {invocationId}</p>
    <p>Duration {formatUsageDuration(data.item.durationMs)} · Time to first token {formatUsageDuration(data.item.firstTokenMs)} · Attempt {data.item.attemptNumber} · {data.item.structuredMode ?? "Text output"}</p>
    <div className="space-y-1"><p className="font-medium">Attempt chain ({data.chain.length})</p>{data.chain.map(attempt => <button key={attempt.invocationId} type="button" className="block text-left text-primary underline-offset-4 hover:underline" onClick={() => onJump(attempt.invocationId)}>Attempt {attempt.attemptNumber} · {attempt.model ?? "Unrecorded model"} · {attempt.structuredMode ?? "Text output"} · {usageStatusLabel(attempt.status)} · {formatUsageDuration(attempt.durationMs)}</button>)}</div>
    {data.payload ? <>
      <div className="space-y-2"><p className="font-medium">Prompt messages</p>{data.payload.messages.map((message, index) => <PayloadText key={index} label={`${index + 1}. ${message.role}`} text={typeof message.content === "string" ? message.content : JSON.stringify(message.content, null, 2)} />)}</div>
      <PayloadText label="Raw model response" text={data.payload.response} />
      {data.payload.parsed !== null ? <PayloadText label="Parsed structured output" text={JSON.stringify(data.payload.parsed, null, 2)} /> : null}
      {data.payload.error ? <PayloadText label="Invocation or parsing error" text={data.payload.error} /> : null}
    </> : <p className="text-muted-foreground">Messages and responses were not saved for this invocation, or were cleared according to retention settings. You can enable history under Settings → Models & Providers.</p>}
  </div>;
}

function PayloadText({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false), [error, setError] = useState(false);
  return <details className="space-y-2" open={text.length < 500 ? true : undefined}>
    <summary className="cursor-pointer font-medium">{label} · {text.length.toLocaleString("en-US")} characters</summary>
    <Button size="sm" variant="ghost" onClick={() => void navigator.clipboard.writeText(text).then(() => { setCopied(true); setError(false); }, () => setError(true))}>{copied ? "Copied" : "Copy"}</Button>
    {error ? <span role="alert">Copy failed. Select and copy the text instead.</span> : null}
    <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/40 p-3 font-mono">{text || "(empty)"}</pre>
  </details>;
}
