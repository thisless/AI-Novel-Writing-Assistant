import type { Selection, WorkspaceBook } from "../model";
import { SavedFields } from "./sections";

export function CastOverview({book, onSelect}: {book: WorkspaceBook; onSelect?: (selection: Selection) => void}) {
  return <div className="divide-y divide-border/40">
    {book.materials.characters.map(person => <section key={person.id} className="py-5">
      <button className="text-lg font-medium hover:text-primary" onClick={() => onSelect?.({kind:"character",id:person.id})}>{person.name}</button>
      <SavedFields fields={[["Identity",person.role],["Personality",person.personality],["Narrative role",person.storyFunction],["Action goal",person.currentGoal]]}/>
      <button className="mt-3 text-sm text-primary hover:underline" onClick={() => onSelect?.({kind:"character",id:person.id})}>View character profile</button>
    </section>)}
    {!book.materials.characters.length ? <p className="py-5 text-sm text-muted-foreground">Once the cast is saved, you can review each character's identity, motivations, and character arc here.</p> : null}
  </div>;
}
