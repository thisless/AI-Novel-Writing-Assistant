import {useState, type ReactNode} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {createDirectorCommandKey, submitDirectorCommand} from "@/api/directorNext";
import {queryKeys} from "@/api/queryKeys";
import {Button} from "@/components/ui/button";
import {AppDialogContent, Dialog} from "@/components/ui/dialog";

export type PlanEditorRenderer = (input: {runId:string; expectedVersion:number; onClose:()=>void}) => ReactNode;

export default function DirectorGate({runId, novelId, expectedVersion, reviewType, renderPlanEditor}: {runId:string; novelId:string; expectedVersion:number; reviewType?:string; renderPlanEditor?:PlanEditorRenderer}) {
  const queries=useQueryClient();
  const [regenerating, setRegenerating]=useState(false);
  const [guidance, setGuidance]=useState("");
  const [editing, setEditing]=useState(false);
  const canGenerate=reviewType==="chapter_task_sheet" || reviewType==="volume_strategy";
  const mutation=useMutation({
    mutationFn:(decision:"confirm"|"confirm_after_edit"|"regenerate")=>submitDirectorCommand({type:"resolve_gate",runId,decision,expectedVersion,idempotencyKey:createDirectorCommandKey(),
      ...(decision==="regenerate" && canGenerate && guidance.trim() ? {guidance:guidance.trim()} : {})}),
    onSuccess:async()=>{
      setRegenerating(false);setGuidance("");
      await Promise.all([queries.invalidateQueries({queryKey:queryKeys.directorNext.summary(novelId)}),queries.invalidateQueries({queryKey:queryKeys.directorNext.detail(novelId)}),queries.invalidateQueries({queryKey:["directorBookWorkspace",novelId]})]);
    },
  });
  return <section className="space-y-3 border-t border-border/50 py-4">
    <p className="text-xs leading-5 text-muted-foreground">Review the results on the left. Continue when you're ready, or edit the content first{canGenerate ? " or ask AI to revise it based on your guidance" : ""}.</p>
    <Button disabled={mutation.isPending} onClick={()=>mutation.mutate("confirm")}>Confirm results and continue</Button>
    <div className="flex flex-wrap gap-2">
      {reviewType==="chapter_task_sheet" && renderPlanEditor ? <Button variant="ghost" size="sm" disabled={mutation.isPending} onClick={()=>setEditing(true)}>Edit tasks and scenes</Button>
        : <Button variant="ghost" size="sm" disabled={mutation.isPending} onClick={()=>mutation.mutate("confirm_after_edit")}>Confirm saved changes</Button>}
      {canGenerate ? <Button variant="ghost" size="sm" disabled={mutation.isPending} onClick={()=>{mutation.reset();setRegenerating(true);}}>Regenerate this stage</Button>
        : reviewType==="chapter_execution_contract" ? <Button variant="ghost" size="sm" disabled={mutation.isPending} onClick={()=>mutation.mutate("regenerate")}>Resync execution plan</Button> : null}
    </div>
    {mutation.isError && !regenerating ? <p role="alert" className="text-xs text-destructive">{mutation.error.message}</p>:null}
    <Dialog open={regenerating} onOpenChange={open=>{if(!mutation.isPending)setRegenerating(open);}}>
      <AppDialogContent title="Regenerate this stage" description="Describe what to keep or change, and AI will regenerate the result. Guidance is optional."
        footer={<><Button variant="ghost" disabled={mutation.isPending} onClick={()=>setRegenerating(false)}>Back to review</Button><Button disabled={mutation.isPending} onClick={()=>mutation.mutate("regenerate")}>{mutation.isPending ? "Submitting…" : guidance.trim() ? "Regenerate with guidance" : "Regenerate"}</Button></>}>
        <label className="space-y-2 text-sm"><span>Revision guidance (optional)</span><textarea className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" value={guidance} onChange={event=>setGuidance(event.target.value)} maxLength={6000} disabled={mutation.isPending} rows={6} placeholder="For example: Keep the relic's backstory, let the protagonist test its abilities, and add suspense at the end."/></label>
        {mutation.isError ? <p role="alert" className="mt-3 text-sm text-destructive">{mutation.error.message}</p>:null}
      </AppDialogContent>
    </Dialog>
    {editing ? renderPlanEditor?.({runId,expectedVersion,onClose:()=>setEditing(false)}) : null}
  </section>;
}
