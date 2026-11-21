import { isStyleIssueRewritable, type StyleDetectionReport, type StyleProfile, type StyleRewriteGuard } from "@ai-novel/shared/types/styleEngine";
import { StyleRiskReport, StyleRewriteProtection } from "@/components/styleReview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WritingFormulaCleanPanelProps {
  selectedProfile: StyleProfile | null;
  detectInput: string;
  detectionReport: StyleDetectionReport | null;
  detectionPending: boolean;
  rewritePending: boolean;
  rewritePreview: string;
  rewriteGuard?: StyleRewriteGuard;
  onDetectInputChange: (value: string) => void;
  onDetect: () => void;
  onRewrite: () => void;
}

export default function WritingFormulaCleanPanel(props: WritingFormulaCleanPanelProps) {
  const {
    selectedProfile,
    detectInput,
    detectionReport,
    detectionPending,
    rewritePending,
    rewritePreview,
    onDetectInputChange,
    onDetect,
    onRewrite,
  } = props;

  const antiAiRuleNames = selectedProfile?.antiAiRules.map((rule) => rule.name) ?? [];

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle>Reduce AI-like writing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {selectedProfile ? (
          <div className="rounded-2xl bg-muted/30 px-4 py-3 text-sm leading-7 text-muted-foreground">
            Checking and revising prose using “{selectedProfile.name}.” This only addresses AI-like writing in the text and does not change the style profile itself.
          </div>
        ) : (
          <div className="rounded-2xl bg-muted/30 px-4 py-3 text-sm leading-7 text-muted-foreground">
            Select a style profile from the list before checking the prose.
          </div>
        )}

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <div className="text-base font-semibold text-slate-950">Active anti-AI constraints</div>
            <div className="text-sm leading-6 text-slate-500">
              If this style has anti-AI rules, the checks and revisions will prioritize them.
            </div>
          </div>
          {antiAiRuleNames.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {antiAiRuleNames.map((ruleName) => (
                <div key={`${selectedProfile?.id}-${ruleName}`} className="rounded-full bg-muted/30 px-3 py-1 text-sm text-muted-foreground">
                  {ruleName}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-3 text-sm leading-6 text-muted-foreground">
              No specific anti-AI rules are bound to this style. Checks will rely more on general risk assessments and may not match your expectations.
            </div>
          )}
        </div>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <div className="text-base font-semibold text-slate-950">Check prose</div>
            <div className="text-sm leading-6 text-slate-500">
              Paste the prose you want to check. A complete scene makes it easier to identify issues with narration, dialogue, and over-explanation.
            </div>
          </div>

          <textarea
            data-writing-formula-detect-input
            autoFocus
            className="min-h-[220px] w-full rounded-md border p-3 text-sm"
            placeholder="Paste prose to check"
            value={detectInput}
            onChange={(event) => onDetectInputChange(event.target.value)}
          />

          <div className="flex flex-wrap gap-2">
            <Button onClick={onDetect} disabled={detectionPending || rewritePending || !selectedProfile || !detectInput.trim()}>
              Run check
            </Button>
            <Button variant="secondary" onClick={onRewrite} disabled={rewritePending || detectionPending || !selectedProfile || !detectInput.trim() || Boolean(detectionReport && !detectionReport.violations.some(issue => isStyleIssueRewritable(issue)))}>
              Preview focused revision
            </Button>
          </div>

          {detectionReport ? (
            <StyleRiskReport report={detectionReport} />
          ) : (
            <div className="py-3 text-sm leading-6 text-muted-foreground">
              Review style issues, supporting excerpts, and suggested changes.
            </div>
          )}

          {rewritePreview ? (
            <div className="space-y-2">
              <StyleRewriteProtection guard={props.rewriteGuard} retainedOriginal={rewritePreview === detectInput} />
              <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap rounded-xl bg-muted/20 p-4 text-sm">
                {rewritePreview}
              </pre>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
