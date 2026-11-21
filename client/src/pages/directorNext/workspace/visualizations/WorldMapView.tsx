import {useMemo} from "react";
import {WorldVisualizationBoard} from "@/pages/worlds/components/visualization";
import type {WorkspaceBook} from "../model";
import {projectSavedWorldVisualization} from "./worldProjection";

export function WorldMapView({book, onOpenWorld}: {book:WorkspaceBook; onOpenWorld:()=>void}) {
  const world = book.materials.world;
  const payload = useMemo(()=>projectSavedWorldVisualization(world),[world]);
  return <div className="min-w-0 space-y-4 px-2 sm:px-6">
    <div>
      <p className="mb-2 text-xs text-muted-foreground">{world?.name ?? "Novel world"}</p>
      <h2 className="text-2xl font-semibold">World map</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Explore locations, routes, and relationships between forces. Drag or zoom the graph, or view it full screen. Locations without coordinates use an illustrative layout.</p>
    </div>
    {world?.warnings?.map((warning,index)=><p key={index} role="alert" className="text-sm text-destructive">{warning}</p>)}
    {!payload?.geographyMap.nodes.length ? <p className="py-3 text-sm text-muted-foreground">No locations to map yet. View the saved details in World setting.</p> : null}
    <button type="button" className="text-sm text-primary hover:underline focus-visible:underline" onClick={onOpenWorld}>View world setting</button>
    {payload ? <WorldVisualizationBoard payload={payload} initialMode="geography"/> : null}
  </div>;
}
