import {useQuery} from "@tanstack/react-query";
import {Link} from "react-router-dom";
import {getOutlineRevision} from "@/api/outlines";
import type {OutlineBookBindingView} from "@ai-novel/shared/types/outlineOpenBook";
import {Button} from "@/components/ui/button";
import {OutlineSetupRecovery} from "./OutlineSetupRecovery";
import {OutlinePreservationDetails} from "./OutlinePreservationDetails";
import {findOutlineNodeTitle,formatOutlineValue,outlineFieldLabels} from "@/pages/outlines/outlineNodes";

export function OutlineBookSource({binding}:{binding:OutlineBookBindingView}) {
  const source=useQuery({queryKey:["outline-revision",binding.projectId,binding.revisionId],queryFn:()=>getOutlineRevision(binding.projectId,binding.revisionId)});
  const differences=binding.sourceDifferences ?? [];
  const kinds={added:"Added",removed:"Removed",updated:"Updated",moved:"Moved"};
  return <section className="shrink-0 rounded-md bg-muted/30 px-4 py-3 text-sm" aria-label="Outline source and binding summary">
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2"><p><strong>Writing from outline</strong><span className="ml-3 text-muted-foreground">Using revision v{binding.revisionVersion} · {binding.mapping.volumes.length} volumes · {binding.mapping.chapters.length} source chapter outlines · One chapter at a time</span></p><Button asChild variant="ghost" size="sm"><Link to={`/outlines/${binding.projectId}`}>Open source outline</Link></Button></div>
    <p className="mt-1 text-xs leading-6 text-muted-foreground">Completed fields are preserved and blank fields can be filled in as needed. Starting a novel does not call a model. The standalone outline and this novel's plan are saved separately.</p>
    <details className="mt-2"><summary className="cursor-pointer text-xs">View outline v{binding.revisionVersion} · preserved fields and chapter positions</summary><div className="mt-3 max-h-72 space-y-4 overflow-y-auto pr-2">
      {source.data ? <OutlinePreservationDetails policy={binding.policy} document={source.data.document}/> : <p className="text-xs text-muted-foreground">{source.isError ? "Failed to load source revision. Review the source outline." : "Loading source revision…"}</p>}
      {binding.mapping.volumes.map(volume=><p key={volume.nodeId} className="text-xs">{source.data ? findOutlineNodeTitle(source.data.document,volume.nodeId) : "Volume"} · {volume.chapterQuota} chapters · Chapters {volume.from}–{volume.to}</p>)}
    </div></details>
    {binding.currentVersion!==binding.revisionVersion ? <details className="mt-2 text-sm" aria-label="Differences in newer outline revision"><summary className="cursor-pointer font-medium text-warning">Source outline updated to v{binding.currentVersion} · View {differences.length} changes</summary><div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-2"><p className="text-xs leading-6 text-muted-foreground">This novel still follows v{binding.revisionVersion}. Differences are for reference only and will not sync automatically or overwrite the text.</p>{differences.map((change,index)=>{
      const left=change.before as Record<string,unknown>|undefined,right=change.after as Record<string,unknown>|undefined;
      const before=(change.kind==="moved" ? left?.node : left) as Record<string,unknown>|undefined,after=(change.kind==="moved" ? right?.node : right) as Record<string,unknown>|undefined;
      const title=change.kind==="added" ? String(after?.title ?? after?.name ?? "New content") : source.data ? findOutlineNodeTitle(source.data.document,change.nodeId) : "Related content";
      const fields=[...new Set([...Object.keys(before ?? {}),...Object.keys(after ?? {})])].filter(key=>key!=="nodeId" && JSON.stringify(before?.[key])!==JSON.stringify(after?.[key]));
      return <section key={`${change.nodeId}:${index}`} className="border-t border-border/40 pt-2"><h3 className="text-sm font-medium">{kinds[change.kind]} · {title}</h3>{change.kind==="moved" ? <p className="text-xs leading-6 text-muted-foreground">The node's position changed; this novel keeps the original position.</p> : null}{fields.filter(field=>outlineFieldLabels[field]).map(field=><div key={field} className="mt-2 text-xs leading-6"><p className="font-medium">{outlineFieldLabels[field]}</p><p className="text-muted-foreground">Applied version: {formatOutlineValue(before?.[field],field,source.data?.document)}</p><p>New revision: {formatOutlineValue(after?.[field],field,source.data?.document)}</p></div>)}</section>;
    })}<Button asChild variant="ghost" size="sm"><Link to={`/outlines/${binding.projectId}`}>Compare in outline workspace</Link></Button></div></details> : null}
    {binding.setupState.error ? <OutlineSetupRecovery binding={binding}/> : null}
  </section>;
}
