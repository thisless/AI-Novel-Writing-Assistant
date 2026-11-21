import type {DirectorWorldMaterials} from "@ai-novel/shared/types/director/workspace";
import {AssetSection,NamedAsset,SavedFields,SavedList} from "./sections";

export function WorldDetail({world}: {world: DirectorWorldMaterials | null}) {
  if (!world) return <p className="py-5 text-sm leading-7 text-muted-foreground">No world setting has been saved for this novel yet. World rules, factions, and locations will appear here.</p>;
  const {structure,storySlice} = world;
  const forces = new Map(structure?.forces.map(item => [item.id,item.name]));
  const factions = new Map(structure?.factions.map(item => [item.id,item.name]));
  const locations = new Map(structure?.locations.map(item => [item.id,item.name]));
  const names = (ids: string[] | undefined, table: Map<string,string>) => ids?.map(id => table.get(id) ?? "Unresolved").join(", ");
  const relationCount = (structure?.relations.forceRelations.length ?? 0) + (structure?.relations.locationControls.length ?? 0) + (structure?.relations.locationConnections?.length ?? 0);
  const layers = world.legacyLayers;
  const legacyFields: [string,string|null|undefined][] = layers ? [
    ["World background",layers.background],["Geography",layers.geography],["Power system",layers.magicSystem],["Politics & institutions",layers.politics],
    ["Culture & daily life",layers.cultures],["Species",layers.races],["Beliefs",layers.religions],["Technology",layers.technology],
    ["History",layers.history],["Economy",layers.economy],["Faction information",layers.factions],["Conflicts",layers.conflicts],["Rules",layers.axioms],
  ] : [];
  return <div className="divide-y divide-border/40">
    <section className="space-y-4 py-5">
      <p className="text-xs text-muted-foreground">{world.source === "novel" ? "Novel-specific setting" : world.source === "library" ? "Linked world reference" : "Saved world reference"}</p>
      {world.warnings?.map(warning => <p key={warning} role="alert" className="text-sm leading-7 text-destructive">{warning}</p>)}
      <SavedFields fields={[["World overview",world.summary],["World identity",structure?.profile.identity],["Story tone",structure?.profile.tone],["Core conflict",structure?.profile.coreConflict]]}/>
      <SavedList label="Themes" items={structure?.profile.themes}/>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground" aria-label="World reference counts">
        <span>Core rules {structure?.rules.axioms.length ?? 0}</span><span>Factions {structure?.factions.length ?? 0}</span>
        <span>Forces {structure?.forces.length ?? 0}</span><span>Locations {structure?.locations.length ?? 0}</span>
      </div>
    </section>
    <AssetSection title="World rules & costs" count={structure?.rules.axioms.length ?? 0} open>
      {structure?.rules.summary ? <p className="whitespace-pre-wrap text-sm leading-7">{structure.rules.summary}</p> : null}
      {structure?.rules.axioms.map(rule => <NamedAsset key={rule.id} name={rule.name}><SavedFields fields={[
        ["Rule description",rule.summary],["Cost of use",rule.cost],["Limits",rule.boundary],["How the rule works",rule.enforcement],
      ]}/></NamedAsset>)}
      {!structure?.rules.axioms.length ? <p className="text-sm text-muted-foreground">No core rules have been saved yet.</p> : null}
      <SavedList label="World taboos" items={structure?.rules.taboo}/><SavedList label="Shared consequences" items={structure?.rules.sharedConsequences}/>
    </AssetSection>
    <AssetSection title="Factions & forces" count={(structure?.factions.length ?? 0)+(structure?.forces.length ?? 0)}>
      {structure?.factions.map(faction => <NamedAsset key={faction.id} name={faction.name}>
        <SavedFields fields={[["Faction position",faction.position],["Beliefs & doctrine",faction.doctrine],["Representative forces",names(faction.representativeForceIds,forces)]]}/>
        <SavedList label="Goals" items={faction.goals}/><SavedList label="Methods" items={faction.methods}/>
      </NamedAsset>)}
      {structure?.forces.map(force => <NamedAsset key={force.id} name={force.name}>
        <SavedFields fields={[["Force overview",force.summary],["Faction",force.factionId ? factions.get(force.factionId) ?? "Unresolved" : null],
          ["Force type",force.type],["Power base",force.baseOfPower],["Current objective",force.currentObjective],["Pressure on characters",force.pressure],
          ["Narrative role",force.narrativeRole],["Leader",force.leader],["Controlled locations",names(force.controlledLocationIds,locations)]]}/>
        <SavedList label="Resources" items={force.resources}/>
      </NamedAsset>)}
      {!structure?.factions.length && !structure?.forces.length ? <p className="text-sm text-muted-foreground">No factions or forces have been saved yet.</p> : null}
    </AssetSection>
    <AssetSection title="Locations & access" count={structure?.locations.length ?? 0}>
      {structure?.locations.map(location => <NamedAsset key={location.id} name={location.name}><SavedFields fields={[
        ["Location overview",location.summary],["Region",location.region],["Terrain",location.terrain],["Narrative function",location.narrativeFunction],
        ["Risks to characters",location.risk],["Entry requirements",location.entryConstraint],["Cost of leaving",location.exitCost],
        ["Controlling forces",names(location.controllingForceIds,forces)],
      ]}/></NamedAsset>)}
      {!structure?.locations.length ? <p className="text-sm text-muted-foreground">No story locations have been saved yet.</p> : null}
    </AssetSection>
    <AssetSection title="Relationships & conflicts" count={relationCount}>
      {structure?.relations.forceRelations.map(relation => <NamedAsset key={relation.id} name={`${forces.get(relation.sourceForceId) ?? "Unresolved force"} → ${forces.get(relation.targetForceId) ?? "Unresolved force"}`}>
        <SavedFields fields={[["Relationship",relation.relation],["Conflict tension",relation.tension],["Details",relation.detail]]}/>
      </NamedAsset>)}
      {structure?.relations.locationControls.map(relation => <NamedAsset key={relation.id} name={`${forces.get(relation.forceId) ?? "Unresolved force"} · ${locations.get(relation.locationId) ?? "Unresolved location"}`}>
        <SavedFields fields={[["Control relationship",relation.relation],["Details",relation.detail]]}/>
      </NamedAsset>)}
      {structure?.relations.locationConnections?.map(relation => <NamedAsset key={relation.id} name={`${locations.get(relation.sourceLocationId) ?? "Unresolved location"} → ${locations.get(relation.targetLocationId) ?? "Unresolved location"}`}>
        <SavedFields fields={[["Route",relation.connectionType],["Distance",relation.distanceHint],["Narrative use",relation.narrativeUse]]}/>
      </NamedAsset>)}
      {!relationCount ? <p className="text-sm text-muted-foreground">No relationships between locations or forces have been saved yet.</p> : null}
    </AssetSection>
    <AssetSection title="How this novel uses the setting" open>
      {storySlice ? <>
        <p className="text-xs leading-6 text-muted-foreground">Saved writing scope describing which rules, forces, and locations this novel uses.</p>
        <SavedFields fields={[["Novel setting",storySlice.coreWorldFrame],["Story scope",storySlice.storyScopeBoundary]]}/>
        {storySlice.appliedRules.map(rule => <NamedAsset key={rule.id} name={rule.name}><SavedFields fields={[["Rule",rule.summary],["Impact on this novel",rule.whyItMatters]]}/></NamedAsset>)}
        {storySlice.activeForces.map(force => <NamedAsset key={force.id} name={force.name}><SavedFields fields={[["Role in this novel",force.roleInStory],["Pressure",force.pressure],["Force overview",force.summary]]}/></NamedAsset>)}
        {storySlice.activeLocations.map(location => <NamedAsset key={location.id} name={location.name}><SavedFields fields={[["Story use",location.storyUse],["Risks",location.risk],["Location overview",location.summary]]}/></NamedAsset>)}
        {storySlice.activeElements.map(element => <NamedAsset key={element.id} name={element.label}><SavedFields fields={[["Use & notes",element.summary]]}/></NamedAsset>)}
        <SavedList label="Potential conflicts" items={storySlice.conflictCandidates}/><SavedList label="Sources of pressure" items={storySlice.pressureSources}/>
        <SavedList label="Sources of mystery" items={storySlice.mysterySources}/><SavedList label="Story directions" items={storySlice.suggestedStoryAxes}/>
        <SavedList label="Suggested entry points" items={storySlice.recommendedEntryPoints}/><SavedList label="Combinations to avoid" items={storySlice.forbiddenCombinations}/>
      </> : <p className="text-sm leading-7 text-muted-foreground">No usage scope has been saved for this novel. The saved world setting is available above.</p>}
    </AssetSection>
    {legacyFields.some(([,value]) => value?.trim()) ? <AssetSection title="Other saved background materials"><SavedFields fields={legacyFields}/></AssetSection> : null}
  </div>;
}
