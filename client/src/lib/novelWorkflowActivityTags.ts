const WORKFLOW_ACTIVITY_TAGS = [
  { source: "资产回灌中", label: "Restoring assets" },
  { source: "角色成长中", label: "Developing characters" },
  { source: "状态同步中", label: "Syncing status" },
  { source: "资源账本同步中", label: "Syncing resource ledger" },
  { source: "伏笔账本同步中", label: "Syncing foreshadowing ledger" },
  { source: "账本校准中", label: "Reconciling ledgers" },
  { source: "伏笔回填中", label: "Backfilling foreshadowing" },
] as const;

export function extractWorkflowActivityTags(value: string | null | undefined): string[] {
  const source = value?.trim() ?? "";
  if (!source) {
    return [];
  }
  return WORKFLOW_ACTIVITY_TAGS
    .filter((tag) => source.includes(tag.source))
    .map((tag) => tag.label);
}
