import type { ReactNode } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { Maximize2, Minimize2 } from "lucide-react";
import type { PromptCatalogItem, PromptSlotOverrideScope } from "@/api/promptWorkbench";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import SelectControl from "@/components/common/SelectControl";
import { ENTRYPOINT_OPTIONS, OUTPUT_TYPE_LABELS } from "../promptWorkbenchLabels";

interface PromptEditorShellProps {
  prompt: PromptCatalogItem;
  immersive?: boolean;
  onImmersiveChange?: (next: boolean) => void;
  entrypoint: string;
  onEntrypointChange: (entrypoint: string) => void;
  scope: PromptSlotOverrideScope;
  onScopeChange: (scope: PromptSlotOverrideScope) => void;
  selectedNovelId: string;
  onNovelChange: (novelId: string) => void;
  novels: Array<{ id: string; title?: string | null }>;
  selectedChapterId: string;
  onChapterChange: (chapterId: string) => void;
  chapters: Array<{ id: string; title?: string | null; order?: number | null; hasContent?: boolean }>;
  bodyPanel: ReactNode;
  contextPanel?: ReactNode;
  runBar: ReactNode;
  simplified?: boolean;
  heading?: string;
  advanced?: boolean;
}

export function PromptEditorShell(props: PromptEditorShellProps) {
  const { prompt, immersive = false, simplified = false, scope, advanced = false } = props;
  return (
    <section className="flex h-full min-h-0 flex-col bg-background">
      <header className="shrink-0 border-b border-border bg-card px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold">{props.heading || prompt.shortDescription || prompt.description || prompt.id}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{simplified
              ? "Adjust the prose template and compare results using sample content or a chapter from this novel."
              : prompt.description}</p>
          </div>
          {props.onImmersiveChange ? (
            <Button variant="ghost" size="sm" onClick={() => props.onImmersiveChange?.(!immersive)}>
              {immersive ? <Minimize2 className="mr-2 h-4 w-4" /> : <Maximize2 className="mr-2 h-4 w-4" />}
              {immersive ? "Exit focus mode" : "Focus mode"}
            </Button>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!simplified ? (
            <Tabs value={scope} onValueChange={(value) => props.onScopeChange(value as PromptSlotOverrideScope)}>
              <TabsList>
                <TabsTrigger value="global">{advanced ? "Template draft" : "All novels"}</TabsTrigger>
                <TabsTrigger value="novel">{advanced ? "This novel's template" : "Specific novel"}</TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}
          {scope === "novel" ? (
            <SelectControl value={props.selectedNovelId} onChange={(event) => props.onNovelChange(event.target.value)}
              aria-label="Scope: novel" className="h-9 max-w-72 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">{advanced ? "Select a novel (optional for now)" : "Select a novel to customize"}</option>
              {props.novels.map((novel) => <option key={novel.id} value={novel.id}>{novel.title || novel.id}</option>)}
            </SelectControl>
          ) : null}
          <span className="text-xs text-muted-foreground">{advanced
            ? (scope === "novel" && props.selectedNovelId ? "Applies only to this novel after saving." : "Edit now and choose a novel when you apply the changes.")
            : scope === "global" ? "Default instructions for all novels. Novel-specific settings take precedence." : "Applies only to the selected novel."}</span>
        </div>
        <details className="mt-3 text-xs text-muted-foreground">
          <summary className="w-fit cursor-pointer">Preview settings and prompt details</summary>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">Simulated use case
              <SelectControl value={props.entrypoint} onChange={(event) => props.onEntrypointChange(event.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2">
                {ENTRYPOINT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </SelectControl>
            </label>
            {scope === "novel" && props.selectedNovelId ? (
              <label className="flex items-center gap-2">Preview chapter
                <SelectControl value={props.selectedChapterId} onChange={(event) => props.onChapterChange(event.target.value)}
                  className="h-8 max-w-72 rounded-md border border-input bg-background px-2">
                  <option value="">Select a chapter</option>
                  {props.chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>
                    Chapter {chapter.order ?? "?"}: {chapter.title || "Untitled chapter"}{chapter.hasContent ? "" : " (no text)"}
                  </option>)}
                </SelectControl>
              </label>
            ) : <span>Preview with sample content without changing the novel.</span>}
            <span className="break-all">{prompt.key} · {OUTPUT_TYPE_LABELS[prompt.outputType] ?? prompt.outputType} · Context budget: {prompt.contextPolicy.maxTokensBudget} tokens</span>
          </div>
        </details>
      </header>
      <div className={cn("min-h-0 flex-1", immersive && "px-4 py-4")}>
        {props.contextPanel ? (
          <Group orientation="horizontal" className="h-full min-h-0">
            <Panel defaultSize={70} minSize={48}>
              <div className={cn("h-full min-h-0 overflow-y-auto px-5 py-5 pb-12", immersive && "bg-card px-8 py-7 pb-32")}>
                {props.bodyPanel}
              </div>
            </Panel>
            <Separator className="w-1 bg-border transition-colors hover:bg-primary/40" />
            <Panel defaultSize={30} minSize={24}>
              <div className="h-full min-h-0 bg-muted/20">{props.contextPanel}</div>
            </Panel>
          </Group>
        ) : (
          <div className={cn("h-full min-h-0 overflow-y-auto px-5 py-5 pb-12", immersive && "bg-card px-8 py-7 pb-32")}>
            {props.bodyPanel}
          </div>
        )}
      </div>
      {props.runBar}
    </section>
  );
}
