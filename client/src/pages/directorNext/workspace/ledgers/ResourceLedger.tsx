import {useState} from "react";
import type {DirectorWorkspaceLedgers} from "@ai-novel/shared/types/director/workspace";
import type {Selection,WorkspaceBook} from "../model";
import {characterResources,chapterWindow,resourceEventLabels,resourceFunctionLabels,resourceStatusLabels} from "./model";
import {SavedSources,SourceChapter} from "./SavedSources";

export function ResourceLedger({book,data,characterId,onSelect}:{book:WorkspaceBook;data:DirectorWorkspaceLedgers;characterId?:string;onSelect:(selection:Selection)=>void}) {
  const [status,setStatus]=useState("all");
  const saved=characterResources(data.resources,book.novel.id,characterId);
  const filtered=saved.filter(item=>status==="all" || item.status===status);
  return <>
    <div className="mb-5 flex flex-wrap gap-3 text-sm">
      <label className="flex items-center gap-2">Character<select className="max-w-full rounded-md border border-input bg-background px-3 py-2" value={characterId ?? ""} onChange={event=>onSelect(event.target.value ? {kind:"character_resources",id:event.target.value} : {kind:"resources"})}><option value="">All novel resources</option>{book.materials.characters.map(character=><option key={character.id} value={character.id}>{character.name}</option>)}</select></label>
      <label className="flex items-center gap-2">Status<select className="rounded-md border border-input bg-background px-3 py-2" value={status} onChange={event=>setStatus(event.target.value)}><option value="all">All statuses</option>{Object.entries(resourceStatusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    <p className="mb-3 text-xs leading-6 text-muted-foreground">{saved.length} {saved.length === 1 ? "item" : "items"}. Character filters include resources they hold or own; ownership and usage limits follow the saved records.</p>
    {!filtered.length ? <p className="py-10 text-sm leading-7 text-muted-foreground">{saved.length ? "No resources have this status." : "No saved resource records. Resources added from chapter reviews will appear here."}</p> : null}
    <div className="divide-y divide-border/40">{filtered.map(item=><section key={item.id} className="space-y-3 py-5">
      <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-base font-semibold">{item.name}</h3><span className="text-xs text-muted-foreground">{resourceStatusLabels[item.status] ?? "Unknown status"} · {resourceFunctionLabels[item.narrativeFunction] ?? "Purpose not specified"}</span></div>
      <p className="whitespace-pre-wrap text-sm leading-7">{item.summary}</p>
      <dl className="grid gap-x-6 gap-y-2 text-xs leading-6 sm:grid-cols-2"><div><dt className="inline text-muted-foreground">Holder: </dt><dd className="inline">{item.holderCharacterName || "Not specified"}</dd></div><div><dt className="inline text-muted-foreground">Owner: </dt><dd className="inline">{item.ownerName || "Not specified"}</dd></div><div><dt className="inline text-muted-foreground">Known to reader: </dt><dd className="inline">{item.readerKnows ? "Yes" : "No"}</dd></div><div><dt className="inline text-muted-foreground">Known to holder: </dt><dd className="inline">{item.holderKnows ? "Yes" : "No"}</dd></div></dl>
      {item.constraints.length ? <ul className="space-y-1 text-sm leading-7">{item.constraints.map((constraint,index)=><li key={index}>Usage limit: {constraint}</li>)}</ul> : null}
      <p className="text-xs text-muted-foreground">Expected use: {chapterWindow(item.expectedUseStartChapterOrder,item.expectedUseEndChapterOrder)}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2"><SourceChapter book={book} source={{chapterId:item.introducedChapterId,chapterOrder:item.introducedChapterOrder}} label="Introduced" onSelect={onSelect}/><SourceChapter book={book} source={{chapterId:item.lastTouchedChapterId,chapterOrder:item.lastTouchedChapterOrder}} label="Last updated" onSelect={onSelect}/></div>
      {item.riskSignals.length ? <ul className="space-y-1 text-sm leading-6 text-warning">{item.riskSignals.map((risk,index)=><li key={index}>{risk.summary}{risk.stale ? " (historical alert)" : ""}</li>)}</ul> : null}
      <details><summary className="cursor-pointer text-xs text-muted-foreground">View changes, evidence & sources</summary><div className="space-y-5 pt-4"><SavedSources book={book} evidence={item.evidence} sources={item.sourceRefs} onSelect={onSelect}/>
        <section><h4 className="mb-3 text-xs font-medium text-muted-foreground">Resource history</h4>{data.resourceEvents.filter(event=>event.resourceId===item.id).map(event=><div key={event.id} className="mb-4 space-y-1"><p className="text-sm font-medium">{resourceEventLabels[event.eventType] ?? "Resource update"}</p><p className="whitespace-pre-wrap text-sm leading-7">{event.summary}</p>{event.evidence.map((evidence,index)=><p key={index} className="text-xs leading-6 text-muted-foreground">{evidence}</p>)}<SourceChapter book={book} source={event} onSelect={onSelect}/></div>)}{!data.resourceEvents.some(event=>event.resourceId===item.id) ? <p className="text-sm text-muted-foreground">No saved changes.</p> : null}</section>
      </div></details>
    </section>)}</div>
    {data.pendingResources.length ? <details className="mt-6 bg-muted/30 px-4 py-3" open><summary className="cursor-pointer text-sm font-medium">Novel-wide resources to verify · {data.pendingResources.length}</summary><p className="mt-3 text-xs leading-6 text-muted-foreground">These changes have not been used in later writing. They are verification prompts and do not mean the character has acquired the resource.</p><div className="divide-y divide-border/40">{data.pendingResources.map(proposal=><section key={proposal.id} className="space-y-2 py-4"><p className="text-sm font-medium">{proposal.summary}</p><ul className="text-xs leading-6 text-muted-foreground">{proposal.validationNotes.map((note,index)=><li key={index}>{note}</li>)}{proposal.evidence.map((evidence,index)=><li key={`e${index}`}>Evidence: {evidence}</li>)}</ul><SourceChapter book={book} source={proposal} onSelect={onSelect}/></section>)}</div></details> : null}
  </>;
}
