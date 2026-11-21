import type {VolumeChapterPlan} from "@ai-novel/shared/types/novel";
import type {WorkspaceBook, WorkspaceChapter} from "./model";

const labels: Record<string,string> = {story_macro:"Story plan",book_contract:"Creative brief",world_skeleton:"World setting",volume_beat_sheet:"Volume beats",volume_chapter_list:"Volume outline",character_cast:"Character cast",volume_strategy:"Volume strategy",chapter_task_sheet:"Chapter tasks & scenes",chapter_execution_contract:"Manuscript execution plan",chapter_batch_closed:"Manuscript batch"};
export interface SavedReview {
  type:string; label:string; ready:boolean; error?:string; notice?:string;
  runId?:string; controlVersion?:number;
  volumeId?:string;
  plan?:VolumeChapterPlan;
  execution?:NonNullable<WorkspaceBook["executionPlans"]>[number];
  chapters?:WorkspaceChapter[];
}

/** Navigation selects saved book assets, never derives a director state or authorization. */
export function resolveSavedReview(book:WorkspaceBook, params:URLSearchParams): SavedReview | null {
  const type=params.get("review");
  if (!type) return null;
  const result:SavedReview={type,label:labels[type] ?? "Creative result",ready:false};
  const missing=()=>({...result,error:"Couldn't locate the complete result for this stage. Reload the novel or return to the Director workspace to review its confirmation entry."});
  if (book.reviewContextError) return {...result,error:book.reviewContextError};
  if (!labels[type]) return missing();
  const contexts=book.reviewContexts?.filter(row=>row.type===type) ?? [];
  if (!contexts.length) return {...result,notice:"There is no result awaiting confirmation for this stage. View saved content in the directory or check the Director workspace for next steps."};
  if (contexts.length!==1 || contexts[0].novelId!==book.novel.id) return missing();
  const context=contexts[0];
  result.runId=context.runId;result.controlVersion=context.controlVersion;
  if (type === "story_macro") return book.outlinePreparation?.storyMacro?.expansion && book.outlinePreparation.storyMacro.decomposition ? {...result,ready:true} : missing();
  if (type === "book_contract") return book.outlinePreparation?.hasBookContract ? {...result,ready:true} : missing();
  if (type === "world_skeleton") return book.materials.world || book.outlinePreparation?.worldMode==="skip" ? {...result,ready:true} : missing();
  if (type === "volume_beat_sheet" || type === "volume_chapter_list") {
    const volumes=book.planning?.volumes.filter(volume=>volume.id===context.volumeId) ?? [];
    if (volumes.length!==1) return missing();
    const saved=type==="volume_beat_sheet" ? book.planning?.beatSheets.some(sheet=>sheet.volumeId===context.volumeId && sheet.beats.length) : volumes[0].chapters.length;
    return saved ? {...result,ready:true,volumeId:context.volumeId} : missing();
  }
  if (type === "character_cast") return book.materials.characters.length ? {...result,ready:true} : missing();
  if (type === "volume_strategy") return book.planning?.volumes.length ? {...result,ready:true} : missing();
  const {from,to,chapterId:id,volumeId}=context;
  if (typeof from!=="number" || typeof to!=="number" || !Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from<1 || to<from) return missing();
  if (type === "chapter_batch_closed") {
    const chapters=book.chapters.filter(row=>row.order>=from && row.order<=to).sort((a,b)=>a.order-b.order);
    if (chapters.length!==to-from+1 || chapters.some((row,index)=>row.order!==from+index || !hasText(row.content)) || chapters[0]?.id!==id) return missing();
    return {...result,ready:true,chapters};
  }
  const plans=book.planning?.volumes.filter(volume=>volume.id===volumeId).flatMap(volume=>volume.chapters.filter(plan=>plan.chapterOrder===from)) ?? [];
  if (plans.length!==1) return missing();
  if (type === "chapter_task_sheet") {
    const plan=plans[0];
    if (plan.id!==id || !hasText(plan.taskSheet) || !hasText(plan.sceneCards)) return missing();
    return {...result,ready:true,plan};
  }
  const rows=book.executionPlans?.filter(row=>row.id===id && row.order===from) ?? [];
  if (rows.length!==1 || !hasText(rows[0].taskSheet) || !hasText(rows[0].sceneCards)) return missing();
  return {...result,ready:true,execution:rows[0]};
}

function hasText(value:unknown):value is string {return typeof value==="string" && Boolean(value.trim());}
