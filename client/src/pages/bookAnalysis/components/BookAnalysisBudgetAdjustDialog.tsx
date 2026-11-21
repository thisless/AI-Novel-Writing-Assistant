import { useEffect, useMemo, useState } from "react";
import type { BookAnalysisDetail } from "@ai-novel/shared/types/bookAnalysis";
import { Button } from "@/components/ui/button";
import { AppDialogContent, Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type BudgetDialogMode = "adjust" | "resume";

const MIN_BUDGET_TOKENS = 1_000;
const MAX_BUDGET_TOKENS = 10_000_000;

function formatTokenCount(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "0";
  }
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(value)));
}

function normalizeBudgetInput(value: string, allowUnlimited: boolean): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return allowUnlimited ? null : Number.NaN;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return Number.NaN;
  }
  return Math.floor(parsed);
}

function buildRecommendedResumeBudget(analysis: BookAnalysisDetail): number {
  const usedTokens = analysis.usedTokens ?? 0;
  const succeededCount = analysis.sections.filter((section) => section.status === "succeeded").length;
  const remainingCount = analysis.sections.filter(
    (section) => !section.frozen && section.status !== "succeeded",
  ).length;
  const averageFinishedSectionCost = succeededCount > 0
    ? Math.ceil(usedTokens / succeededCount)
    : 25_000;
  const estimatedNeed = usedTokens + Math.max(1, remainingCount) * averageFinishedSectionCost * 1.2;
  return Math.min(
    MAX_BUDGET_TOKENS,
    Math.max(MIN_BUDGET_TOKENS, Math.ceil(estimatedNeed / 1_000) * 1_000),
  );
}

interface BookAnalysisBudgetAdjustDialogProps {
  open: boolean;
  mode: BudgetDialogMode;
  analysis: BookAnalysisDetail;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (budgetTokens: number | null) => Promise<void>;
}

export default function BookAnalysisBudgetAdjustDialog(props: BookAnalysisBudgetAdjustDialogProps) {
  const {
    open,
    mode,
    analysis,
    pending,
    onOpenChange,
    onSubmit,
  } = props;
  const [budgetInput, setBudgetInput] = useState("");
  const usedTokens = analysis.usedTokens ?? 0;
  const currentBudget = analysis.budgetTokens ?? null;
  const allowUnlimited = mode === "adjust";
  const parsedBudget = normalizeBudgetInput(budgetInput, allowUnlimited);
  const recommendedResumeBudget = useMemo(() => buildRecommendedResumeBudget(analysis), [analysis]);
  const retrySectionCount = analysis.sections.filter(
    (section) => !section.frozen && section.status !== "succeeded",
  ).length;
  const succeededSectionCount = analysis.sections.filter((section) => section.status === "succeeded").length;
  const frozenSectionCount = analysis.sections.filter((section) => section.frozen).length;
  const remainingTokens = typeof parsedBudget === "number" && Number.isFinite(parsedBudget)
    ? parsedBudget - usedTokens
    : null;
  const budgetIsFinite = typeof parsedBudget === "number" && Number.isFinite(parsedBudget);
  const hasValidBudget = parsedBudget === null || (
    budgetIsFinite &&
    parsedBudget >= MIN_BUDGET_TOKENS &&
    parsedBudget <= MAX_BUDGET_TOKENS
  );
  const canSubmit = hasValidBudget && (mode === "adjust" || budgetIsFinite) && !pending;

  useEffect(() => {
    if (!open) {
      return;
    }
    if (mode === "resume") {
      setBudgetInput(String(recommendedResumeBudget));
      return;
    }
    setBudgetInput(currentBudget ? String(currentBudget) : "");
  }, [currentBudget, mode, open, recommendedResumeBudget]);

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    await onSubmit(parsedBudget);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent
        title={mode === "resume" ? "Increase budget and resume" : "Adjust analysis budget"}
        description={mode === "resume"
          ? "Set a new budget limit for this analysis and continue processing unfinished sections."
          : "The usage total is preserved. Future sections will be checked against the updated budget limit."}
        className="max-w-xl"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
              {pending ? "Submitting…" : mode === "resume" ? "Increase budget and resume" : "Save changes"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {mode === "resume" ? (
            <div className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm leading-6 text-foreground">
              This will rerun {retrySectionCount} sections and keep {succeededSectionCount} successful sections
              {frozenSectionCount > 0 ? `. ${frozenSectionCount} frozen sections will also be excluded from this run` : ""}.
            </div>
          ) : null}

          <div className="grid gap-2 rounded-md border bg-muted/20 p-3 text-sm sm:grid-cols-3">
            <div>
              <div className="text-xs text-muted-foreground">Total usage</div>
              <div className="mt-1 font-mono tabular-nums">{formatTokenCount(usedTokens)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Budget limit</div>
              <div className="mt-1 font-mono tabular-nums">
                {currentBudget ? formatTokenCount(currentBudget) : "Unlimited"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Remaining after change</div>
              <div className="mt-1 font-mono tabular-nums">
                {parsedBudget === null
                  ? "Unlimited"
                  : remainingTokens === null
                    ? "-"
                    : formatTokenCount(remainingTokens)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="book-analysis-budget-input" className="text-sm font-medium">
                New budget limit
              </label>
              {mode === "resume" ? (
                <button
                  type="button"
                  className="text-xs text-primary underline-offset-4 hover:underline"
                  onClick={() => setBudgetInput(String(recommendedResumeBudget))}
                >
                  Use recommended value: {formatTokenCount(recommendedResumeBudget)}
                </button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="book-analysis-budget-input"
                type="number"
                min={MIN_BUDGET_TOKENS}
                max={MAX_BUDGET_TOKENS}
                step={1_000}
                value={budgetInput}
                onChange={(event) => setBudgetInput(event.target.value)}
                placeholder={allowUnlimited ? "Leave blank for unlimited" : String(recommendedResumeBudget)}
                className="text-right font-mono tabular-nums"
              />
              <span className="shrink-0 text-xs text-muted-foreground">tokens</span>
            </div>
            {!hasValidBudget ? (
              <div className="text-xs text-destructive">
                Enter a whole number between {formatTokenCount(MIN_BUDGET_TOKENS)} and {formatTokenCount(MAX_BUDGET_TOKENS)}.
              </div>
            ) : null}
            {mode === "adjust" && analysis.status === "running" ? (
              <div className="text-xs leading-5 text-muted-foreground">
                Lowering the budget won't stop the current section immediately. The new limit will be checked at the next section boundary.
              </div>
            ) : null}
            {budgetIsFinite && remainingTokens !== null && remainingTokens < 0 ? (
              <div className="text-xs leading-5 text-warning">
                The new budget is below your total usage. Generation will stop if you continue.
              </div>
            ) : null}
          </div>
        </div>
      </AppDialogContent>
    </Dialog>
  );
}
