import {useQuery} from "@tanstack/react-query";
import {getDirectorLedgers} from "@/api/directorNext";
import {Button} from "@/components/ui/button";
import type {Selection,WorkspaceBook} from "../model";
import {ForeshadowLedger} from "./ForeshadowLedger";
import {ResourceLedger} from "./ResourceLedger";

export function LedgerView({book,selection,onSelect,preview=false}:{book:WorkspaceBook;selection:Selection;onSelect:(selection:Selection)=>void;preview?:boolean}) {
  const novelId=book.novel.id;
  const query=useQuery({queryKey:["directorWorkspaceLedgers",novelId],queryFn:async()=>{
    const response=await getDirectorLedgers(novelId);
    if(!response.success || !response.data || response.data.novelId!==novelId) throw new Error("Couldn't load this novel's foreshadowing and resources.");
    return response;
  },enabled:!preview,retry:false,refetchInterval:10000});
  const data=query.data?.data?.novelId===novelId ? query.data.data : null;
  const unreadable=query.isError || Boolean(query.data && (!query.data.success || !data));
  const characterId=selection.kind==="character_resources" ? selection.id : undefined;
  const name=characterId ? book.materials.characters.find(character=>character.id===characterId)?.name : null;
  const foreshadowing=selection.kind==="foreshadowing";
  return <article className="mx-auto max-w-[42rem] px-2 pb-10 sm:px-6" aria-label={foreshadowing ? "Novel foreshadowing" : "Inventory & resources"}>
    <p className="mb-3 text-xs text-muted-foreground">Novel records · Latest saved state</p>
    <h2 className="mb-3 text-2xl font-semibold">{foreshadowing ? "Foreshadowing" : name ? `${name} · Inventory & resources` : "Inventory & resources"}</h2>
    <p className="mb-6 text-xs leading-6 text-muted-foreground">Includes saved records from across the novel and may reveal later plot developments; it does not represent the state at a particular reading chapter.</p>
    {unreadable ? <div role="alert" className="mb-5 space-y-2 bg-destructive/5 p-3"><p className="text-sm text-destructive">Couldn't load foreshadowing and resources. {data ? "Previously loaded records are still available." : ""}</p><Button size="sm" variant="ghost" disabled={preview} onClick={()=>void query.refetch()}>Reload</Button></div> : null}
    {data?.warnings.length ? <ul role="status" className="mb-5 space-y-1 text-xs leading-6 text-warning">{data.warnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul> : null}
    {data ? foreshadowing ? <ForeshadowLedger book={book} items={data.payoffs} onSelect={onSelect}/> : <ResourceLedger book={book} data={data} characterId={characterId} onSelect={onSelect}/>
      : preview ? <p className="py-10 text-sm text-muted-foreground">This preview has no foreshadowing or resource records.</p>
      : query.isLoading ? <p className="py-10 text-sm text-muted-foreground">Loading saved foreshadowing and resources…</p> : null}
  </article>;
}
