import type {DirectorWorkspaceMaterials} from "@ai-novel/shared/types/director/workspace";
import {AssetSection,SavedFields,SavedList} from "./sections";

export function StoryDetail({materials}: {materials: DirectorWorkspaceMaterials}) {
  const {story} = materials;
  return <div className="divide-y divide-border/40">
    <section className="py-5"><SavedFields fields={[["Story overview",materials.description],["Core appeal",story.coreSellingPoint],["Reader promise",story.readingPromise],["Protagonist fantasy",story.protagonistFantasy],["Opening promise",story.first30ChapterPromise]]}/></section>
    <AssetSection title="Milestones & character arcs" open><SavedFields fields={[["Payoff by chapter 3",story.chapter3Payoff],["Payoff by chapter 10",story.chapter10Payoff],["Payoff by chapter 30",story.chapter30Payoff],["Conflict escalation",story.escalationLadder],["Relationship progression",story.relationshipMainline]]}/></AssetSection>
    <AssetSection title="Writing boundaries"><SavedList label="Rules to follow" items={story.absoluteRedLines}/>{!story.absoluteRedLines?.length ? <p className="text-sm text-muted-foreground">No writing boundaries have been saved yet.</p> : null}</AssetSection>
  </div>;
}
