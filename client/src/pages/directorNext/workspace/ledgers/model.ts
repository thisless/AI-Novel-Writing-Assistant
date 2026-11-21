import type {CharacterResourceLedgerItem} from "@ai-novel/shared/types/characterResource";
import type {WorkspaceBook} from "../model";

export function resolveLedgerChapter(book:Pick<WorkspaceBook,"chapters">,source:{chapterId?:string|null;chapterOrder?:number|null}) {
  if(source.chapterId) return book.chapters.find(chapter=>chapter.id===source.chapterId) ?? null;
  if(typeof source.chapterOrder!=="number") return null;
  const matches=book.chapters.filter(chapter=>chapter.order===source.chapterOrder);
  return matches.length===1 ? matches[0] : null;
}

export function characterResources(items:CharacterResourceLedgerItem[],novelId:string,characterId?:string) {
  return items.filter(item=>item.novelId===novelId && (!characterId || item.holderCharacterId===characterId || item.ownerCharacterId===characterId));
}

export const payoffStatusLabels={setup:"Planted",hinted:"Hinted",pending_payoff:"Awaiting payoff",paid_off:"Paid off",failed:"Payoff failed",overdue:"Past payoff window"};
export const resourceStatusLabels={available:"Available",hidden:"Hidden",borrowed:"Borrowed",transferred:"Transferred",lost:"Lost",consumed:"Consumed",damaged:"Damaged",destroyed:"Destroyed",stale:"Needs verification"};
export const resourceFunctionLabels={tool:"Tool",clue:"Clue",weapon:"Weapon",proof:"Evidence",key:"Key item",cost:"Cost",promise:"Foreshadowing",hidden_card:"Hidden card",constraint:"Constraint"};
export const resourceEventLabels={introduced:"Introduced",acquired:"Acquired",revealed:"Revealed",used:"Used",transferred:"Transferred",lost:"Lost",consumed:"Consumed",damaged:"Damaged",destroyed:"Destroyed",recovered:"Recovered",stale_marked:"Marked for verification"};
export function chapterWindow(from?:number|null,to?:number|null) {
  if(from && to) return from===to ? `Chapter ${from}` : `Chapters ${from}–${to}`;
  return from ? `From Chapter ${from}` : to ? `Through Chapter ${to}` : "No chapter range specified";
}
