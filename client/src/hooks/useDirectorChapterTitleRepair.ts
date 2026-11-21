import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UnifiedTaskDetail } from "@ai-novel/shared/types/task";
import { useNavigate } from "react-router-dom";
import { repairNovelWorkflowChapterTitles } from "@/api/novelWorkflow";
import { queryKeys } from "@/api/queryKeys";
import { toast } from "@/components/ui/toast";
import { resolveChapterTitleWarning } from "@/lib/directorTaskNotice";

interface DirectorChapterTitleRepairOptions {
  navigateOnSuccess?: boolean;
  onAfterStart?: (input: {
    task: UnifiedTaskDetail;
    warning: NonNullable<ReturnType<typeof resolveChapterTitleWarning>>;
  }) => void | Promise<void>;
}

export function useDirectorChapterTitleRepair(options: DirectorChapterTitleRepairOptions = {}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (task: UnifiedTaskDetail) => {
      const warning = resolveChapterTitleWarning(task);
      if (!warning) {
        throw new Error("The current task has no chapter-title alert that can be fixed with AI.");
      }
      const response = await repairNovelWorkflowChapterTitles(task.id, {
        volumeId: warning.volumeId ?? undefined,
      });
      return {
        response,
        task,
        warning,
      };
    },
    onSuccess: async ({ task, warning }) => {
      const novelId = task.sourceResource?.type === "novel"
        ? task.sourceResource.id
        : null;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(task.kind, task.id) }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        novelId ? queryClient.invalidateQueries({ queryKey: queryKeys.novels.autoDirectorTask(novelId) }) : Promise.resolve(),
        novelId ? queryClient.invalidateQueries({ queryKey: queryKeys.novels.detail(novelId) }) : Promise.resolve(),
      ]);
      if (options.navigateOnSuccess !== false && warning.route) {
        navigate(warning.route);
      }
      if (options.onAfterStart) {
        await Promise.resolve(options.onAfterStart({
          task,
          warning,
        })).catch(() => {});
      }
      toast.success("AI chapter-title repair started. The system is rebuilding the current volume's chapter breakdown.");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "AI chapter-title repair failed.";
      toast.error(message);
    },
  });

  return {
    startRepair: (task: UnifiedTaskDetail | null | undefined) => {
      if (!task) {
        toast.error("There is no Auto Director task available for repair.");
        return;
      }
      mutation.mutate(task);
    },
    isPending: mutation.isPending,
    pendingTaskId: mutation.variables?.id ?? "",
  };
}
