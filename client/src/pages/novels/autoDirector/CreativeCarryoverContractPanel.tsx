import type { ReactNode } from "react";
import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import { Link } from "react-router-dom";
import type { CreativeCarryoverContract } from "@ai-novel/shared/types/creativeCarryoverContract";
import { Button } from "@/components/ui/button";

export type CreativeCarryoverPanelState =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
    kind: "insufficient";
    bookAnalysisId: string;
    analysisTitle: string;
    missingSectionTitles: string[];
  }
  | { kind: "error"; message: string; hasPrevious: boolean }
  | { kind: "ready"; contract: CreativeCarryoverContract };

interface CreativeCarryoverContractPanelProps {
  modeLabel: string;
  referenceTitle: string;
  state: CreativeCarryoverPanelState;
  previousContract?: CreativeCarryoverContract | null;
  onRegenerate: () => void;
  isGenerating: boolean;
  isAdopting: boolean;
}

function TraitList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3 text-sm leading-7 text-foreground">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3">
          <span className="mt-3 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden="true" />
          <span className="min-w-0 break-words">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function PlanDetails({ title, hint, children }: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <details className="group border-t border-border/60 py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-sm font-medium text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
      </summary>
      <div className="pt-4">{children}</div>
    </details>
  );
}

export default function CreativeCarryoverContractPanel({
  modeLabel,
  referenceTitle,
  state,
  previousContract,
  onRegenerate,
  isGenerating,
  isAdopting,
}: CreativeCarryoverContractPanelProps) {
  const contract = state.kind === "ready" ? state.contract
    : state.kind === "error" ? previousContract : null;
  const title = referenceTitle || contract?.documentTitle || "Reference work";
  const busy = isGenerating || isAdopting;

  return (
    <section className="space-y-5" aria-label="Story carryover plan" aria-busy={busy}>
      <div>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded bg-primary/10 px-2 py-1 font-medium text-primary">{modeLabel}</span>
          </div>
          <h2 className="break-words text-xl font-semibold leading-8 text-foreground">{title}</h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Review the first three chapters, then decide whether to use this plan for your new story.
          </p>
        </div>
      </div>

      <div role="status" aria-live="polite" className="text-sm leading-6 text-muted-foreground">
        {isGenerating || state.kind === "loading" ? (
          <span className="inline-flex items-center gap-2">
            <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            {contract ? "Generating a new plan. The current plan is saved for comparison." : "Preparing a plan from the analysis. You can adopt it when it is ready."}
          </span>
        ) : isAdopting ? "Saving the adopted plan…" : contract?.adopted ? (
          <span className="inline-flex items-center gap-2 text-success">
            <Check className="h-4 w-4" aria-hidden="true" />
            Plan adopted. You can continue with setup.
          </span>
        ) : contract ? "Plan ready. Adopt it to continue setup." : null}
      </div>

      {state.kind === "insufficient" ? (
        <div className="space-y-3 rounded-lg bg-warning/10 px-4 py-3 text-sm leading-6">
          <p className="font-medium text-foreground">
            Missing analysis sections: {state.missingSectionTitles.join(", ")}
          </p>
          <p className="text-muted-foreground">Complete these findings so AI can prepare a reliable story plan for “{title}.”</p>
          <Button type="button" size="sm" variant="secondary" asChild>
            <Link to={`/book-analysis?analysisId=${encodeURIComponent(state.bookAnalysisId)}`}>Complete the analysis</Link>
          </Button>
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div role="alert" className="flex flex-col gap-3 rounded-lg bg-warning/10 px-4 py-3 text-sm leading-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-foreground">{state.message}</p>
            <p className="text-muted-foreground">
              {contract ? "You can adopt the saved plan below or try generating it again." : "The reference work is still saved. Try generating the plan again."}
            </p>
          </div>
          <Button type="button" size="sm" variant="secondary" className="self-start sm:shrink-0" onClick={onRegenerate} disabled={busy}>
            {isGenerating ? "Trying again…" : "Try again"}
          </Button>
        </div>
      ) : null}

      {contract ? (
        <div>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-10">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-foreground">Plan for the first three chapters</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Opening direction · AI will continue planning after you adopt it</p>
              <ol className="mt-4 divide-y divide-border/60">
                {contract.openingChapters.slice().sort((a, b) => a.chapterNumber - b.chapterNumber).map((item) => (
                  <li key={item.chapterNumber} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 py-4 first:pt-0">
                    <span className="pt-0.5 text-xl font-medium tabular-nums text-primary" aria-label={`Chapter ${item.chapterNumber}`}>
                      {String(item.chapterNumber).padStart(2, "0")}
                    </span>
                    <p className="break-words text-sm leading-7 text-foreground">{item.direction}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-foreground">Creative direction for this book</h3>
              <p className="mb-4 mt-1 text-xs leading-5 text-muted-foreground">Bring elements of the reference work into your story</p>
              <TraitList items={contract.bookRealization.slice(0, 3)} />
              {contract.bookRealization.length > 3 ? (
                <div className="mt-4">
                  <PlanDetails title="View other creative directions" hint={`${contract.bookRealization.length - 3} more`}>
                    <TraitList items={contract.bookRealization.slice(3)} />
                  </PlanDetails>
                </div>
              ) : null}
              <div className="mt-4">
                <PlanDetails title="What makes the source work distinctive" hint={`${contract.sourceTraits.length} reference points`}>
                  <TraitList items={contract.sourceTraits} />
                </PlanDetails>
              </div>
            </div>
          </div>

          {contract.mode === "continuation" && contract.continuationFocus ? (
            <PlanDetails title="What to carry forward" hint={`${contract.continuationFocus.finalCharacterStates.length} character states · ${contract.continuationFocus.unfinishedThreads.length} unresolved threads`}>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-sm font-medium text-foreground">Character states at the end of the source</h3>
                  <TraitList items={contract.continuationFocus.finalCharacterStates} />
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-medium text-foreground">Unresolved storylines</h3>
                  <TraitList items={contract.continuationFocus.unfinishedThreads} />
                </div>
              </div>
            </PlanDetails>
          ) : null}
          {contract.mode === "adaptation" && contract.adaptationFocus ? (
            <PlanDetails title="How to adapt it into a standalone novel" hint="Hooks, conflict, and payoff pacing">
              <p className="mb-5 max-w-3xl text-sm leading-7 text-foreground">{contract.adaptationFocus.conversionPlan}</p>
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <h3 className="mb-3 text-sm font-medium text-foreground">Hooks that draw readers in</h3>
                  <TraitList items={contract.adaptationFocus.hooks} />
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-medium text-foreground">Conflicts that keep the story moving</h3>
                  <TraitList items={contract.adaptationFocus.conflictLoops} />
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-medium text-foreground">Payoffs and rewards</h3>
                  <TraitList items={contract.adaptationFocus.payoffRhythm} />
                </div>
              </div>
            </PlanDetails>
          ) : null}
          <p className="pt-2 text-xs leading-5 text-muted-foreground">Source version v{contract.documentVersionNumber} · {title}</p>
        </div>
      ) : null}
    </section>
  );
}
