import type {DirectorCharacterMaterials} from "@ai-novel/shared/types/director/workspace";
import {Button} from "@/components/ui/button";
import {AssetSection,SavedFields} from "./sections";

export function CharacterDetail({character, onCharacter, onResources}: {character: DirectorCharacterMaterials; onCharacter: (id:string)=>void;onResources?:(id:string)=>void}) {
  return <div className="divide-y divide-border/40">
    <section className="space-y-4 py-5"><SavedFields fields={[["Identity",character.role],["Identity label",character.identityLabel],["Faction",character.factionLabel],["Position",character.stanceLabel],["Relationship to protagonist",character.relationToProtagonist],["Narrative role",character.storyFunction],["Personality",character.personality]]}/>
      <div className="flex flex-wrap gap-2"><Button onClick={()=>onCharacter(character.id)}>View character changes</Button>{onResources ? <Button variant="ghost" onClick={()=>onResources(character.id)}>View inventory & resources</Button> : null}</div><p className="text-xs leading-6 text-muted-foreground">This profile shows saved details. Character changes can be viewed through a selected chapter.</p>
    </section>
    <AssetSection title="Background & motivations" open><SavedFields fields={[["Background",character.background],["External goal",character.outerGoal],["Inner need",character.innerNeed],["Fear",character.fear],["Past wound",character.wound],["Misbelief",character.misbelief],["Moral line",character.moralLine]]}/></AssetSection>
    <AssetSection title="Appearance & expression"><SavedFields fields={[["First impression",character.firstImpression],["Appearance",character.appearance],["Build",character.physique],["Clothing",character.attireStyle],["Signature details",character.signatureDetail],["Voice",character.voiceTexture],["Presence",character.presenceImpression],["Power level",character.powerLevel],["Realm",character.realm]]}/></AssetSection>
    <AssetSection title="Secrets & future growth (may include spoilers)"><SavedFields fields={[["Hidden secret",character.secret],["Growth direction",character.development],["Starting point",character.arcStart],["Midpoint",character.arcMidpoint],["Key choice",character.arcClimax],["End point",character.arcEnd]]}/></AssetSection>
  </div>;
}
