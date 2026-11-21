import type { TaskKind, TaskStatus } from "@ai-novel/shared/types/task";
import { Input } from "@/components/ui/input";
import type { TaskSortMode } from "../taskCenterUtils";
import SelectControl from "@/components/common/SelectControl";

interface TaskCenterFilterPanelProps {
  kind: TaskKind | "";
  status: TaskStatus | "";
  keyword: string;
  onlyAnomaly: boolean;
  sortMode: TaskSortMode;
  onKindChange: (value: TaskKind | "") => void;
  onStatusChange: (value: TaskStatus | "") => void;
  onKeywordChange: (value: string) => void;
  onOnlyAnomalyChange: (value: boolean) => void;
  onSortModeChange: (value: TaskSortMode) => void;
}

export default function TaskCenterFilterPanel({
  kind,
  status,
  keyword,
  onlyAnomaly,
  sortMode,
  onKindChange,
  onStatusChange,
  onKeywordChange,
  onOnlyAnomalyChange,
  onSortModeChange,
}: TaskCenterFilterPanelProps) {
  return (
    <section aria-label="Filter run history" className="task-filter-card rounded-2xl bg-muted/20 px-4 py-3">
      <div className="task-filter-controls grid min-w-0 grid-cols-3 gap-2 xl:grid-cols-[150px_150px_minmax(220px,1fr)_220px_auto] xl:items-center">
        <SelectControl
          aria-label="Filter by task type"
          className="task-filter-kind col-start-1 row-start-1 xl:col-auto xl:row-auto h-10 w-full rounded-xl border-border/45 bg-background px-3 text-sm"
          value={kind}
          onChange={(event) => onKindChange(event.target.value as TaskKind | "")}
        >
          <option value="">All types</option>
          <option value="book_analysis">Book analysis</option>
          <option value="novel_workflow">Novel writing</option>
          <option value="novel_pipeline">Novel pipeline</option>
          <option value="knowledge_document">Knowledge indexing</option>
          <option value="image_generation">Image generation</option>
          <option value="style_extraction">Style extraction</option>
          <option value="agent_run">Agent run</option>
        </SelectControl>
        <SelectControl
          aria-label="Filter by task status"
          className="task-filter-status col-start-2 row-start-1 xl:col-auto xl:row-auto h-10 w-full rounded-xl border-border/45 bg-background px-3 text-sm"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as TaskStatus | "")}
        >
          <option value="">All statuses</option>
          <option value="queued">Queued</option>
          <option value="running">Running</option>
          <option value="waiting_approval">Awaiting approval</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
          <option value="succeeded">Completed</option>
        </SelectControl>
        <label className={`task-filter-pill col-start-3 row-start-1 xl:col-start-5 xl:row-start-1 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-sm transition-colors ${
          onlyAnomaly ? "bg-destructive/10 text-destructive" : "bg-background text-muted-foreground hover:bg-muted"
        }`}>
          <input
            type="checkbox"
            className="sr-only"
            checked={onlyAnomaly}
            onChange={(event) => onOnlyAnomalyChange(event.target.checked)}
          />
          Needs attention only
        </label>
        <Input
          aria-label="Search by title or linked item"
          className="task-filter-keyword col-span-2 col-start-1 row-start-2 xl:col-span-1 xl:col-start-3 xl:row-start-1 h-10 rounded-xl border-border/45 bg-background px-3"
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
          placeholder="Title or linked item"
        />
        <SelectControl
          aria-label="Task sort order"
          className="task-filter-sort col-start-3 row-start-2 xl:col-start-4 xl:row-start-1 h-10 w-full rounded-xl border-border/45 bg-background px-3 text-sm"
          value={sortMode}
          onChange={(event) => onSortModeChange(event.target.value as TaskSortMode)}
        >
          <option value="updated_desc">Updated: newest first</option>
          <option value="updated_asc">Updated: oldest first</option>
          <option value="heartbeat_desc">Last heartbeat: newest first</option>
          <option value="heartbeat_asc">Last heartbeat: oldest first</option>
          <option value="default">Default: needs attention first</option>
        </SelectControl>

      </div>
    </section>
  );
}
