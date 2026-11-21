import {useState} from "react";
import {useMutation,useQueryClient} from "@tanstack/react-query";
import {fillDirectorInitialCharacterSchedule} from "@/api/directorNext";
import {useLLMStore} from "@/store/llmStore";
import {Button} from "@/components/ui/button";
import type {WorkspaceBook} from "../model";

export function InitialScheduleAction({book,preview=false}:{book:WorkspaceBook;preview?:boolean}) {
  const queries=useQueryClient();
  const {provider,model}=useLLMStore();
  const [message,setMessage]=useState<string|null>(null);
  const planned=book.planning?.volumes.flatMap(volume=>volume.chapters) ?? [];
  const missing=planned.filter(chapter=>chapter.plannedCharacterIds===undefined && !chapter.taskSheet?.trim() && !chapter.sceneCards?.trim()
    && !book.chapters.find(row=>row.order===chapter.chapterOrder)?.content?.trim());
  const mutation=useMutation({mutationFn:()=>fillDirectorInitialCharacterSchedule(book.novel.id,{provider,model}),
    onSuccess:async response=>{
      const result=response.data;
      setMessage(result ? `Created appearance schedules for ${result.updated} ${result.updated === 1 ? "chapter" : "chapters"}${result.remaining ? `; ${result.remaining} ${result.remaining === 1 ? "more chapter" : "more chapters"} can be scheduled` : ""}.` : "Character appearance schedules saved.");
      await Promise.all([
        queries.invalidateQueries({queryKey:["directorBookWorkspace",book.novel.id]}),
        queries.invalidateQueries({queryKey:["director-character-appearances",book.novel.id]}),
      ]);
    }});
  if(preview || !book.materials.characters.length || !missing.length) return message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null;
  return <div className="space-y-2 text-sm">
    <p className="text-muted-foreground">{missing.length} {missing.length === 1 ? "chapter is" : "chapters are"} missing an initial character schedule. Fill it in with the model selected above, up to 24 chapters at a time. Chapter plans and prose will be preserved.</p>
    <Button variant="secondary" disabled={mutation.isPending || !provider || !model}
      onClick={()=>{setMessage(null);mutation.mutate();}}>{mutation.isPending ? "Scheduling character appearances…" : `Schedule appearances for ${Math.min(24,missing.length)} ${Math.min(24,missing.length) === 1 ? "chapter" : "chapters"}`}</Button>
    <p className="text-xs text-muted-foreground">This action uses AI. Use it after finishing the novel.</p>
    {mutation.isError ? <p role="alert" className="text-destructive">{mutation.error.message}</p> : message ? <p role="status" className="text-muted-foreground">{message}</p> : null}
  </div>;
}
