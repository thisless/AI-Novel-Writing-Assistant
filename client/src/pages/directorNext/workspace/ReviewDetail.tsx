import {parseChapterScenePlan} from "@ai-novel/shared/types/chapterLengthControl";
import type {SavedReview} from "./review";
import type {WorkspaceBook} from "./model";
import {ReadingDisplaySettings, readingTextStyle, type ReadingDisplayPreferences} from "./reading";
import {OutlinePreparationReview} from "./OutlinePreparationReview";
import {Button} from "@/components/ui/button";

function Field({label,value}:{label:string;value?:string|number|null}) {
  return value ? <section className="py-3"><h3 className="mb-2 text-sm font-medium text-muted-foreground">{label}</h3><p className="whitespace-pre-wrap leading-8">{value}</p></section> : null;
}
function Scenes({value,targetWordCount}:{value?:string|null;targetWordCount?:number|null}) {
  const plan=parseChapterScenePlan(value,{targetWordCount});
  if (!plan) return <Field label="Scene plan" value={value}/>;
  return <section className="py-3"><h3 className="text-sm font-medium">Scene plan · {plan.scenes.length} {plan.scenes.length === 1 ? "scene" : "scenes"}</h3>{plan.scenes.map((scene,index)=><section key={scene.key} className="mt-4 border-t border-border/40 pt-4">
    <h4 className="font-medium">{index+1}. {scene.title}</h4>
    <Field label="Scene goal" value={scene.purpose}/><Field label="Must advance" value={scene.mustAdvance.join("\n")}/><Field label="Must preserve" value={scene.mustPreserve.join("\n")}/>
    <Field label="Entry state" value={scene.entryState}/><Field label="Exit state" value={scene.exitState}/><Field label="Resistance" value={scene.resistance}/><Field label="Turning point" value={scene.turn}/><Field label="Emotional shift" value={scene.emotionalShift}/><Field label="Reader payoff" value={scene.readerValue}/><Field label="Avoid expanding" value={scene.forbiddenExpansion.join("\n")}/><Field label="Target word count" value={scene.targetWordCount}/>
  </section>)}</section>;
}

export function ReviewDetail({book,review,readingDisplay,onReadingDisplayChange,onEditChapter}:{book:WorkspaceBook;review:SavedReview;readingDisplay:ReadingDisplayPreferences;onReadingDisplayChange:(next:ReadingDisplayPreferences)=>void;onEditChapter?:(chapterId:string)=>void}) {
  const chapter=review.plan ?? review.execution;
  return <article className="mx-auto max-w-[42rem] px-2 pb-8 sm:px-6" aria-label="Creative result for this stage">
    <p className="mb-3 text-xs text-muted-foreground">Review stage result</p>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-2xl font-semibold">{review.label}</h2>
      {review.chapters?.length ? <ReadingDisplaySettings preferences={readingDisplay} onChange={onReadingDisplayChange} previewText={review.chapters[0].content}/> : null}
    </div>
    {review.error ? <p role="alert" className="text-sm text-destructive">{review.error}</p> : review.notice ? <p role="status" className="text-sm leading-6 text-muted-foreground">{review.notice}</p> : <>
      <OutlinePreparationReview book={book} review={review}/>
      {chapter ? <><h3 className="mb-3 text-lg font-medium">Chapter {review.plan?.chapterOrder ?? review.execution?.order} · {chapter.title}</h3>
        {review.plan ? <><Field label="Chapter overview" value={review.plan.summary}/><Field label="Story goal" value={review.plan.purpose}/><Field label="Key event" value={review.plan.exclusiveEvent}/><Field label="Ending state" value={review.plan.endingState}/></> : null}
        <Field label="Chapter tasks" value={chapter.taskSheet}/><Field label="Target word count" value={chapter.targetWordCount}/><Field label="Avoid" value={chapter.mustAvoid}/><Scenes value={chapter.sceneCards} targetWordCount={chapter.targetWordCount}/><Field label="Style contract" value={review.plan?.styleContract}/>
      </> : null}
      {review.type === "character_cast" ? book.materials.characters.map(person=><section key={person.id} className="border-t border-border/40 py-4"><h3 className="text-lg font-medium">{person.name}</h3><Field label="Identity" value={person.role}/><Field label="Personality" value={person.personality}/><Field label="Narrative role" value={person.storyFunction}/><Field label="Action goal" value={person.currentGoal}/></section>) : null}
      {review.type === "volume_strategy" ? <>
        <Field label="Reader reward progression" value={book.planning?.strategyPlan?.readerRewardLadder}/><Field label="Conflict escalation" value={book.planning?.strategyPlan?.escalationLadder}/><Field label="Midpoint shift" value={book.planning?.strategyPlan?.midpointShift}/><Field label="Planning notes" value={book.planning?.strategyPlan?.notes}/>
        {book.planning?.volumes.map(volume=><section key={volume.id} className="border-t border-border/40 py-4"><h3 className="text-lg font-medium">{volume.title}</h3><Field label="Volume overview" value={volume.summary}/><Field label="Opening hook" value={volume.openingHook}/><Field label="Reader promise" value={volume.mainPromise}/><Field label="Primary pressure" value={volume.primaryPressureSource}/><Field label="Core appeal" value={volume.coreSellingPoint}/><Field label="Escalation approach" value={volume.escalationMode}/><Field label="Protagonist change" value={volume.protagonistChange}/><Field label="Mid-volume risk" value={volume.midVolumeRisk}/><Field label="Volume climax" value={volume.climax}/><Field label="Payoff" value={volume.payoffType}/><Field label="Next-volume hook" value={volume.nextVolumeHook}/><Field label="Reset point" value={volume.resetPoint}/><Field label="Open payoffs" value={volume.openPayoffs?.join("\n")}/></section>)}
      </> : null}
      {review.chapters?.map(row=><section key={row.id} className="border-t border-border/40 py-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-medium">Chapter {row.order} · {row.title}</h3>{onEditChapter ? <Button size="sm" variant="outline" onClick={()=>onEditChapter(row.id)}>Edit prose</Button> : null}</div><p className="whitespace-pre-wrap break-words leading-[2.15] tracking-wide text-foreground/90" style={readingTextStyle(readingDisplay)}>{row.content}</p></section>)}
    </>}
  </article>;
}
