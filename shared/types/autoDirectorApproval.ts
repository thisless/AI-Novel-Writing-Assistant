import type { NovelWorkflowCheckpoint } from "./novelWorkflow";
import { resolveWorkflowApprovalPointForCheckpoint } from "./directorWorkflowStepCatalog.js";

export const DIRECTOR_AUTO_APPROVAL_GROUPS = [
  {
    id: "low_risk_continue",
    label: "Continue low-risk steps",
    description: "Proceed with the next prepared step without clearing assets.",
  },
  {
    id: "planning_review",
    label: "Planning reviews",
    description: "Proceed after planning assets such as character setup, volume strategy, and chapter pacing are approved.",
  },
  {
    id: "chapter_execution",
    label: "Manuscript execution",
    description: "Proceed to chapter execution for a chapter or volume range.",
  },
  {
    id: "repair_replan",
    label: "Revision / Replanning",
    description: "Continue after low-risk revisions; manual confirmation is recommended for replanning and large-scale rework.",
  },
  {
    id: "rewrite_cleanup",
    label: "Rewrite and cleanup",
    description: "Regeneration or rewriting clears assets in the target range, so authorize with care.",
  },
] as const;

export type DirectorAutoApprovalGroupId = typeof DIRECTOR_AUTO_APPROVAL_GROUPS[number]["id"];

export const DIRECTOR_AUTO_APPROVAL_POINTS = [
  {
    code: "candidate_direction_confirmed",
    groupId: "low_risk_continue",
    label: "Continue after confirming the proposed direction",
    description: "After confirming the book-level direction, allow AI to continue setting up the book and enter the main workflow.",
    riskLevel: "low",
  },
  {
    code: "character_setup_ready",
    groupId: "planning_review",
    label: "Continue after character setup is approved",
    description: "After applying the cast, allow AI to continue generating the volume strategy.",
    riskLevel: "low",
  },
  {
    code: "volume_strategy_ready",
    groupId: "planning_review",
    label: "Continue after volume strategy is approved",
    description: "After the volume strategy and structure are complete, allow AI to continue with chapter pacing.",
    riskLevel: "low",
  },
  {
    code: "structured_outline_ready",
    groupId: "planning_review",
    label: "Continue after chapter planning is complete",
    description: "After chapters are planned for the target range and execution resources are ready, allow AI to proceed to writing.",
    riskLevel: "low",
  },
  {
    code: "chapter_execution_continue",
    groupId: "chapter_execution",
    label: "Continue after a chapter batch completes",
    description: "After a chapter batch is complete, allow AI to continue with the remaining chapters.",
    riskLevel: "medium",
  },
  {
    code: "low_risk_quality_repair_continue",
    groupId: "repair_replan",
    label: "Continue after low-risk quality revisions",
    description: "When a quality revision is confirmed as low risk, allow AI to continue chapter execution.",
    riskLevel: "medium",
  },
  {
    code: "replan_continue",
    groupId: "repair_replan",
    label: "Continue after replanning",
    description: "Replanning changes the upcoming workflow, so manual review is recommended before authorizing it.",
    riskLevel: "high",
  },
  {
    code: "rewrite_cleanup_confirmed",
    groupId: "rewrite_cleanup",
    label: "Continue after confirming regeneration / rewrite",
    description: "After assets in the target range are cleared, allow AI to continue the rewrite workflow.",
    riskLevel: "high",
  },
] as const;

export type DirectorAutoApprovalPointCode = typeof DIRECTOR_AUTO_APPROVAL_POINTS[number]["code"];
export type DirectorAutoApprovalRiskLevel = typeof DIRECTOR_AUTO_APPROVAL_POINTS[number]["riskLevel"];

export const ALL_DIRECTOR_AUTO_APPROVAL_POINT_CODES: DirectorAutoApprovalPointCode[] = (
  DIRECTOR_AUTO_APPROVAL_POINTS.map((item) => item.code)
);

export interface DirectorAutoApprovalPoint {
  code: DirectorAutoApprovalPointCode;
  groupId: DirectorAutoApprovalGroupId;
  label: string;
  description: string;
  riskLevel: DirectorAutoApprovalRiskLevel;
}

export interface DirectorAutoApprovalGroup {
  id: DirectorAutoApprovalGroupId;
  label: string;
  description: string;
}

export interface DirectorAutoApprovalConfig {
  enabled: boolean;
  approvalPointCodes: DirectorAutoApprovalPointCode[];
}

export function buildFullDirectorAutoApprovalConfig(): DirectorAutoApprovalConfig {
  return {
    enabled: true,
    approvalPointCodes: [...ALL_DIRECTOR_AUTO_APPROVAL_POINT_CODES],
  };
}

export interface DirectorAutoApprovalPreferenceSettings {
  approvalPointCodes: DirectorAutoApprovalPointCode[];
  approvalPoints: DirectorAutoApprovalPoint[];
  groups: DirectorAutoApprovalGroup[];
}

export const DEFAULT_DIRECTOR_AUTO_APPROVAL_POINT_CODES: DirectorAutoApprovalPointCode[] = [
  "candidate_direction_confirmed",
  "character_setup_ready",
  "volume_strategy_ready",
  "structured_outline_ready",
];

const AUTO_APPROVAL_POINT_CODE_SET = new Set<string>(
  DIRECTOR_AUTO_APPROVAL_POINTS.map((item) => item.code),
);

export function isDirectorAutoApprovalPointCode(value: unknown): value is DirectorAutoApprovalPointCode {
  return typeof value === "string" && AUTO_APPROVAL_POINT_CODE_SET.has(value);
}

export function normalizeDirectorAutoApprovalPointCodes(
  values: readonly unknown[] | null | undefined,
  fallback: readonly DirectorAutoApprovalPointCode[] = DEFAULT_DIRECTOR_AUTO_APPROVAL_POINT_CODES,
): DirectorAutoApprovalPointCode[] {
  const source = Array.isArray(values) ? values : fallback;
  const result: DirectorAutoApprovalPointCode[] = [];
  for (const value of source) {
    if (!isDirectorAutoApprovalPointCode(value) || result.includes(value)) {
      continue;
    }
    result.push(value);
  }
  return result;
}

export function normalizeDirectorAutoApprovalConfig(input: unknown): DirectorAutoApprovalConfig {
  if (!input || typeof input !== "object") {
    return {
      enabled: false,
      approvalPointCodes: [...DEFAULT_DIRECTOR_AUTO_APPROVAL_POINT_CODES],
    };
  }
  const record = input as {
    enabled?: unknown;
    approvalPointCodes?: unknown;
  };
  return {
    enabled: record.enabled === true,
    approvalPointCodes: normalizeDirectorAutoApprovalPointCodes(
      Array.isArray(record.approvalPointCodes) ? record.approvalPointCodes : null,
    ),
  };
}

export function resolveDirectorAutoApprovalPointForCheckpoint(
  checkpointType: NovelWorkflowCheckpoint | string | null | undefined,
): DirectorAutoApprovalPointCode | null {
  if (!checkpointType || typeof checkpointType !== "string") {
    return null;
  }
  const pointCode = resolveWorkflowApprovalPointForCheckpoint(checkpointType);
  return isDirectorAutoApprovalPointCode(pointCode) ? pointCode : null;
}

export function shouldAutoApproveDirectorCheckpoint(
  config: DirectorAutoApprovalConfig | null | undefined,
  checkpointType: NovelWorkflowCheckpoint | string | null | undefined,
): boolean {
  if (!config?.enabled) {
    return false;
  }
  const pointCode = resolveDirectorAutoApprovalPointForCheckpoint(checkpointType);
  return Boolean(pointCode && config.approvalPointCodes.includes(pointCode));
}

export function shouldAutoApproveDirectorApprovalPoint(
  config: DirectorAutoApprovalConfig | null | undefined,
  pointCode: DirectorAutoApprovalPointCode,
): boolean {
  return Boolean(config?.enabled && config.approvalPointCodes.includes(pointCode));
}
