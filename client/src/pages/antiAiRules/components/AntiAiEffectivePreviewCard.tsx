import type { AntiAiEffectiveRulesResult, StyleProfile } from "@ai-novel/shared/types/styleEngine";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EffectiveRuleList from "./EffectiveRuleList";

interface AntiAiEffectivePreviewCardProps {
  profiles: StyleProfile[];
  styleProfileId: string;
  effective?: AntiAiEffectiveRulesResult;
  loading: boolean;
  error?: string;
  onRetry: () => void;
  onStyleProfileChange: (styleProfileId: string) => void;
}

export default function AntiAiEffectivePreviewCard(props: AntiAiEffectivePreviewCardProps) {
  return (
    <section aria-labelledby="anti-ai-scope-title" className="space-y-3 p-5 sm:p-6">
      <h2 id="anti-ai-scope-title" className="flex items-center gap-2 text-base font-semibold">
        <SlidersHorizontal aria-hidden="true" className="h-4 w-4 text-muted-foreground" />Active rule scope
      </h2>
      <p className="text-xs leading-5 text-muted-foreground">Choose the global defaults or a style profile to use for testing below.</p>
      <Select value={props.styleProfileId || "__global__"}
        onValueChange={(value) => props.onStyleProfileChange(value === "__global__" ? "" : value)}>
        <SelectTrigger aria-label="Select a style profile for the preview and test"><SelectValue placeholder="Select a style profile" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__global__">Global defaults only</SelectItem>
          {props.profiles.map((profile) => <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>)}
        </SelectContent>
      </Select>
      {props.loading ? <p role="status" className="text-xs text-muted-foreground">Calculating active rules…</p> : null}
      {props.error ? (
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm">
          <p>{props.error}</p>
          <Button type="button" variant="ghost" size="sm" className="mt-1" onClick={props.onRetry}>Reload</Button>
        </div>
      ) : null}
      {props.effective && !props.loading && !props.error ? (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded py-1 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <span><strong className="font-semibold tabular-nums text-foreground">{props.effective.effectiveRules.length}</strong> active · {props.effective.usesGlobalAntiAiBaseline ? "includes global defaults" : "excludes global defaults"}</span>
            <span className="flex items-center gap-1">View rules<ChevronDown aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-open:rotate-180 motion-reduce:transition-none" /></span>
          </summary>
          <div className="mt-3 max-h-64 space-y-4 overflow-y-auto rounded-lg bg-muted/30 p-3">
            <EffectiveRuleList title="Global default rules" rules={props.effective.globalBaselineRules} empty="No global default rules." />
            <EffectiveRuleList title="Style-specific rules" rules={props.effective.styleSpecificRules} empty="No style-specific rules apply to this scope." />
          </div>
        </details>
      ) : null}
    </section>
  );
}
