import { isStyleIssueRewritable, type AntiAiRule, type StyleDetectionReport, type StyleRewriteGuard } from "@ai-novel/shared/types/styleEngine";
import { StyleRiskReport, StyleRewriteProtection } from "@/components/styleReview";
import { FlaskConical, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AntiAiRuleEffectTestCardProps {
  content: string;
  report: StyleDetectionReport | null;
  rewritePreview: string;
  rewriteGuard?: StyleRewriteGuard;
  detectionPending: boolean;
  rewritePending: boolean;
  testRuleCount: number;
  scopeReady: boolean;
  previewRules: AntiAiRule[];
  onContentChange: (content: string) => void;
  onDetect: () => void;
  onRewrite: () => void;
  onRemovePreviewRule: (ruleId: string) => void;
  onClearPreviewRules: () => void;
}

export default function AntiAiRuleEffectTestCard(props: AntiAiRuleEffectTestCardProps) {
  const busy = props.detectionPending || props.rewritePending;
  const canTest = props.scopeReady && !busy && Boolean(props.content.trim());
  const hasRewritableIssue = !props.report || props.report.violations.some((issue) => isStyleIssueRewritable(issue));

  return (
    <section aria-labelledby="anti-ai-test-title" className="space-y-4 p-5 sm:p-6" aria-busy={busy}>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <h2 id="anti-ai-test-title" className="flex items-center gap-2 text-base font-semibold">
            <FlaskConical aria-hidden="true" className="h-4 w-4 text-muted-foreground" />Rule testing
          </h2>
          <span className="text-xs tabular-nums text-muted-foreground">{props.scopeReady ? `${props.testRuleCount} rules` : "Preparing rules…"}</span>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">Paste a complete scene to review style warnings and preview a focused revision.</p>
      </div>

      {props.previewRules.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Added for testing · {props.previewRules.length}</span>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={props.onClearPreviewRules}>Clear</Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {props.previewRules.map((rule) => (
              <button key={rule.id} type="button"
                className="inline-flex max-w-full items-center gap-1 rounded-md bg-primary/10 px-2 py-1.5 text-xs text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => props.onRemovePreviewRule(rule.id)} aria-label={"Remove from test: " + rule.name} title="Remove from test">
                <span className="truncate">{rule.name}</span><X aria-hidden="true" className="h-3 w-3 shrink-0" />
              </button>
            ))}
          </div>
          <p className="text-xs leading-5 text-muted-foreground">Temporary and active rules are tested together; each rule is counted once.</p>
        </div>
      ) : (
        <p className="text-xs leading-5 text-muted-foreground">Add rules from the list temporarily to compare their effects.</p>
      )}

      <div className="space-y-2">
        <label htmlFor="anti-ai-test-content" className="block text-sm font-medium">Text to test</label>
        <textarea id="anti-ai-test-content"
          className="min-h-[200px] w-full resize-y rounded-lg border border-input bg-background p-3 text-sm leading-7 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={props.content} placeholder="Paste a passage, such as character dialogue or a scene…"
          onChange={(event) => props.onContentChange(event.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={props.onDetect} disabled={!canTest} className="flex-1">
          {props.detectionPending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
          {props.detectionPending ? "Checking…" : "Check style"}
        </Button>
        <Button type="button" variant="secondary" onClick={props.onRewrite} disabled={!canTest || !hasRewritableIssue} className="flex-1">
          {props.rewritePending ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
          {props.rewritePending ? "Revising…" : "Preview focused revision"}
        </Button>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">Tests and previews are not saved to the novel. Review character voices and story details before applying.</p>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {props.detectionPending ? "Checking style" : props.rewritePending ? "Generating revision preview" : props.report ? "Style check complete. Results are available below." : ""}
      </div>
      {props.report ? (
        <div className="space-y-3 border-t border-border/60 pt-4">
          <h3 className="text-sm font-semibold">Check results</h3>
          <StyleRiskReport report={props.report} />
        </div>
      ) : null}
      {props.rewritePreview ? (
        <div className="space-y-3 border-t border-border/60 pt-4">
          <h3 className="text-sm font-semibold">Focused revision preview</h3>
          <StyleRewriteProtection guard={props.rewriteGuard} retainedOriginal={props.rewritePreview === props.content} />
          <div className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/30 p-4 text-sm leading-7">
            {props.rewritePreview}
          </div>
        </div>
      ) : null}
    </section>
  );
}
