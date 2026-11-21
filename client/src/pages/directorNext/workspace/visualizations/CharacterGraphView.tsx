import {useMemo, useState} from "react";
import {useQuery} from "@tanstack/react-query";
import {getCharacterRelations} from "@/api/novel";
import {getCharacterDynamicsOverview} from "@/api/novelCharacterDynamics";
import {queryKeys} from "@/api/queryKeys";
import {CharacterRelationshipGraphPanel, buildRelationshipGraphModel, type RelationshipGraphMode} from "@/pages/novels/components/characterWorkspace/relationshipGraph";
import type {WorkspaceBook} from "../model";

export function CharacterGraphView({book, preview=false, onOpenCharacter}: {book:WorkspaceBook; preview?:boolean; onOpenCharacter:(id:string)=>void}) {
  const novelId = book.novel.id;
  const [mode, setMode] = useState<RelationshipGraphMode>("all");
  const [selectedId, setSelectedId] = useState("");
  const relations = useQuery({queryKey:queryKeys.novels.characterRelations(novelId),
    queryFn:async()=>{
      const response = await getCharacterRelations(novelId);
      if (!response.success || !Array.isArray(response.data)) throw new Error("Couldn't load this novel's relationship data.");
      return response;
    }, enabled:!preview && Boolean(novelId),
    staleTime:5_000, refetchInterval:15_000});
  const dynamics = useQuery({queryKey:queryKeys.novels.characterDynamicsOverview(novelId),
    queryFn:async()=>{
      const response = await getCharacterDynamicsOverview(novelId);
      if (!response.success || !Array.isArray(response.data?.relations)) throw new Error("Couldn't load this novel's dynamic relationships.");
      return response;
    }, enabled:!preview && Boolean(novelId),
    staleTime:5_000, refetchInterval:15_000});
  const selected = book.materials.characters.find(character=>character.id===selectedId)?.id ?? "";
  const model = useMemo(()=>buildRelationshipGraphModel({characters:book.materials.characters,
    staticRelations:preview ? [] : relations.data?.data ?? [],
    dynamicRelations:preview ? [] : dynamics.data?.data?.relations ?? [],
    selectedCharacterId:selected,mode}),[book.materials.characters, relations.data, dynamics.data, preview, selected, mode]);
  const error = relations.error ?? dynamics.error;
  return <div className="min-w-0 space-y-4 px-2 sm:px-6">
    <div>
      <h2 className="text-2xl font-semibold">Character relationship graph</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Explore saved relationships and the latest character dynamics. Select a character or connection to see details, and filter by character, high-tension relationships, or story stage. The graph shows the latest information for the entire novel and may include later plot developments.</p>
    </div>
    {error ? <div role="alert" className="space-y-2 text-sm text-destructive">
      <p>Couldn't load character relationships; some data may be missing from the graph. {error instanceof Error ? error.message : ""}</p>
      <button type="button" className="text-primary hover:underline" onClick={()=>{void relations.refetch(); void dynamics.refetch();}}>Reload relationships</button>
    </div> : null}
    {selected ? <button type="button" className="text-sm text-primary hover:underline focus-visible:underline" onClick={()=>onOpenCharacter(selected)}>View character profile</button> : null}
    <CharacterRelationshipGraphPanel model={model} mode={mode} onModeChange={setMode}
      selectedCharacterId={selected} onSelectedCharacterChange={setSelectedId}
      isLoading={!preview && (relations.isLoading || dynamics.isLoading)}/>
  </div>;
}
