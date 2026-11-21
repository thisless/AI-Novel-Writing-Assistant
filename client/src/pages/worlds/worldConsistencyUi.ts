import type { WorldConsistencyIssue, WorldConsistencyReport } from "@ai-novel/shared/types/world";

const ISSUE_CODE_LABELS: Record<string, string> = {
  THEMATIC_INCOHERENCE: "Thematic framework mismatch",
  REDUNDANT_AXIOM_APPLICATION: "Redundant use of world axioms",
  AXIOM_VIOLATION: "World rule conflict",
  GENRE_MISMATCH: "Genre signal conflict",
  AXIOM_MAGIC_CONFLICT: "Conflict between world rules and power system",
  TECH_ERA_MISMATCH: "Mixed technology eras",
  CONFLICT_WEAK: "Core conflict is underdeveloped",
  BASELINE_PASS: "Rule check passed",
};

const ISSUE_MESSAGE_LABELS: Record<string, string> = {
  THEMATIC_INCOHERENCE: "Retrieved material introduced a thematic framework that conflicts with the core worldbuilding.",
  REDUNDANT_AXIOM_APPLICATION: "The new material repeats existing world rules without adding an effective constraint.",
  AXIOM_VIOLATION: "The world name or a core concept conflicts with existing rules or background details.",
  GENRE_MISMATCH: "The genre signals conflict with the constraints in the world handbook.",
  AXIOM_MAGIC_CONFLICT: "The world rules conflict with the power system.",
  TECH_ERA_MISMATCH: "The technology spans mixed eras without enough explanation.",
  CONFLICT_WEAK: "The core conflict is too underdeveloped to support the story.",
  BASELINE_PASS: "No obvious hard conflicts were found in the rules.",
};

const ISSUE_DETAIL_LABELS: Record<string, string> = {
  THEMATIC_INCOHERENCE: "Supporting context introduced a theme that the original worldbuilding did not establish, which may shift the world's central focus.",
  REDUNDANT_AXIOM_APPLICATION: "The added material mostly repeats existing rules. Remove the repetition and keep only genuinely new constraints.",
  AXIOM_VIOLATION: "The naming, genre promise, or core concepts conflict with the world's established rules. Align them with the main premise.",
  GENRE_MISMATCH: "The naming or keywords suggest a different genre than the style and rules described in the world handbook.",
  AXIOM_MAGIC_CONFLICT: "The world rules restrict supernatural or magical elements, but the power system or related text introduces them again.",
  TECH_ERA_MISMATCH: "The technology description combines elements from different eras without explaining their origins, limits, or transition.",
  CONFLICT_WEAK: "Clarify the opposing sides, triggering event, escalation path, and cost of failure to strengthen the world's central conflict.",
};

const FIELD_LABELS: Record<string, string> = {
  description: "World overview",
  background: "Background",
  geography: "Geography",
  cultures: "Culture and customs",
  magicSystem: "Power system",
  politics: "Political structure",
  races: "Species",
  religions: "Religion and beliefs",
  technology: "Technology system",
  conflicts: "Core conflicts",
  history: "History",
  economy: "Economy",
  factions: "Faction relationships",
};

function hasChinese(text: string): boolean {
  return /[\u4E00-\u9FFF]/.test(text);
}

function localizeSummary(summary: string, status: WorldConsistencyReport["status"], issues: WorldConsistencyIssue[]): string {
  if (hasChinese(summary)) {
    return summary;
  }
  if (/Consistency check passed/i.test(summary)) {
    return "World handbook check passed with no obvious hard conflicts.";
  }
  const errorCount = issues.filter((item) => item.severity === "error").length;
  const warnCount = issues.filter((item) => item.severity === "warn").length;
  if (status === "error") {
    return `Found ${errorCount} critical conflicts and ${warnCount} warnings.`;
  }
  if (status === "warn") {
    return `Found ${warnCount} warnings. Further revisions are recommended.`;
  }
  return "World handbook check complete.";
}

export function parseConsistencyReport(raw: string | null | undefined, issues: WorldConsistencyIssue[]): WorldConsistencyReport | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<WorldConsistencyReport>;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const status = parsed.status === "error" || parsed.status === "warn" || parsed.status === "pass"
      ? parsed.status
      : "pass";
    return {
      worldId: typeof parsed.worldId === "string" ? parsed.worldId : "",
      score: typeof parsed.score === "number" ? parsed.score : 0,
      summary: localizeSummary(typeof parsed.summary === "string" ? parsed.summary : "", status, issues),
      status,
      generatedAt: typeof parsed.generatedAt === "string" ? parsed.generatedAt : undefined,
      issues,
    };
  } catch {
    return null;
  }
}

export function localizeConsistencySeverity(severity: WorldConsistencyIssue["severity"]): string {
  switch (severity) {
    case "error":
      return "Critical conflict";
    case "warn":
      return "Warning";
    case "pass":
      return "Passed";
    default:
      return severity;
  }
}

export function localizeConsistencyStatus(status: WorldConsistencyIssue["status"] | WorldConsistencyReport["status"]): string {
  switch (status) {
    case "open":
      return "Open";
    case "resolved":
      return "Resolved";
    case "ignored":
      return "Ignored";
    case "error":
      return "Critical conflicts found";
    case "warn":
      return "Warnings found";
    case "pass":
      return "Check passed";
    default:
      return status;
  }
}

export function localizeConsistencySource(source: WorldConsistencyIssue["source"]): string {
  return source === "llm" ? "AI review" : "Rule check";
}

export function localizeConsistencyField(targetField?: string | null): string {
  if (!targetField) {
    return "Not specified";
  }
  return FIELD_LABELS[targetField] ?? targetField;
}

export function localizeConsistencyIssueTitle(code: string): string {
  return ISSUE_CODE_LABELS[code] ?? code;
}

export function localizeConsistencyIssueMessage(issue: WorldConsistencyIssue): string {
  if (hasChinese(issue.message)) {
    return issue.message;
  }
  return ISSUE_MESSAGE_LABELS[issue.code]
    ?? `Consistency risk in ${localizeConsistencyField(issue.targetField)}.`;
}

export function localizeConsistencyIssueDetail(issue: WorldConsistencyIssue): string | null {
  if (issue.detail && hasChinese(issue.detail)) {
    return issue.detail;
  }
  if (ISSUE_DETAIL_LABELS[issue.code]) {
    return ISSUE_DETAIL_LABELS[issue.code];
  }
  if (issue.detail) {
    return `The system detected an issue related to ${localizeConsistencyField(issue.targetField)}. Review it in the context of the world handbook.`;
  }
  return null;
}
