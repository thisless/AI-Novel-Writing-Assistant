import type {
  BookAnalysisDetail,
  BookAnalysisSection,
  BookAnalysisStatus,
} from "@ai-novel/shared/types/bookAnalysis";
import { isBookAnalysisBudgetExceeded } from "./bookAnalysis.utils.ts";

export type BookAnalysisWorkspaceTone = "neutral" | "info" | "success" | "warning" | "danger";

export type BookAnalysisPrimaryAction =
  | "create"
  | "select"
  | "view_results"
  | "resume_budget"
  | "rebuild"
  | "copy";

export interface BookAnalysisSectionSummary {
  total: number;
  expected: number;
  frozen: number;
  unselected: number;
  frozenReadable: number;
  readable: number;
  readableExpected: number;
  missingExpected: number;
  failedExpected: number;
  succeeded: number;
  running: number;
  failed: number;
}

export interface BookAnalysisNextAction {
  tone: BookAnalysisWorkspaceTone;
  title: string;
  description: string;
  action: BookAnalysisPrimaryAction | null;
  actionLabel?: string;
}

function hasStructuredContent(value: Record<string, unknown> | null | undefined): boolean {
  return Boolean(value && Object.keys(value).length > 0);
}

export function isReadableBookAnalysisSection(section: BookAnalysisSection): boolean {
  return Boolean(
    section.editedContent?.trim()
      || section.aiContent?.trim()
      || hasStructuredContent(section.structuredData),
  );
}

export function isUnselectedBookAnalysisSection(section: BookAnalysisSection): boolean {
  return section.frozen && !isReadableBookAnalysisSection(section);
}

export function summarizeBookAnalysisSections(
  analysis: Pick<BookAnalysisDetail, "sections"> | null | undefined,
): BookAnalysisSectionSummary {
  const summary: BookAnalysisSectionSummary = {
    total: 0,
    expected: 0,
    frozen: 0,
    unselected: 0,
    frozenReadable: 0,
    readable: 0,
    readableExpected: 0,
    missingExpected: 0,
    failedExpected: 0,
    succeeded: 0,
    running: 0,
    failed: 0,
  };
  for (const section of analysis?.sections ?? []) {
    summary.total += 1;
    if (section.frozen) {
      summary.frozen += 1;
    } else {
      summary.expected += 1;
    }
    const readable = isReadableBookAnalysisSection(section);
    if (section.frozen) {
      if (readable) {
        summary.frozenReadable += 1;
      } else {
        summary.unselected += 1;
      }
    }
    if (readable) {
      summary.readable += 1;
    }
    if (!section.frozen && readable) {
      summary.readableExpected += 1;
    }
    if (!section.frozen && !readable) {
      summary.missingExpected += 1;
    }
    if (section.status === "succeeded") {
      summary.succeeded += 1;
    } else if (section.status === "running") {
      summary.running += 1;
    } else if (section.status === "failed") {
      summary.failed += 1;
      if (!section.frozen) {
        summary.failedExpected += 1;
      }
    }
  }
  return summary;
}

export function getPreferredBookAnalysisSection(
  sections: BookAnalysisSection[],
): BookAnalysisSection | null {
  return sections.find(isReadableBookAnalysisSection)
    ?? sections.find((section) => section.status === "succeeded")
    ?? sections[0]
    ?? null;
}

function describeMissingExpectedSections(sections: BookAnalysisSectionSummary): string {
  return sections.missingExpected > 0
    ? `${sections.missingExpected} planned sections still have no readable results. `
    : "No planned sections are missing. ";
}

export function resolveBookAnalysisNextAction(input: {
  analysis?: BookAnalysisDetail | null;
  analysesCount: number;
  status?: BookAnalysisStatus | null;
}): BookAnalysisNextAction {
  const analysis = input.analysis ?? null;
  if (!analysis) {
    if (input.analysesCount > 0) {
      return {
        tone: "info",
        title: "Select an analysis",
        description: "Select an entry from the analysis list to see its source, generation stage, and readable results.",
        action: "select",
      };
    }
    return {
      tone: "info",
      title: "Create your first analysis",
      description: "Choose a knowledge document and analysis range. AI will organize the results into readable, referenceable sections.",
      action: "create",
      actionLabel: "New analysis",
    };
  }

  const status = input.status ?? analysis.status;
  const sections = summarizeBookAnalysisSections(analysis);
  if (status === "queued" || status === "running") {
    const hasReadableResults = sections.readable > 0;
    return {
      tone: "info",
      title: status === "queued" ? "Analysis queued" : "Analysis in progress",
      description: hasReadableResults
        ? `${Math.round(analysis.progress * 100)}% complete. ${sections.readable} sections are ready to read; the remaining planned sections are still generating.`
        : `${Math.round(analysis.progress * 100)}% complete. Finished sections are saved and will be available under “Analysis results” when ready.`,
      action: hasReadableResults ? "view_results" : null,
      actionLabel: hasReadableResults ? "View available results" : undefined,
    };
  }

  if ((status === "failed" || status === "cancelled") && isBookAnalysisBudgetExceeded(analysis.lastError)) {
    return {
      tone: "warning",
      title: "Increase the budget to resume",
      description: `${sections.readable} readable sections will be kept. ${describeMissingExpectedSections(sections)}Resuming with a higher budget processes only sections that haven't succeeded.`,
      action: "resume_budget",
      actionLabel: "Increase budget and resume",
    };
  }

  if (status === "succeeded") {
    if (sections.readable === 0) {
      return {
        tone: "danger",
        title: "Task finished, but there are no results to display",
        description: "Your source document is unchanged. Regenerate the analysis or open Task Center to review this task's details.",
        action: "rebuild",
        actionLabel: "Regenerate analysis",
      };
    }
    if (sections.missingExpected > 0) {
      return {
        tone: "warning",
        title: "Review the available results",
        description: `${sections.readableExpected}/${sections.expected} planned sections are readable. Regenerate to fill in the remaining ${sections.missingExpected} sections.`,
        action: "view_results",
        actionLabel: "View available results",
      };
    }
    if (sections.failedExpected > 0) {
      return {
        tone: "warning",
        title: "Results are available; some sections need review",
        description: `All ${sections.readableExpected}/${sections.expected} planned sections have readable content, but ${sections.failedExpected} sections failed during their latest generation. Review the saved content before deciding whether to regenerate.`,
        action: "view_results",
        actionLabel: "View available results",
      };
    }
    return {
      tone: "success",
      title: "Analysis results are ready",
      description: `${sections.readable} sections are ready. Review the evidence, build character profiles, or publish the results to a novel's knowledge base.`,
      action: "view_results",
      actionLabel: "View analysis results",
    };
  }

  if (status === "failed" || status === "cancelled") {
    if (sections.readable > 0) {
      return {
        tone: "warning",
        title: "Analysis stopped; existing results are still available",
        description: `${sections.readable} readable sections were kept. ${describeMissingExpectedSections(sections)}Review the available results before deciding whether to regenerate.`,
        action: "view_results",
        actionLabel: "View available results",
      };
    }
    return {
      tone: "danger",
      title: "Analysis needs to be regenerated",
      description: analysis.lastError?.trim() || "This analysis produced no readable results. Your source document is unchanged.",
      action: "rebuild",
      actionLabel: "Regenerate analysis",
    };
  }

  if (status === "archived") {
    return {
      tone: "neutral",
      title: sections.readable > 0 ? "View archived results" : "Copy archived analysis to continue",
      description: sections.readable > 0
        ? "Archived analyses are read-only. Existing results, evidence, and character profiles are still available."
        : "This archived analysis has no readable results. Copy it as a new analysis to regenerate.",
      action: sections.readable > 0 ? "view_results" : "copy",
      actionLabel: sections.readable > 0 ? "View archived results" : "Copy as new analysis",
    };
  }

  return {
    tone: "info",
    title: "Start generating analysis results",
    description: "AI will analyze plot structure, characters, worldbuilding, and style within the selected range. Completed sections are saved.",
    action: "rebuild",
    actionLabel: "Start analysis",
  };
}
