import {useState} from "react";
import {useMutation,useQueryClient} from "@tanstack/react-query";
import type {DirectorWorkspace} from "@/api/directorNext";
import {createDirectorCommandKey,submitDirectorCommand} from "@/api/directorNext";
import {queryKeys} from "@/api/queryKeys";
import LLMSelector from "@/components/common/LLMSelector";
import {useLLMStore} from "@/store/llmStore";
import {Button} from "@/components/ui/button";
import {nextUnwrittenChapter} from "@/pages/outlines/openBook/model";
import {buildOutlineOpeningLaunchInput} from "./openingLaunchInput";

// Explicit authorization only: preparation must not include the body-writing producer.
export const outlinePreparationSteps=["story_macro","book_contract","world_setup","character_setup","volume_strategy","volume_beat_sheet","volume_chapter_list","chapter_detail_bundle","execution_contract_sync"];
export default function OutlineWritingControls({book,initialStory,worldId}:{book:DirectorWorkspace;initialStory:string;worldId?:string|null}) {
  const total=book.novel.estimatedChapterCount ?? 1;
  const next=nextUnwrittenChapter(book.chapters,total);
  const [order,setOrder]=useState(next ?? total);
  const [confirmed,setConfirmed]=useState(false);
  const model=useLLMStore(),queries=useQueryClient();
  const chapter=book.chapters.find(row=>row.order===order);
  const written=Boolean(chapter?.content?.trim());
  const previousReady=order===1 || Boolean(book.chapters.find(row=>row.order===order-1)?.content?.trim());
  const valid=Number.isSafeInteger(order) && order>=1 && order<=total && previousReady && !written;
  const mutation=useMutation({mutationFn:(action:"opening"|"prepare"|"write")=>{
    if (!model.provider || !model.model) throw new Error("Choose a writing model in Model Settings first.");
    if (!valid) throw new Error("Complete the previous chapter and confirm that the current chapter has no text yet.");
    if (action==="write" && !confirmed) throw new Error("Confirm that only the current chapter will be generated.");
    return submitDirectorCommand({type:"open_run",novelId:book.novel.id,driver:"assisted",stepIdsInScope:action==="write" ? null : outlinePreparationSteps,idempotencyKey:createDirectorCommandKey(),
       launchInput:buildOutlineOpeningLaunchInput({storyInput:initialStory,estimatedChapterCount:total,worldMode:worldId ? "reuse" : "skip",provider:model.provider,model:model.model,temperature:model.temperature,chapterOrder:order})});
  },onSuccess:async()=>{setConfirmed(false);await Promise.all([queries.invalidateQueries({queryKey:queryKeys.directorNext.summary(book.novel.id)}),queries.invalidateQueries({queryKey:queryKeys.directorNext.detail(book.novel.id)}),queries.invalidateQueries({queryKey:["directorBookWorkspace",book.novel.id]})]);}});
  return <section id="director-start" className="space-y-4 border-t border-border/50 py-4" aria-label="Write from outline one chapter at a time">
    <h2 className="text-sm font-semibold">Choose the next chapter</h2><p className="text-xs leading-6 text-muted-foreground">Review and confirm preparation step by step. Chapter preparation does not generate prose; read and revise each chapter before moving on.</p>
    <Button variant="secondary" className="w-full" disabled={!valid || mutation.isPending} onClick={()=>mutation.mutate("opening")}>Complete writing preparation</Button>
    <label className="flex items-center justify-between gap-3 text-sm">Current chapter<input aria-label="Current chapter" className="h-9 w-24 rounded-md border border-input bg-background px-3 text-right" type="number" min={1} max={total} value={order} onChange={event=>{setOrder(Number(event.target.value));setConfirmed(false);}}/></label>
    {written ? <p className="text-xs leading-6 text-muted-foreground">This chapter already has text. Read and revise it from the table of contents; it will not be overwritten.</p> : !previousReady ? <p className="text-xs leading-6 text-warning">Complete and review the previous chapter before preparing this one.</p> : null}
    {next===null ? <p className="text-xs leading-6 text-muted-foreground">All chapters in the target range have text. Continue reading and editing from the table of contents.</p> : null}
    <Button variant="outline" className="w-full" disabled={!valid || mutation.isPending} onClick={()=>mutation.mutate("prepare")}>Prepare chapter {order}</Button>
    <label className="flex cursor-pointer items-start gap-2 text-xs leading-6"><input type="checkbox" className="mt-1 accent-primary" checked={confirmed} disabled={!valid} onChange={event=>setConfirmed(event.target.checked)}/><span>Generate only chapter {order} using its approved plan. Do not write the next chapter automatically.</span></label>
    <Button className="w-full" disabled={!valid || !confirmed || mutation.isPending} onClick={()=>mutation.mutate("write")}>{mutation.isPending ? "Submitting…" : `Write chapter ${order}`}</Button>
    {mutation.isError ? <p role="alert" className="text-xs leading-6 text-destructive">{mutation.error.message} Check the novel's Director status before continuing.</p> : null}
    <details><summary className="cursor-pointer text-xs text-muted-foreground">Model settings</summary><div className="pt-3"><LLMSelector compact showHelperText/></div></details>
  </section>;
}
