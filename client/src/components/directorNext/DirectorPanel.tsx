import {InvocationUsageList} from "./usage";
import { Link } from "react-router-dom";
import { BookOpen, ClipboardList, History, ShieldAlert } from "lucide-react";
import type { DashboardView, DirectorTimelineEvent } from "@/api/directorNext";
import DirectorBadge, { directorDriverLabel } from "./DirectorBadge";
import DirectorGate from "./DirectorGate";
import DirectorDriveSwitch from "./DirectorDriveSwitch";
import type {ReactNode} from "react";
import DirectorCharacterCandidates, {useDirectorCharacterCandidates} from "./characters/DirectorCharacterCandidates";
import ChapterBudgetRecovery from "./budget/ChapterBudgetRecovery";
import UnknownClaimsRecovery from "./UnknownClaimsRecovery";
import WorkflowProgressBar from "@/components/workflow/WorkflowProgressBar";

interface DirectorPanelProps {
  view: DashboardView;
  novelId: string;
  outlineBound?: boolean;
  timeline?: DirectorTimelineEvent[];
  preview?: boolean;
  startForm?: ReactNode | ((range: DashboardView["nextLaunchRange"], driver: DashboardView["driver"]) => ReactNode);
  reviewTarget?:string;
  reviewReady?:boolean;
  reviewRunId?:string;
  reviewVersion?:number;
  renderPlanEditor?:import("./DirectorGate").PlanEditorRenderer;
}

function formatEvent(event: DirectorTimelineEvent): string {
  const label: Record<string, string> = {
    command_accepted: "Writing command accepted",
    step_started: "Stage started",
    step_finished: "Stage completed",
    quality_debt_recorded: "Quality reminder recorded",
    stop_signal: "Pause reason recorded",
    token_usage: "AI call completed",
  };
  return label[event.type] ?? "Writing record updated";
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown time" : date.toLocaleString();
}

export default function DirectorPanel({ view, novelId, timeline = [], preview = false, startForm, reviewTarget, reviewReady = false, reviewRunId, reviewVersion, renderPlanEditor, outlineBound = false }: DirectorPanelProps) {
  const candidates = useDirectorCharacterCandidates(view.runId, !preview);
  const candidatePage = candidates.data?.data;
  const reviewingCharacters = candidatePage?.reviews.some(r => r.blocking) ?? false;
  const badgeView = reviewingCharacters ? {...view, headline: "Review this chapter's characters to continue", availableActions: view.availableActions.filter(a => a.command !== "resume")} : view;
  const reviewingCurrentGate=reviewReady && reviewRunId===view.runId && reviewVersion===view.sourceTrace.controlVersion && view.availableActions.some(action=>action.id.startsWith("review:") && action.kind==="navigate" && action.target===reviewTarget);
  const navigationAction = view.availableActions.find(action => action.kind === "navigate" && action.target !== reviewTarget);
  const driveSwitch = view.availableActions.find(action => action.command === "handoff" && action.toDriver);
  const chapterText = view.debts.chapterOrders.length > 0
    ? `Chapters ${view.debts.chapterOrders.join(", ")}`
    : "No chapter quality issues were recorded for this run.";
  const chapterProgress = view.chapterProgress;
  const chapterListProgress = view.chapterListProgress;
  const progress = chapterProgress ?? view.progress;

  return (
    <aside className="flex min-h-0 flex-col gap-0 bg-background" aria-label="Novel Director panel">
      <DirectorBadge view={badgeView} novelId={novelId} preview={preview} currentNavigationTarget={reviewTarget} openRunLabel={outlineBound ? "Select the next chapter and confirm" : undefined} />
      {!preview ? <DirectorCharacterCandidates page={candidatePage} runId={view.runId} novelId={novelId}/> : null}
      {candidates.isError ? <p role="alert" className="py-2 text-xs text-destructive">Couldn't load character candidates. Try again later.</p> : null}
      {view.mode === "paused" && view.chapterBudget ? <ChapterBudgetRecovery key={`${view.runId}:${view.sourceTrace.controlVersion}:${view.chapterBudget.chapterId}`}
        budget={view.chapterBudget} runId={view.runId} novelId={novelId} expectedVersion={view.sourceTrace.controlVersion} disabled={preview || reviewingCharacters}/> : null}
      {view.mode === "paused" && view.unknownClaims ? <UnknownClaimsRecovery key={`${view.runId}:${view.sourceTrace.controlVersion}:${view.unknownClaims.chapterId}`}
        claims={view.unknownClaims} runId={view.runId} novelId={novelId} expectedVersion={view.sourceTrace.controlVersion} disabled={preview || reviewingCharacters}/> : null}
      {!preview && view.mode === "waiting_gate" && reviewingCurrentGate ? <DirectorGate key={`${view.runId}:${view.sourceTrace.controlVersion}`} runId={view.runId} novelId={novelId} expectedVersion={view.sourceTrace.controlVersion} reviewType={view.availableActions.find(action=>action.kind==="navigate" && action.target===reviewTarget)?.id.slice("review:".length)} renderPlanEditor={renderPlanEditor}/>:null}
      {!outlineBound && driveSwitch?.toDriver ? <DirectorDriveSwitch runId={view.runId} novelId={novelId} expectedVersion={view.sourceTrace.controlVersion} toDriver={driveSwitch.toDriver} label={driveSwitch.label} disabled={preview}/>:null}

      <section className="border-t border-border/60 py-4" aria-labelledby="director-current-work">
        <div className="flex items-center gap-2 text-sm font-semibold" id="director-current-work">
          <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Current activity
        </div>
        <p className="mt-2 text-sm leading-6 text-foreground">{view.headline}</p>
        {chapterListProgress ? (
          <div className="mt-3 space-y-2 text-xs" role="status" aria-live="polite">
            <p>{chapterListProgress.label}</p>
            <div role="progressbar" aria-label="Chapter breakdown progress" aria-valuemin={0}
              aria-valuemax={chapterListProgress.totalChapters} aria-valuenow={chapterListProgress.completedChapters}>
              <WorkflowProgressBar progress={chapterListProgress.completedChapters / chapterListProgress.totalChapters} />
            </div>
            <p className="text-muted-foreground">
              Generated {chapterListProgress.completedChapters}/{chapterListProgress.totalChapters} chapters
              {chapterListProgress.completedChapters === chapterListProgress.totalChapters
                ? " · Validating and saving the chapter list…" : " · Progress updates as each beat is completed."}
            </p>
          </div>
        ) : null}
        {chapterProgress ? <p className="mt-2 text-xs text-muted-foreground">Current manuscript: Chapters {chapterProgress.from}–{chapterProgress.to}</p> : null}
        <div className="mt-3" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} aria-label={chapterProgress ? "Current manuscript progress" : "Director stage progress"}>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{chapterProgress ? "Review and save complete" : "Planning stages complete"}</span>
            <span>{progress.done}/{progress.total}{chapterProgress ? " chapters" : " stages"}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress.total > 0 ? Math.min(100, (progress.done / progress.total) * 100) : 0}%` }} />
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 py-4" aria-labelledby="director-next-action">
        <div className="flex items-center gap-2 text-sm font-semibold" id="director-next-action">
          <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Next steps
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{reviewingCurrentGate ? "Review this stage's results on the left. Confirm to let AI continue within the authorized range." : view.nextActionGuidance}</p>
        {view.detail ? <p className={`mt-2 text-sm leading-6 ${reviewingCharacters ? "text-muted-foreground" : "text-destructive"}`}>{view.detail}</p> : null}
        {navigationAction ? (
          <Link className="mt-3 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline" to={navigationAction.target ?? view.sourceRoute}>
            View this stage's results
          </Link>
        ) : null}
        {!preview && ["completed","cancelled","failed"].includes(view.mode) && view.availableActions.some(action=>action.command === "open_run")
          ? typeof startForm === "function" ? startForm(view.nextLaunchRange, view.driver) : startForm : null}
      </section>

      {!preview ? <InvocationUsageList runId={view.runId} active={["running","queued"].includes(view.mode)}/> : null}
      <section className="border-t border-border/60 py-4" aria-labelledby="director-quality-debt">
        <div className="flex items-center gap-2 text-sm font-semibold" id="director-quality-debt">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Quality reminders
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {view.debts.count > 0 ? `${view.debts.count} quality reminders recorded · ${chapterText}` : chapterText}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Find these chapters in the directory on the left. A local quality reminder doesn't mean the run failed. Follow the guidance above to resolve pauses.</p>
      </section>

      <section className="border-t border-border/60 py-4" aria-labelledby="director-timeline">
        <div className="flex items-center gap-2 text-sm font-semibold" id="director-timeline">
          <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Timeline
        </div>
        {timeline.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No timeline events to display yet.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {timeline.slice(-8).reverse().map((event) => (
              <li key={`${event.seq}-${event.type}`} className="flex gap-3 text-xs">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" aria-hidden="true" />
                <span className="min-w-0 text-muted-foreground">
                  <span className="block text-foreground">{formatEvent(event)}</span>
                  <span className="block mt-0.5">{formatTime(event.createdAt)}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <details className="border-t border-border/60 py-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none">Run diagnostics</summary>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
          <dt>Writing mode</dt><dd className="text-foreground">{directorDriverLabel(view.driver)}</dd>
          <dt>Plan version</dt><dd className="break-all text-foreground">{view.sourceTrace.planVersion}</dd>
          <dt>State version</dt><dd className="text-foreground">{view.sourceTrace.controlVersion}</dd>
          <dt>Stages completed</dt><dd className="text-foreground">{view.progress.done}/{view.progress.total}</dd>
        </dl>
      </details>
    </aside>
  );
}
