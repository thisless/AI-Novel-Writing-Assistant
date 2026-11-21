import type { AutoDirectorFollowUpItem, AutoDirectorMutationActionCode } from "@ai-novel/shared/types/autoDirectorFollowUp";
import type { AutoDirectorFollowUpSection } from "@ai-novel/shared/types/autoDirectorValidation";
import { Button } from "@/components/ui/button";
import { TaskQueueActionRow } from "@/components/taskQueue";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

interface AutoDirectorFollowUpBatchBarProps {
  selectedItems: AutoDirectorFollowUpItem[];
  batchActionCode: AutoDirectorMutationActionCode | null;
  loading: boolean;
  onClear: () => void;
  onExecute: () => void | Promise<void>;
}

function formatBatchActionLabel(actionCode: AutoDirectorMutationActionCode | null): string {
  if (actionCode === "continue_auto_execution") {
    return "Continue low-risk tasks in bulk";
  }
  if (actionCode === "retry_with_task_model") {
    return "Retry failed tasks in bulk";
  }
  return "No shared bulk action for the selected items";
}

function getSelectedSection(items: AutoDirectorFollowUpItem[]): AutoDirectorFollowUpSection | null {
  const sections = Array.from(new Set(items.map((item) => item.section)));
  return sections.length === 1 ? sections[0] : null;
}

export function AutoDirectorFollowUpBatchBar({
  selectedItems,
  batchActionCode,
  loading,
  onClear,
  onExecute,
}: AutoDirectorFollowUpBatchBarProps) {
  if (selectedItems.length === 0) {
    return null;
  }
  const selectedSection = getSelectedSection(selectedItems);
  const consequence = batchActionCode === "continue_auto_execution"
    ? "Sends a separate continue command to each selected director task without merging task states."
    : batchActionCode === "retry_with_task_model"
      ? "Retries each task with its saved model while preserving its director task identity."
      : "No bulk action will run. Select tasks from the same section that share an action.";

  return (
    <div className={AUTO_DIRECTOR_MOBILE_CLASSES.followUpBatchBar}>
      <TaskQueueActionRow
        title={`${selectedItems.length} selected · ${selectedSection === "pending" || selectedSection === "exception" ? formatBatchActionLabel(batchActionCode) : "Bulk actions are unavailable in this section"}`}
        consequence={consequence}
        tone={selectedSection === "exception" ? "danger" : "info"}
        action={(
          <div className="grid grid-cols-2 gap-2 md:flex">
          <Button variant="outline" size="sm" className="w-full md:w-auto" onClick={onClear} disabled={loading}>
            Clear
          </Button>
          <Button size="sm" className="w-full md:w-auto" onClick={() => void onExecute()} disabled={!batchActionCode || loading}>
            Run bulk action
          </Button>
          </div>
        )}
      />
    </div>
  );
}
