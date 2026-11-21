import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CreativeHubToolResultCardProps {
  toolName: string;
  summary: string;
  success: boolean;
  output?: Record<string, unknown>;
  errorCode?: string;
  onQuickAction?: (prompt: string) => void;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.map((item) => asRecord(item)).filter((item) => Object.keys(item).length > 0)
    : [];
}

function itemLabel(item: Record<string, unknown>): string {
  const candidates = ["title", "name", "label", "summary", "content"];
  for (const key of candidates) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  if (typeof item.id === "string" && item.id.trim()) {
    return item.id.trim();
  }
  return "Untitled item";
}

function compactText(value: string, max = 140): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function formatNovelProjectStatus(value: unknown): string | null {
  switch (value) {
    case "in_progress":
      return "In progress";
    case "not_started":
      return "Not started";
    case "completed":
      return "Completed";
    case "rework":
      return "Needs revision";
    case "blocked":
      return "Blocked";
    default:
      return null;
  }
}

function renderActionButtons(actions: Array<{ label: string; prompt: string }>, onQuickAction?: (prompt: string) => void) {
  if (!onQuickAction || actions.length === 0) {
    return null;
  }
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={`${action.label}-${action.prompt}`}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onQuickAction(action.prompt)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

function renderNovelList(output: Record<string, unknown>, onQuickAction?: (prompt: string) => void) {
  const total = typeof output.total === "number" ? output.total : null;
  const items = asRecordArray(output.items).slice(0, 8);
  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground">
        {total ?? items.length} novels found
        {total != null && total > items.length ? ` · Showing the first ${items.length}` : ""}
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const title = itemLabel(item);
          const chapterCount = typeof item.chapterCount === "number" ? item.chapterCount : null;
          const projectStatus = formatNovelProjectStatus(item.projectStatus);
          return (
            <div key={`${item.id ?? title}`} className="rounded-md border border-border bg-muted/20 px-3 py-2">
              <div className="text-sm font-medium text-foreground">《{title}》</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {chapterCount != null ? `${chapterCount} chapters` : "Chapter count unknown"}
                {projectStatus ? ` · ${projectStatus}` : ""}
              </div>
              {onQuickAction ? (
                <div className="mt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onQuickAction(`Set "${title}" as the current workspace.`)}
                  >
                    Set as current workspace
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderWorkspaceCard(
  output: Record<string, unknown>,
  variant: "created" | "selected",
  onQuickAction?: (prompt: string) => void,
) {
  const title = typeof output.title === "string" && output.title.trim() ? output.title.trim() : "Untitled novel";
  const chapterCount = typeof output.chapterCount === "number" ? output.chapterCount : 0;
  const actions = variant === "created"
    ? [
      { label: "View current progress", prompt: "How far along is this book, and which chapter is currently being written?" },
      { label: "Plan the first chapter", prompt: "Plan the first chapter of this book." },
    ]
    : [
      { label: "View current progress", prompt: "How far along is this book, and which chapter is currently being written?" },
      { label: "Review the first two chapters", prompt: "Summarize what happens in the first two chapters." },
    ];
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-success/30 bg-success/5 px-3 py-3">
        <div className="text-sm font-medium text-foreground">《{title}》</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {variant === "created" ? "Novel created and linked to this thread." : "This thread has switched to the novel workspace."}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">Current chapter count: {chapterCount}</div>
      </div>
      {renderActionButtons(actions, onQuickAction)}
    </div>
  );
}

function renderWorldBindingCard(output: Record<string, unknown>, onQuickAction?: (prompt: string) => void) {
  const novelTitle = typeof output.novelTitle === "string" && output.novelTitle.trim()
    ? output.novelTitle.trim()
    : "Current novel";
  const worldName = typeof output.worldName === "string" && output.worldName.trim()
    ? output.worldName.trim()
    : "Untitled world";
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-info/30 bg-info/5 px-3 py-3">
        <div className="text-sm font-medium text-foreground">《{novelTitle}》</div>
        <div className="mt-1 text-xs text-muted-foreground">Linked world: “{worldName}”.</div>
      </div>
      {renderActionButtons([
        { label: "Review world constraints", prompt: "Review the current novel's world rules." },
        { label: "Check for world conflicts", prompt: "Check whether the current novel conflicts with its world rules." },
      ], onQuickAction)}
    </div>
  );
}

function renderProductionAssetCard(
  title: string,
  description: string,
  actions: Array<{ label: string; prompt: string }>,
  onQuickAction?: (prompt: string) => void,
) {
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-primary/25 bg-primary/5 px-3 py-3">
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="mt-1 text-xs leading-5 text-muted-foreground">{description}</div>
      </div>
      {renderActionButtons(actions, onQuickAction)}
    </div>
  );
}

function renderProductionStatusCard(output: Record<string, unknown>, onQuickAction?: (prompt: string) => void) {
  const title = typeof output.title === "string" && output.title.trim() ? output.title.trim() : "Current novel";
  const currentStage = typeof output.currentStage === "string" ? output.currentStage.trim() : "Unknown stage";
  const chapterCount = typeof output.chapterCount === "number" ? output.chapterCount : 0;
  const targetChapterCount = typeof output.targetChapterCount === "number" ? output.targetChapterCount : null;
  const pipelineStatus = typeof output.pipelineStatus === "string" && output.pipelineStatus.trim()
    ? output.pipelineStatus.trim()
    : "Not started";
  const assetStages = asRecordArray(output.assetStages);
  return (
    <div className="space-y-2">
      <div className="rounded-md border border-info/30 bg-info/5 px-3 py-3">
        <div className="text-sm font-medium text-foreground">《{title}》</div>
        <div className="mt-1 text-xs text-muted-foreground">Current stage: {currentStage}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Chapter outline: {targetChapterCount != null ? `${chapterCount}/${targetChapterCount}` : chapterCount} chapters
        </div>
        <div className="mt-1 text-xs text-muted-foreground">Novel production: {pipelineStatus}</div>
        {typeof output.failureSummary === "string" && output.failureSummary.trim() ? (
          <div className="mt-2 text-xs leading-5 text-muted-foreground">Failure summary: {output.failureSummary.trim()}</div>
        ) : null}
      </div>
      {assetStages.length > 0 ? (
        <div className="grid gap-2">
          {assetStages.slice(0, 8).map((stage) => (
            <div key={`${stage.key ?? stage.label}`} className="rounded-md border border-border bg-muted/20 px-3 py-2">
              <div className="text-sm font-medium text-foreground">{String(stage.label ?? stage.key ?? "Stage")}</div>
              <div className="mt-1 text-xs text-muted-foreground">Status: {String(stage.status ?? "unknown")}</div>
              {typeof stage.detail === "string" && stage.detail.trim() ? (
                <div className="mt-1 text-xs text-muted-foreground">{stage.detail.trim()}</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {renderActionButtons([
        { label: "View production progress", prompt: "How far along is full-book production?" },
      ], onQuickAction)}
    </div>
  );
}

function renderPipelineRunCard(
  toolName: "preview_pipeline_run" | "queue_pipeline_run",
  output: Record<string, unknown>,
  onQuickAction?: (prompt: string) => void,
) {
  const startOrder = typeof output.startOrder === "number" ? output.startOrder : null;
  const endOrder = typeof output.endOrder === "number" ? output.endOrder : null;
  const jobId = typeof output.jobId === "string" && output.jobId.trim() ? output.jobId.trim() : null;
  const scope = startOrder != null && endOrder != null
    ? startOrder === endOrder
      ? `Chapter ${startOrder}`
      : `Chapters ${startOrder}–${endOrder}`
    : "Current chapter range";
  const title = toolName === "preview_pipeline_run" ? "Novel production preview" : "Novel production task";
  const description = toolName === "preview_pipeline_run"
    ? `Preview for ${scope} is complete. You can approve it or continue diagnosing.`
    : `Production task for ${scope} has started${jobId ? ` (Task ${jobId})` : ""}.`;
  const actions = toolName === "preview_pipeline_run"
    ? [
      { label: "View production progress", prompt: "How far along is full-book production?" },
      { label: "Review blockers", prompt: "Why hasn't full-book production started?" },
    ]
    : [
      { label: "View production progress", prompt: "How far along is full-book production?" },
      { label: "Check task status", prompt: "List the current system task statuses." },
    ];
  return renderProductionAssetCard(title, description, actions, onQuickAction);
}

function renderDiagnosticCard(output: Record<string, unknown>, onQuickAction?: (prompt: string) => void) {
  const failureSummary = typeof output.failureSummary === "string" ? output.failureSummary : "";
  const failureDetails = typeof output.failureDetails === "string" ? output.failureDetails : "";
  const recoveryHint = typeof output.recoveryHint === "string" ? output.recoveryHint : "";
  return (
    <div className="space-y-2">
      {failureSummary ? <div className="text-sm font-medium text-foreground">{failureSummary}</div> : null}
      {failureDetails ? <div className="text-xs leading-5 text-muted-foreground">Details: {failureDetails}</div> : null}
      {recoveryHint ? <div className="text-xs leading-5 text-muted-foreground">Suggestion: {recoveryHint}</div> : null}
      {renderActionButtons([
        { label: "Continue diagnosis", prompt: "Explain the failure and recovery suggestions in more detail." },
        { label: "Check task status", prompt: "List the current system task statuses." },
      ], onQuickAction)}
    </div>
  );
}

function renderListCard(
  output: Record<string, unknown>,
  emptyLabel: string,
  onQuickAction?: (prompt: string) => void,
) {
  const items = asRecordArray(output.items).slice(0, 6);
  if (items.length === 0) {
    return <div className="text-xs text-muted-foreground">{emptyLabel}</div>;
  }
  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {items.map((item) => (
          <div key={`${item.id ?? itemLabel(item)}`} className="rounded-md border border-border bg-muted/20 px-3 py-2">
            <div className="text-sm font-medium text-foreground">{itemLabel(item)}</div>
            {"status" in item && typeof item.status === "string" ? (
              <div className="mt-1 text-xs text-muted-foreground">Status: {item.status}</div>
            ) : null}
          </div>
        ))}
      </div>
      {renderActionButtons([{ label: "Refine results", prompt: "Refine these results further." }], onQuickAction)}
    </div>
  );
}

function renderChapterCard(output: Record<string, unknown>, onQuickAction?: (prompt: string) => void) {
  const title = typeof output.title === "string" && output.title.trim() ? output.title.trim() : "";
  const order = typeof output.order === "number" ? output.order : null;
  const content = typeof output.content === "string"
    ? output.content
    : typeof output.summary === "string"
      ? output.summary
      : "";
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">
        {order != null ? `Chapter ${order}` : "Chapter content"}
        {title ? `《${title}》` : ""}
      </div>
      <div className="rounded-md border border-border bg-muted/20 px-3 py-3 text-sm leading-6 text-muted-foreground">
        {content || "No chapter content is available."}
      </div>
      {renderActionButtons([
        { label: "Continue summarizing", prompt: "Summarize the key plot points in this passage." },
        { label: "Check for conflicts", prompt: "Check this chapter for conflicts with the world or earlier chapters." },
      ], onQuickAction)}
    </div>
  );
}

export default function CreativeHubToolResultCard({
  toolName,
  summary,
  success,
  output,
  errorCode,
  onQuickAction,
}: CreativeHubToolResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const payload = asRecord(output);
  const summaryText = compactText(summary, 160) || "The tool returned a result.";
  const cardContent = (() => {
    if (toolName === "list_novels") {
      return renderNovelList(payload, onQuickAction);
    }
    if (toolName === "create_novel") {
      return renderWorkspaceCard(payload, "created", onQuickAction);
    }
    if (toolName === "select_novel_workspace") {
      return renderWorkspaceCard(payload, "selected", onQuickAction);
    }
    if (toolName === "bind_world_to_novel") {
      return renderWorldBindingCard(payload, onQuickAction);
    }
    if (toolName === "generate_world_for_novel") {
      const worldName = typeof payload.worldName === "string" && payload.worldName.trim() ? payload.worldName.trim() : "Untitled world";
      return renderProductionAssetCard(
        "World generated",
        `Generated world: “${worldName}”.`,
        [
          { label: "View production progress", prompt: "How far along is full-book production?" },
        ],
        onQuickAction,
      );
    }
    if (toolName === "generate_novel_characters") {
      const characterCount = typeof payload.characterCount === "number" ? payload.characterCount : 0;
      return renderProductionAssetCard(
        "Core characters generated",
        `${characterCount} core characters generated.`,
        [
          { label: "Review character status", prompt: "Review the current status of the novel's characters." },
        ],
        onQuickAction,
      );
    }
    if (toolName === "generate_story_bible") {
      return renderProductionAssetCard(
        "Story bible generated",
        typeof payload.mainPromise === "string" && payload.mainPromise.trim()
          ? payload.mainPromise.trim()
          : "The story bible has been generated.",
        [
          { label: "View production progress", prompt: "How far along is full-book production?" },
        ],
        onQuickAction,
      );
    }
    if (toolName === "generate_novel_outline") {
      return renderProductionAssetCard(
        "Story direction generated",
        typeof payload.outline === "string" && payload.outline.trim()
          ? payload.outline.trim()
          : "The novel's story direction has been generated.",
        [
          { label: "View production progress", prompt: "How far along is full-book production?" },
        ],
        onQuickAction,
      );
    }
    if (toolName === "generate_structured_outline") {
      const targetChapterCount = typeof payload.targetChapterCount === "number" ? payload.targetChapterCount : 0;
      return renderProductionAssetCard(
        "Structured outline generated",
        targetChapterCount > 0 ? `Structured outline generated for ${targetChapterCount} chapters.` : "The novel's structured outline has been generated.",
        [
          { label: "View production progress", prompt: "How far along is full-book production?" },
        ],
        onQuickAction,
      );
    }
    if (toolName === "sync_chapters_from_structured_outline") {
      const chapterCount = typeof payload.chapterCount === "number" ? payload.chapterCount : 0;
      return renderProductionAssetCard(
        "Chapter outline synced",
        chapterCount > 0 ? `Synced ${chapterCount} chapters.` : "Chapter outline synced.",
        [
          { label: "View production progress", prompt: "How far along is full-book production?" },
          { label: "Check task status", prompt: "List the current system task statuses." },
        ],
        onQuickAction,
      );
    }
    if (toolName === "start_full_novel_pipeline" || toolName === "get_novel_production_status") {
      return renderProductionStatusCard(payload, onQuickAction);
    }
    if (toolName === "preview_pipeline_run" || toolName === "queue_pipeline_run") {
      return renderPipelineRunCard(toolName, payload, onQuickAction);
    }
    if (
      toolName === "get_task_failure_reason"
      || toolName === "get_run_failure_reason"
      || toolName === "get_index_failure_reason"
      || toolName === "get_book_analysis_failure_reason"
      || toolName === "explain_generation_blocker"
      || toolName === "explain_world_conflict"
      || toolName === "failure_diagnostic"
    ) {
      return renderDiagnosticCard(payload, onQuickAction);
    }
    if (
      toolName === "list_worlds"
      || toolName === "list_tasks"
      || toolName === "list_knowledge_documents"
      || toolName === "list_book_analyses"
      || toolName === "list_writing_formulas"
      || toolName === "list_base_characters"
    ) {
      return renderListCard(payload, "No results to display.", onQuickAction);
    }
    if (
      toolName === "get_chapter_content"
      || toolName === "get_chapter_content_by_order"
      || toolName === "summarize_chapter_range"
    ) {
      return renderChapterCard(payload, onQuickAction);
    }
    return null;
  })();

  if (!cardContent) {
    return null;
  }

  return (
    <div className="mt-3 rounded-md border border-border bg-muted/20 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-medium text-foreground">{summaryText}</div>
          <Badge variant={success ? "secondary" : "destructive"}>{success ? "Result processed" : "Failed"}</Badge>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={detailsId}
        >
          {expanded ? "Hide details" : "Show details"}
        </Button>
      </div>
      {expanded ? (
        <div id={detailsId} className="mt-3 space-y-3">
          {!success && errorCode ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-muted-foreground">
              Error code: {errorCode}
            </div>
          ) : null}
          {cardContent}
        </div>
      ) : (
        <div className="mt-2 text-xs text-muted-foreground">Detailed results are collapsed by default. Expand them if needed.</div>
      )}
    </div>
  );
}
