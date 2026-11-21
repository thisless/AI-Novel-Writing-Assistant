import type { OutlineBookPolicy } from "@ai-novel/shared/types/outlineOpenBook";
import type { OutlineDocument } from "@ai-novel/shared/types/outline";
import { findOutlineNodeTitle, formatOutlineValue, outlineFieldLabels } from "@/pages/outlines/outlineNodes";

export function OutlinePreservationDetails({policy,document}:{policy:OutlineBookPolicy;document:OutlineDocument}) {
  const groups = [
    {mode:"hard_constraint",label:"Immutable facts"},
    {mode:"preserve",label:"Completed fields · preserve as written"},
    {mode:"fill_missing",label:"Blank fields · can be completed"},
    {mode:"propose_change",label:"Suggestions for improvement allowed"},
  ];
  return <div className="space-y-4 text-sm" aria-label="Preserved field details">{groups.map(group=>{
    const rules=policy.rules.filter(rule=>rule.mode===group.mode);
    return rules.length ? <details key={group.mode} open={group.mode==="hard_constraint"}>
      <summary className="cursor-pointer py-1 font-medium">{group.label} ({rules.length})</summary>
      <dl className="mt-2 max-h-64 divide-y divide-border/40 overflow-y-auto pr-2">{rules.map(rule=><div key={`${rule.nodeId}:${rule.field}`} className="py-2">
        <dt className="text-xs text-muted-foreground">{findOutlineNodeTitle(document,rule.nodeId)} · {outlineFieldLabels[rule.field] ?? "Writing content"}</dt>
        <dd className="mt-1 whitespace-pre-wrap break-words leading-6">{rule.mode==="fill_missing" ? "To be completed by AI" : formatOutlineValue(rule.value,rule.field,document)}</dd>
      </div>)}</dl>
    </details> : null;
  })}</div>;
}
