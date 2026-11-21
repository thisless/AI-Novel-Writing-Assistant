import {useState} from "react";
import type {PayoffLedgerItem} from "@ai-novel/shared/types/payoffLedger";
import type {Selection,WorkspaceBook} from "../model";
import {chapterWindow,payoffStatusLabels} from "./model";
import {SavedSources,SourceChapter} from "./SavedSources";

export function ForeshadowLedger({book,items,onSelect}:{book:WorkspaceBook;items:PayoffLedgerItem[];onSelect:(selection:Selection)=>void}) {
  const [status,setStatus]=useState("all");
  const saved=items.filter(item=>item.novelId===book.novel.id);
  const filtered=saved.filter(item=>status==="all" || item.currentStatus===status);
  const plans=book.outlineBinding?.plannedPayoffs ?? [];
  return <>
    {plans.length ? <section className="mb-6 space-y-3" aria-label="Foreshadowing plans from outline"><h3 className="text-base font-semibold">Planned from outline · {plans.length}</h3><p className="text-xs leading-6 text-muted-foreground">Plans are not counted as planted, overdue, or paid off; only prose evidence can link a plan to the actual ledger.</p><div className="divide-y divide-border/40">{plans.map(plan=><section key={plan.nodeId} className="space-y-2 py-4"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-medium">{plan.title}</h4><span className="text-xs text-muted-foreground">{plan.state==="linked" ? "Planned · linked to prose evidence" : "Planned · no prose evidence found"}</span></div><p className="text-sm leading-7">Setup: {plan.setupDescription || "Not provided"}</p><p className="text-sm leading-7">Payoff: {plan.payoffDescription || "Not provided"}</p><p className="text-xs leading-6 text-muted-foreground">Planned setup: {plan.setupChapterOrders.length ? plan.setupChapterOrders.map(order=>`Chapter ${order}`).join(", ") : "Unscheduled"} · Planned payoff: {plan.payoffChapterOrders.length ? plan.payoffChapterOrders.map(order=>`Chapter ${order}`).join(", ") : "Unscheduled"}</p></section>)}</div></section> : null}
    {plans.length ? <h3 className="mb-3 text-base font-semibold">Actual prose ledger</h3> : null}
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{saved.length} {saved.length === 1 ? "item" : "items"} · {saved.filter(item=>item.currentStatus==="paid_off").length} paid off</p>
      <label className="flex items-center gap-2 text-sm">Status<select className="rounded-md border border-input bg-background px-3 py-2" value={status} onChange={event=>setStatus(event.target.value)}><option value="all">All statuses</option>{Object.entries(payoffStatusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    {!filtered.length ? <p className="py-10 text-sm leading-7 text-muted-foreground">{saved.length ? "No foreshadowing items have this status." : "No saved foreshadowing records. Foreshadowing saved from plans or chapter reviews will appear here."}</p> : null}
    <div className="divide-y divide-border/40">{filtered.map(item=><section key={item.id} className="space-y-3 py-5">
      <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-base font-semibold">{item.title}</h3><span className="text-xs text-muted-foreground">{payoffStatusLabels[item.currentStatus] ?? "Unknown status"}</span></div>
      <p className="whitespace-pre-wrap text-sm leading-7">{item.summary}</p>
      <p className="text-xs text-muted-foreground">Payoff window: {chapterWindow(item.targetStartChapterOrder,item.targetEndChapterOrder)}</p>
      {item.statusReason ? <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/80">{item.statusReason}</p> : null}
      <div className="flex flex-wrap gap-x-4 gap-y-2"><SourceChapter book={book} source={{chapterId:item.setupChapterId,chapterOrder:item.firstSeenChapterOrder}} label="Setup" onSelect={onSelect}/><SourceChapter book={book} source={{chapterId:item.payoffChapterId}} label="Payoff" onSelect={onSelect}/><SourceChapter book={book} source={{chapterId:item.lastTouchedChapterId,chapterOrder:item.lastTouchedChapterOrder}} label="Last updated" onSelect={onSelect}/></div>
      {item.riskSignals.length ? <ul className="space-y-1 text-sm leading-6 text-warning">{item.riskSignals.map((risk,index)=><li key={index}>{risk.summary}{risk.stale ? " (historical alert)" : ""}</li>)}</ul> : null}
      <details className="pt-1"><summary className="cursor-pointer text-xs text-muted-foreground">View saved evidence & sources</summary><div className="pt-4"><SavedSources book={book} evidence={item.evidence} sources={item.sourceRefs} onSelect={onSelect}/></div></details>
    </section>)}</div>
  </>;
}
