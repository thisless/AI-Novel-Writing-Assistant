import type { Selection, WorkspaceBook } from "../model";
import { SavedFields } from "./sections";

export function PlanningOverview({book, onSelect}: {book: WorkspaceBook; onSelect?: (selection: Selection) => void}) {
  const strategy = book.planning?.strategyPlan;
  const volumes = book.planning?.volumes ?? book.materials.volumes;
  return <div className="divide-y divide-border/40">
    {strategy ? <section className="py-5"><SavedFields fields={[["Reader reward progression",strategy.readerRewardLadder],
      ["Conflict escalation",strategy.escalationLadder],["Midpoint shift",strategy.midpointShift],["Planning notes",strategy.notes]]}/></section> : null}
    {volumes.map(volume => <section key={volume.id} className="py-5">
      <button className="text-lg font-medium hover:text-primary" onClick={() => onSelect?.({kind:"volume",id:volume.id})}>{volume.title}</button>
      <SavedFields fields={[["Volume overview",volume.summary],["Reader promise",volume.mainPromise]]}/>
      <button className="mt-3 text-sm text-primary hover:underline" onClick={() => onSelect?.({kind:"volume",id:volume.id})}>View beats & chapters</button>
    </section>)}
    {!volumes.length ? <p className="py-5 text-sm text-muted-foreground">Saved volume plans will show each volume's story, beats, and chapter outline here.</p> : null}
  </div>;
}
