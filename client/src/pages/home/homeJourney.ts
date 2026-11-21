import type { NovelAutoDirectorTaskSummary } from "@ai-novel/shared/types/novel";
import {
  resolveWorkflowDisplayStage,
  type WorkflowStepCatalogDisplayStage,
} from "@ai-novel/shared/types/directorWorkflowStepCatalog";

export interface HomeJourneyStage {
  id: string;
  label: string;
  status: "completed" | "current" | "upcoming";
}

const HOME_JOURNEY_GROUPS: readonly {
  id: string;
  label: string;
  stages: readonly WorkflowStepCatalogDisplayStage[];
}[] = [
  { id: "setup", label: "Project setup", stages: ["project_setup"] },
  { id: "story", label: "Story planning", stages: ["story_planning"] },
  { id: "world-cast", label: "World & characters", stages: ["world_setup", "character_setup"] },
  { id: "structure", label: "Volumes & chapters", stages: ["volume_strategy", "structured_outline"] },
  { id: "writing", label: "Chapter writing", stages: ["chapter_execution"] },
  { id: "quality", label: "Quality review", stages: ["quality_repair"] },
] as const;

export function buildHomeJourney(task: NovelAutoDirectorTaskSummary | null): {
  stages: HomeJourneyStage[];
  progressPercent: number;
} {
  const progressPercent = task
    ? Math.max(0, Math.min(100, Math.round(task.progress * 100)))
    : 0;
  const displayStage = resolveWorkflowDisplayStage({
    checkpointType: task?.checkpointType,
    taskStatus: task?.status,
    currentStage: task?.currentStage,
  });
  const currentIndex = Math.max(0, HOME_JOURNEY_GROUPS.findIndex((group) => group.stages.includes(displayStage)));
  const completed = task?.status === "succeeded" && progressPercent >= 100;

  return {
    progressPercent,
    stages: HOME_JOURNEY_GROUPS.map((stage, index) => ({
      id: stage.id,
      label: stage.label,
      status: completed || index < currentIndex
        ? "completed"
        : index === currentIndex
          ? "current"
          : "upcoming",
    })),
  };
}
