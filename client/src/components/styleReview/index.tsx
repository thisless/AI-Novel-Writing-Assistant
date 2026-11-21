import { isStyleIssueRewritable, type StyleDetectionReport, type StyleRewriteGuard } from "@ai-novel/shared/types/styleEngine";

const layerLabels = { surface: "Sentence-level expression", discourse: "Paragraph flow", narrative: "Narrative suggestions" };

export function StyleRiskReport({ report }: { report: StyleDetectionReport }) {
  return <section aria-label="Style review results" className="space-y-4 text-sm">
    <div className="space-y-1">
      <div className="font-medium text-foreground">Expression risk score: {report.riskScore}</div>
      <p className="leading-6 text-muted-foreground">{report.summary}</p>
    </div>
    {report.violations.length ? <div className="divide-y divide-border/40">
      {report.violations.map((issue, index) => <article key={`${issue.ruleId}-${index}`} className="space-y-2 py-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h4 className="font-medium text-foreground">{issue.ruleName}</h4>
          <span className="text-xs text-muted-foreground">{issue.layer ? layerLabels[issue.layer] : "Style note"} · {isStyleIssueRewritable(issue) ? "Can be revised locally" : "Suggestion only"}</span>
        </div>
        <p className="leading-6 text-muted-foreground">{issue.reason}</p>
        <blockquote className="whitespace-pre-wrap rounded-md bg-muted/30 px-3 py-2 leading-6 text-foreground">{issue.excerpt}</blockquote>
        <p className="leading-6 text-muted-foreground">Suggestion: {issue.suggestion}</p>
        {issue.layer === "narrative" ? <p className="text-xs leading-5 text-muted-foreground">Ask AI to propose an edit first, then confirm before changing the plot.</p> : null}
      </article>)}
    </div> : <p className="text-muted-foreground">No expression issues to revise. You can keep the original draft.</p>}
  </section>;
}

export function StyleRewriteProtection({ guard, retainedOriginal }: { guard?: StyleRewriteGuard; retainedOriginal?: boolean }) {
  const blocked = guard?.checks.filter(check => check.status === "blocked") ?? [];
  return <div role="status" className={`space-y-1 rounded-md px-3 py-2 text-sm leading-6 ${blocked.length ? "bg-amber-500/10 text-foreground" : "bg-muted/30 text-muted-foreground"}`}>
    <p className="font-medium">{retainedOriginal ? "Original kept" : "Local revision preview"}</p>
    {blocked.map(check => <p key={check.code}>{check.reason}</p>)}
    {!blocked.length ? <p>{retainedOriginal ? "No safe expression replacements were needed; the original text is unchanged." : "Compare the character's voice, actions, and information, then apply the changes you want."}</p> : null}
    {guard?.checks.some(check => check.code === "semantic_facts" && check.status === "not_checked") && !retainedOriginal
      ? <p className="text-xs">Review the preview against the characters and details in this book.</p> : null}
  </div>;
}
