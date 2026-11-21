import {useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {directorChapterTokenLimitSchema, MAX_DIRECTOR_CHAPTER_TOKEN_LIMIT} from "@ai-novel/shared/types/director/chapterBudget";
import {getDirectorChapterBudgetSettings} from "@/api/settings";
import LLMSelector from "@/components/common/LLMSelector";
import {useLLMStore} from "@/store/llmStore";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {createDirectorCommandKey,submitDirectorCommand,type DirectorDriver} from "@/api/directorNext";
import {queryKeys} from "@/api/queryKeys";

export default function DirectorStart({novelId, estimatedChapterCount, nextChapter, initialStory, worldId, suggestedRange, initialDriver = "assisted"}: {
  novelId: string; estimatedChapterCount: number | null; nextChapter: number; initialStory: string; worldId?: string | null;
  suggestedRange?: {from:number;to:number}|null;
  initialDriver?: DirectorDriver;
}) {
  const [story, setStory] = useState(initialStory), [count,setCount] = useState(Math.max(estimatedChapterCount ?? 30, nextChapter));
  const [production,setProduction] = useState(Boolean(suggestedRange)), [from,setFrom] = useState(suggestedRange?.from ?? nextChapter), [to,setTo] = useState(suggestedRange?.to ?? nextChapter);
  const [assisted,setAssisted] = useState(initialDriver === "assisted"), [qualityFirst,setQualityFirst] = useState(false);
  const [world,setWorld] = useState<"skip"|"reuse"|"generate">(worldId ? "reuse" : "skip");
  const model = useLLMStore(), queries = useQueryClient();
  const [chapterBudget, setChapterBudget] = useState("");
  const [volumeCount, setVolumeCount] = useState("");
  const validVolumeCount = !volumeCount || (Number.isInteger(Number(volumeCount)) && Number(volumeCount) >= 1 && Number(volumeCount) <= 24);
  const budgetSettings = useQuery({queryKey: queryKeys.settings.directorChapterBudget, queryFn: getDirectorChapterBudgetSettings});
  const validBudget = !chapterBudget.trim() || directorChapterTokenLimitSchema.safeParse(Number(chapterBudget)).success;
  const mutation = useMutation({mutationFn: async () => {
    if (!story.trim() || !model.provider || !model.model || !Number.isInteger(count) || count < 1) throw new Error("Enter a story direction and target chapter count, and select a model.");
    if (production && (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to > count)) throw new Error("Enter a valid chapter range within the target chapter count.");
    if (!validVolumeCount) throw new Error("Enter a whole number from 1 to 24 for the fixed volume count, or leave it blank for an AI recommendation.");
    if (!validBudget) throw new Error("Enter a whole number from 16,001 to 10,000,000 for the per-chapter AI usage limit.");
    return submitDirectorCommand({type:"open_run",novelId,driver:assisted ? "assisted" : "auto",stepIdsInScope:null,idempotencyKey:createDirectorCommandKey(),
      launchInput:{storyInput:story.trim(),estimatedChapterCount:count,...(volumeCount ? {userPreferredVolumeCount:Number(volumeCount)} : {}),worldMode:world,targetMode:"opening",provider:model.provider,model:model.model,temperature:model.temperature,
        issuePolicyMode:qualityFirst ? "quality_first" : "completion_first",...(chapterBudget.trim() ? {chapterTokenLimit:Number(chapterBudget)} : {}),...(production ? {executionRange:{from,to}} : {})}});
  },onSuccess: async()=>{await Promise.all([queries.invalidateQueries({queryKey:queryKeys.directorNext.summary(novelId)}),queries.invalidateQueries({queryKey:queryKeys.directorNext.detail(novelId)})]);}});
  return <section id="director-start" className="space-y-4 border-t border-border/50 py-5">
    <h2 className="text-sm font-semibold">{suggestedRange ? "Choose the next manuscript range" : "Choose what to write next"}</h2>
    <p className="text-xs leading-5 text-muted-foreground">Review the chapter range before submitting. AI will complete the required planning and writing; existing manuscript text is preserved.</p>
    <label className="flex gap-2 text-xs"><input type="checkbox" checked={production} onChange={e=>setProduction(e.target.checked)}/>Write selected chapters</label>
    {production ? <div className="grid grid-cols-2 gap-3"><label className="space-y-2 text-xs">First chapter<Input type="number" min={1} max={count} value={from} onChange={e=>setFrom(Number(e.target.value))}/></label><label className="space-y-2 text-xs">Last chapter<Input type="number" min={from} max={count} value={to} onChange={e=>setTo(Number(e.target.value))}/></label><p className="col-span-2 text-xs text-muted-foreground">Only the selected range will be written. Turn off “Write selected chapters” to complete planning only.</p></div>:null}
    <label className="flex gap-2 text-xs"><input type="checkbox" checked={assisted} onChange={e=>setAssisted(e.target.checked)}/>Confirm results at each stage (assisted)</label>
    <p className="text-xs text-muted-foreground">This run: {assisted ? "Confirm each stage" : "Fully automatic"} · {qualityFirst ? "Confirm quality issues" : "Record local quality reminders and continue"} · {model.model || "Select a model in More writing settings"}</p>
    <Button className="w-full" disabled={mutation.isPending || !validBudget || !validVolumeCount} onClick={()=>mutation.mutate()}>{mutation.isPending ? "Submitting…" : production ? `Submit and write chapters ${from}–${to}` : "Submit and complete the writing plan"}</Button>
    {mutation.isError ? <p role="alert" className="text-xs text-destructive">{mutation.error.message}</p>:null}
    <details className="space-y-4 text-xs"><summary className="cursor-pointer text-muted-foreground">More writing settings (story direction, model, budget, quality handling)</summary>
    <label className="block space-y-2 text-xs">Per-chapter AI usage limit (tokens)<Input type="number" min={16001} max={MAX_DIRECTOR_CHAPTER_TOKEN_LIMIT} step={1}
      value={chapterBudget} placeholder={budgetSettings.data?.data ? `Use global setting: ${budgetSettings.data.data.tokenLimit.toLocaleString("en-US")}` : "Leave blank to use global setting"}
      aria-invalid={!validBudget} onChange={event=>setChapterBudget(event.target.value)}/></label>
    <p className="text-xs text-muted-foreground">Leave blank to use the global default. A value applies only to this run. If the limit is reached, progress is saved so you can add budget and continue.</p>
    {!validBudget ? <p className="text-xs text-destructive">Enter a whole number from 16,001 to 10,000,000, or leave blank to use the global setting.</p> : null}
    <label className="block space-y-2 text-xs">Story direction<textarea className="min-h-24 w-full rounded-md border border-input bg-background p-2 text-sm" value={story} onChange={e=>setStory(e.target.value)} placeholder="What is the story about, and what does the protagonist want to achieve?" /></label>
    <label className="block space-y-2 text-xs">Target chapter count for the book<Input type="number" min={1} value={count} onChange={e=>setCount(Number(e.target.value))}/></label>
    <label className="block space-y-2 text-xs">Fixed number of volumes (optional)<Input type="number" min={1} max={24} step={1} value={volumeCount} placeholder="Leave blank for an AI recommendation" aria-invalid={!validVolumeCount} onChange={event=>setVolumeCount(event.target.value)}/></label>
    <p className="text-xs text-muted-foreground">Enter 1–24 volumes for AI to structure the book accordingly. Existing volume structure is preserved.</p>
    <LLMSelector compact showHelperText />
    <label className="block space-y-2 text-xs">World setting<select className="w-full rounded-md border border-input bg-background p-2" value={world} onChange={e=>setWorld(e.target.value as typeof world)}><option value="skip">Don't use a separate world setting</option>{worldId ? <option value="reuse">Use the world linked to this novel</option>:null}<option value="generate">Have AI create a world setting</option></select></label>
    <label className="flex gap-2 text-xs"><input type="checkbox" checked={qualityFirst} onChange={e=>setQualityFirst(e.target.checked)}/>Pause for my confirmation when quality issues arise</label>
    </details>
  </section>;
}
