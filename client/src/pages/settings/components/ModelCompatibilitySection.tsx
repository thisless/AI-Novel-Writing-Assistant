import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { APIKeyStatus } from "@/api/settings";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

interface CapabilityResult {
  profile: { structuredModes: string[]; failedModes: string[]; thinkingToggle: { supported: boolean; control: string; effort: boolean }; source: string; probedAt?: string; maxOutputTokens?: number };
  status: { state: string; checkedAt?: string; message?: string };
  autoProbe: boolean;
}
export default function ModelCompatibilitySection({ provider }: { provider: APIKeyStatus }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [mode, setMode] = useState("");
  const [control, setControl] = useState("");
  const [outputLimit, setOutputLimit] = useState<string | null>(null);
  const key = ["model-compat", provider.provider, provider.currentModel, provider.currentBaseURL];
  const url = `/settings/model-compat/${provider.provider}`;
  const query = useQuery({ queryKey: key, queryFn: async () => (await apiClient.get<{ data: CapabilityResult }>(url)).data.data,
    enabled: provider.isConfigured, refetchInterval: (query) => query.state.data?.status.state === "running" ? 1500 : false });
  const probe = useMutation({ mutationFn: () => apiClient.post(url + "/probe", { model: provider.currentModel, baseURL: provider.currentBaseURL, allowNetwork: true }),
    onSuccess: () => { setError(""); void queryClient.invalidateQueries({ queryKey: key }); }, onError: () => setError("Could not start the probe. Check your connection and try again.") });
  const consent = useMutation({ mutationFn: (autoProbe: boolean) => apiClient.put(url, { autoProbe }),
    onSuccess: () => { setError(""); void queryClient.invalidateQueries({ queryKey: key }); }, onError: () => setError("Failed to save probe settings. Please try again.") });
  const override = useMutation({ mutationFn: () => {
    const profile = query.data!.profile;
    const selectedMode = mode || profile.structuredModes[0];
    const selectedControl = control || profile.thinkingToggle.control;
    const ordered = ["json_schema", "json_object", "tool_calling", "prompt_only"];
    return apiClient.put(url, { override: { ...profile, source: "user_override", failedModes: [],
      structuredModes: ordered.slice(ordered.indexOf(selectedMode)),
      thinkingToggle: { ...profile.thinkingToggle, supported: selectedControl !== "none", control: selectedControl } } });
  }, onSuccess: () => { setError(""); void queryClient.invalidateQueries({ queryKey: key }); }, onError: () => setError("Failed to save capability overrides. Please try again.") });
  const data = query.data;
  const saveOutputLimit = useMutation({ mutationFn: () => apiClient.put(url, {
    override: { ...data!.profile, source: "user_override", maxOutputTokens: (outputLimit ?? data!.profile.maxOutputTokens ?? "") === "" ? undefined : Number(outputLimit ?? data!.profile.maxOutputTokens) },
  }), onSuccess: () => { setError(""); setOutputLimit(null); void queryClient.invalidateQueries({ queryKey: key }); },
    onError: () => setError("Failed to save the output limit. Please try again.") });
  const labels: Record<string, string> = { json_schema: "Strict JSON", json_object: "JSON object", tool_calling: "Tool calling", prompt_only: "JSON prompt constraints" };
  return <section className="space-y-2 border-t pt-3 text-sm">
    <div className="font-medium">Model compatibility</div>
    {data ? <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); saveOutputLimit.mutate(); }}>
      <label className="flex flex-wrap items-center gap-2">Current model output limit (tokens)
        <Input type="number" min={1} max={1048576} step={1} className="w-40" placeholder="Use task budget"
          value={outputLimit ?? data.profile.maxOutputTokens ?? ""} onChange={(event) => setOutputLimit(event.target.value)} />
      </label>
      <p className="text-xs text-muted-foreground">Set the per-request output limit for {provider.currentModel}, used for manuscript and structured generation. Leave blank to use the task budget. Each model can have its own limit.</p>
      <Button size="sm" variant="outline" type="submit" disabled={saveOutputLimit.isPending}>Save output limit</Button>
    </form> : null}
    <p className="text-xs text-muted-foreground">Probing sends a small number of billable requests to help select supported output formats and reasoning controls.</p>
    <label className="flex items-center gap-2"><Switch checked={data?.autoProbe ?? false} disabled={!data || consent.isPending} onCheckedChange={(value) => consent.mutate(value)} />Probe automatically when saving or switching models</label>
    <Button size="sm" variant="outline" disabled={!provider.isConfigured || probe.isPending || data?.status.state === "running"} onClick={() => probe.mutate()}>{data?.status.state === "running" ? "Probing…" : "Run probe again"}</Button>
    {data ? <div className="space-y-1 text-xs text-muted-foreground" role="status">
      <div>{data.status.message ?? "You can probe model compatibility manually."} {data.status.checkedAt ? new Date(data.status.checkedAt).toLocaleString("en-US") : ""}</div>
      <div>Output formats: {data.profile.structuredModes.filter((mode) => !data.profile.failedModes.includes(mode)).map((mode) => labels[mode]).join(" → ")}</div>
      <div>Reasoning control: {data.profile.thinkingToggle.supported ? "Supported" : "Support not confirmed"}{data.profile.probedAt ? ` · Last result ${new Date(data.profile.probedAt).toLocaleString("en-US")}` : " · Using default capabilities"}</div>
    </div> : null}
    {provider.kind === "custom" && data ? <details className="text-xs">
      <summary className="cursor-pointer">Override custom service capabilities</summary>
      <div className="mt-2 space-y-2">
        <label className="flex items-center gap-2">Preferred output format<select className="rounded border bg-background p-1" value={mode || data.profile.structuredModes[0]} onChange={(event) => setMode(event.target.value)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="flex items-center gap-2">Reasoning control parameter<select className="rounded border bg-background p-1" value={control || data.profile.thinkingToggle.control} onChange={(event) => setControl(event.target.value)}>{["none", "thinking", "thinking_boolean", "enable_thinking", "reasoning_effort"].map((value) => <option key={value} value={value}>{value === "none" ? "Unspecified" : value}</option>)}</select></label>
        <Button size="sm" variant="outline" disabled={override.isPending} onClick={() => override.mutate()}>Save capability overrides</Button>
        <p className="text-muted-foreground">Overrides take precedence over probe results. Use them when your provider documents specific parameters.</p>
      </div>
    </details> : null}
    {query.isError || error ? <p role="alert" className="text-xs text-destructive">{error || "Failed to load compatibility information."}</p> : null}
  </section>;
}
