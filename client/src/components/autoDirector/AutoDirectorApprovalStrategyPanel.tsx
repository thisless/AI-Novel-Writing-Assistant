import type {
  DirectorAutoApprovalGroup,
  DirectorAutoApprovalPoint,
} from "@ai-novel/shared/types/autoDirectorApproval";
import AutoDirectorApprovalPointMultiSelect, {
  summarizeDirectorAutoApprovalPoints,
} from "./AutoDirectorApprovalPointMultiSelect";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

interface AutoDirectorApprovalStrategyPanelProps {
  enabled: boolean;
  approvalPointCodes: string[];
  groups?: DirectorAutoApprovalGroup[];
  approvalPoints?: DirectorAutoApprovalPoint[];
  onEnabledChange: (enabled: boolean) => void;
  onApprovalPointCodesChange: (next: string[]) => void;
}

export default function AutoDirectorApprovalStrategyPanel({
  enabled,
  approvalPointCodes,
  groups,
  approvalPoints,
  onEnabledChange,
  onApprovalPointCodesChange,
}: AutoDirectorApprovalStrategyPanelProps) {
  return (
    <div className="mt-3 min-w-0 rounded-md border border-primary/15 bg-primary/5 p-3">
      <div className="text-xs font-medium text-foreground">Automation mode</div>
      <div className={AUTO_DIRECTOR_MOBILE_CLASSES.approvalStrategyGrid}>
        <button
          type="button"
          className={`rounded-xl border px-3 py-3 text-left transition ${
            enabled ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-background hover:border-primary/40"
          }`}
          onClick={() => onEnabledChange(true)}
        >
          <div className="text-sm font-medium text-foreground">AI autopilot</div>
          <div className={`mt-1 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            Runs automatically within the target scope. Stops only if the model is unavailable, the service fails, protected content is at risk, or an unrecoverable issue occurs.
          </div>
        </button>
        <button
          type="button"
          className={`rounded-xl border px-3 py-3 text-left transition ${
            !enabled ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-background hover:border-primary/40"
          }`}
          onClick={() => onEnabledChange(false)}
        >
          <div className="text-sm font-medium text-foreground">AI copilot with approvals</div>
          <div className={`mt-1 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            Approves low-risk steps according to your advanced approval settings and leaves the rest for your review.
          </div>
        </button>
      </div>

      <div className={`mt-3 rounded-md border bg-background/80 p-3 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
        {enabled
          ? "Autopilot: The system approves planning, chapter execution, quality repair, and necessary replanning within the target scope."
          : `Copilot approval scope: ${summarizeDirectorAutoApprovalPoints(approvalPointCodes)}. Other approval points will wait for your confirmation.`}
      </div>

      {!enabled ? (
        <details className="mt-3 rounded-md border bg-background">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-foreground">
            Advanced approvals
          </summary>
          <div className="border-t p-3">
            <AutoDirectorApprovalPointMultiSelect
              value={approvalPointCodes}
              onChange={onApprovalPointCodesChange}
              groups={groups}
              approvalPoints={approvalPoints}
              compact
            />
          </div>
        </details>
      ) : null}
    </div>
  );
}
