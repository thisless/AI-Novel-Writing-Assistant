import type {NovelBookProgress} from "@ai-novel/shared/types/director/bookProgress";

export default function HomeBookProgress({progress}: {progress: NovelBookProgress}) {
  const {writtenChapters: written, targetChapters: target} = progress;
  const percent = target ? Math.min(100, Math.floor(written / target * 100)) : null;
  return <section className="mt-7" aria-label="Chapter writing progress">
    <div className="mb-3 flex items-center justify-between gap-4">
      <div><div className="text-sm font-semibold">Chapter writing progress</div>
        <p className="mt-1 text-xs text-muted-foreground">Saved chapters: {written}{target ? ` · Novel goal: ${target} chapters` : " · Set a chapter goal in Auto Director"}.</p></div>
      {percent !== null ? <span className="text-lg font-semibold tabular-nums">{percent}%</span> : null}
    </div>
    {percent !== null ? <div className="h-1.5 overflow-hidden rounded-full bg-muted">
      <div className="h-full bg-primary" style={{width: `${percent}%`}} />
    </div> : null}
    <p className="mt-3 text-xs text-muted-foreground">Open Auto Director to review chapters, quality reminders, and what's next.</p>
  </section>;
}
