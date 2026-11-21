import { AlertTriangle, ArrowRight, CheckCircle2, Compass, FileText, Flame, GitBranch, Lock, Sparkles, Target } from "lucide-react";
import AiButton from "@/components/common/AiButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StoryMacroField } from "@ai-novel/shared/types/storyMacro";
import type { StoryMacroTabProps } from "../NovelEditView.types";
import {
  FieldActions,
  SUMMARY_FIELDS,
  listToText,
  textareaClassName,
} from "../StoryMacroPlanTab.shared";
import StoryMacroEditableField from "./StoryMacroEditableField";

interface StoryEngineStudioProps {
  tab: StoryMacroTabProps;
}

const readinessItems = [
  { key: "storyInput", label: "Story intent", icon: <FileText className="h-3.5 w-3.5" /> },
  { key: "sellingPoint", label: "Selling point", icon: <Sparkles className="h-3.5 w-3.5" /> },
  { key: "conflict", label: "Long-term conflict", icon: <Flame className="h-3.5 w-3.5" /> },
  { key: "hook", label: "Main story hook", icon: <Target className="h-3.5 w-3.5" /> },
  { key: "loop", label: "Progression loop", icon: <GitBranch className="h-3.5 w-3.5" /> },
] as const;

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function previewText(value: string, fallback: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return fallback;
  }
  return normalized.length > 92 ? `${normalized.slice(0, 92)}...` : normalized;
}

function resolveNextAction(tab: StoryMacroTabProps): {
  title: string;
  description: string;
  tone: "neutral" | "info" | "success" | "warning";
} {
  if (!tab.storyInput.trim()) {
    return {
      title: "Start with your story idea",
      description: "No need for a formal outline yet. Describe the protagonist's situation, ongoing pressure, the reader experience you want, and what you'd like to avoid.",
      tone: "warning",
    };
  }
  if (!tab.hasPlan) {
    return {
      title: "Generate the story engine",
      description: "Ask AI to turn your idea into a selling point, long-term conflict, main hook, progression loop, and key payoffs.",
      tone: "info",
    };
  }
  if (!tab.constraintEngine) {
    return {
      title: "Build the constraint engine",
      description: "Turn the confirmed story framework into clear boundaries for future character, volume, and chapter planning.",
      tone: "info",
    };
  }
  return {
    title: "Save before continuing",
    description: "The story framework now has constraints for downstream planning. Save it before moving on to characters, volume strategy, and chapter breakdowns.",
    tone: "success",
  };
}

function StoryReadinessPanel({ tab }: { tab: StoryMacroTabProps }) {
  const readiness = {
    storyInput: hasText(tab.storyInput),
    sellingPoint: hasText(tab.decomposition.selling_point),
    conflict: hasText(tab.decomposition.core_conflict),
    hook: hasText(tab.decomposition.main_hook),
    loop: hasText(tab.decomposition.progression_loop),
  };
  const readyCount = readinessItems.filter((item) => readiness[item.key]).length;
  const percent = Math.round((readyCount / readinessItems.length) * 100);
  const lockedCount = Object.values(tab.lockedFields).filter(Boolean).length;
  const nextAction = resolveNextAction(tab);

  return (
    <aside className="space-y-4 rounded-lg border border-border/70 bg-muted/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">Macro planning readiness</div>
          <div className="mt-1 text-xs text-muted-foreground">{readyCount} / {readinessItems.length} key items ready</div>
        </div>
        <div className="text-2xl font-semibold text-foreground">{percent}%</div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
      </div>

      <div className="rounded-lg border border-border/60 bg-background/85 p-3">
        {readinessItems.map((item) => (
          <div key={item.key} className="grid grid-cols-[1.5rem,1fr,auto] items-center gap-3 border-t border-border/55 py-3 first:border-t-0 first:pt-0 last:pb-0">
            <div className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md",
              readiness[item.key] ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground",
            )}>
              {item.icon}
            </div>
            <div className="text-sm text-foreground">{item.label}</div>
            {readiness[item.key] ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <span className="text-xs text-muted-foreground">Needed</span>
            )}
          </div>
        ))}
      </div>

      <div className={cn(
        "rounded-lg border p-3",
        nextAction.tone === "success" && "border-emerald-500/20 bg-emerald-500/10",
        nextAction.tone === "warning" && "border-amber-500/25 bg-amber-500/10",
        nextAction.tone === "info" && "border-primary/20 bg-primary/5",
        nextAction.tone === "neutral" && "border-border/60 bg-background/85",
      )}>
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Compass className="h-4 w-4 text-primary" />
          {nextAction.title}
        </div>
        <div className="mt-2 text-xs leading-5 text-muted-foreground">{nextAction.description}</div>
      </div>

      <div className="grid gap-2 text-xs text-muted-foreground">
        <div className="flex items-start gap-2 rounded-md bg-background/70 p-2">
          <Lock className="mt-0.5 h-3.5 w-3.5 text-primary" />
          <span>{lockedCount > 0 ? `${lockedCount} fields locked and protected during regeneration.` : "Lock fields you're happy with so AI regenerates only the rest."}</span>
        </div>
        <div className="flex items-start gap-2 rounded-md bg-background/70 p-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-amber-600" />
          <span>{tab.issues.length > 0 ? `${tab.issues.length} conflicts or gaps need attention.` : "No known conflicts to address."}</span>
        </div>
      </div>
    </aside>
  );
}

function SummaryFieldCard({ tab, field }: { tab: StoryMacroTabProps; field: StoryMacroField }) {
  const item = SUMMARY_FIELDS.find((candidate) => candidate.field === field);
  if (!item) {
    return null;
  }
  const value = tab.decomposition[item.field as keyof typeof tab.decomposition];

  return (
    <StoryMacroEditableField
      label={item.label}
      value={typeof value === "string" ? value : ""}
      onChange={(value) => tab.onFieldChange(item.field, value)}
      placeholder={item.placeholder}
      className="bg-background p-3"
      actions={
        <FieldActions
          field={item.field}
          lockedFields={tab.lockedFields}
          regeneratingField={tab.regeneratingField}
          storyInput={tab.storyInput}
          onToggleLock={tab.onToggleLock}
          onRegenerateField={tab.onRegenerateField}
        />
      }
    />
  );
}

export default function StoryEngineStudio({ tab }: StoryEngineStudioProps) {
  const payoffs = tab.decomposition.major_payoffs.filter((item) => item.trim());

  return (
    <section className="overflow-hidden rounded-lg border border-border/70 bg-background">
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr),22rem]">
        <div className="space-y-5 p-4 lg:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
                  Story engine
                </Badge>
                <span className="text-xs font-medium text-muted-foreground">Turn book-level promises into a framework for future planning</span>
              </div>
              <h2 className="mt-3 text-lg font-semibold leading-7 text-foreground">Shape how the main story progresses</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                Define why readers will keep reading, how the long-term conflict escalates, how the protagonist changes, and which payoffs must land at each stage before drafting chapters.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <AiButton onClick={tab.onDecompose} disabled={tab.isDecomposing || !tab.storyInput.trim()}>
                {tab.isDecomposing ? "Generating..." : tab.hasPlan ? "Regenerate story engine" : "Generate story engine"}
              </AiButton>
              <AiButton
                variant="secondary"
                onClick={tab.onBuildConstraintEngine}
                disabled={tab.isBuilding || !tab.decomposition.selling_point.trim()}
              >
                {tab.isBuilding ? "Building..." : "Build constraint engine"}
              </AiButton>
              <Button variant="outline" onClick={tab.onSaveEdits} disabled={tab.isSaving}>
                {tab.isSaving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3">
            <div className="text-sm font-medium text-foreground">Story idea</div>
            <textarea
              value={tab.storyInput}
              onChange={(event) => tab.onStoryInputChange(event.target.value)}
              placeholder="Describe your story idea, the kind of pressure you want, styles to avoid, and your preferred ending."
              className={textareaClassName("min-h-36")}
            />
            {tab.message ? (
              <div className="rounded-md bg-background/80 px-3 py-2 text-sm text-muted-foreground">
                {tab.message}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
              <div className="text-xs font-medium text-muted-foreground">Why readers will keep reading</div>
              <div className="mt-2 text-sm font-semibold leading-6 text-foreground">
                {previewText(tab.decomposition.selling_point, "Waiting for a one-line selling point")}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
              <div className="text-xs font-medium text-muted-foreground">Long-term source of pressure</div>
              <div className="mt-2 text-sm font-semibold leading-6 text-foreground">
                {previewText(tab.decomposition.core_conflict, "Waiting for a long-term conflict")}
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
              <div className="text-xs font-medium text-muted-foreground">Key payoffs</div>
              <div className="mt-2 text-sm font-semibold leading-6 text-foreground">
                {payoffs.length > 0 ? `${payoffs.length} milestones` : "Waiting for payoff milestones"}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border/70 p-4 xl:border-l xl:border-t-0 lg:p-5">
          <StoryReadinessPanel tab={tab} />
        </div>
      </div>

      <div className="border-t border-border/70 bg-muted/5 p-4 lg:p-5">
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Main story framework</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              This framework guides character and volume planning and chapter writing. Select a field or pencil icon to edit, then save your changes.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Lock fields you're happy with</span>
            <ArrowRight className="h-3.5 w-3.5" />
            <span>Then regenerate selected fields</span>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          <SummaryFieldCard tab={tab} field="selling_point" />
          <SummaryFieldCard tab={tab} field="core_conflict" />
          <SummaryFieldCard tab={tab} field="main_hook" />
          <SummaryFieldCard tab={tab} field="ending_flavor" />
          <SummaryFieldCard tab={tab} field="progression_loop" />
          <SummaryFieldCard tab={tab} field="growth_path" />
          <StoryMacroEditableField
            label="Key payoffs"
            value={listToText(tab.decomposition.major_payoffs)}
            onChange={(value) => tab.onFieldChange(
              "major_payoffs",
              value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
            )}
            placeholder="Enter one payoff per line."
            list
            className="bg-background p-3 xl:col-span-2"
            actions={
              <FieldActions
                field="major_payoffs"
                lockedFields={tab.lockedFields}
                regeneratingField={tab.regeneratingField}
                storyInput={tab.storyInput}
                onToggleLock={tab.onToggleLock}
                onRegenerateField={tab.onRegenerateField}
              />
            }
          />
        </div>
      </div>
    </section>
  );
}
