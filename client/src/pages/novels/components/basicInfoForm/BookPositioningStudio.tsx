import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import WorkflowProgressBar from "@/components/workflow/WorkflowProgressBar";
import type { NovelBasicFormState } from "../../novelBasicInfo.shared";
import { StatusRail } from "../workspaceShell";
import { BookFramingSection } from "./BookFramingSection";
import { FieldLabel } from "./BasicInfoFormPrimitives";

interface BookPositioningStudioProps {
  basicForm: NovelBasicFormState;
  onFormChange: (patch: Partial<NovelBasicFormState>) => void;
  titleQuickFill?: ReactNode;
  framingQuickFill?: ReactNode;
  projectQuickStart?: ReactNode;
}

const POSITIONING_FIELDS = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "targetAudience", label: "Audience" },
  { key: "bookSellingPoint", label: "Selling point" },
  { key: "first30ChapterPromise", label: "First 30 chapters" },
] satisfies Array<{ key: keyof NovelBasicFormState; label: string }>;

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function createPreview(value: string, fallback: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return fallback;
  }
  return normalized.length > 44 ? `${normalized.slice(0, 44)}...` : normalized;
}

export default function BookPositioningStudio(props: BookPositioningStudioProps) {
  const { basicForm, onFormChange, titleQuickFill, framingQuickFill, projectQuickStart } = props;
  const completedCount = POSITIONING_FIELDS.filter((field) => hasText(basicForm[field.key])).length;
  const readinessPercent = Math.round((completedCount / POSITIONING_FIELDS.length) * 100);
  const readinessItems = [
    {
      label: "Target audience",
      value: createPreview(basicForm.targetAudience, "Describe who will read this book"),
      description: hasText(basicForm.targetAudience) ? "Ready" : "Needs details",
      tone: hasText(basicForm.targetAudience) ? "success" as const : "neutral" as const,
    },
    {
      label: "Core selling point",
      value: createPreview(basicForm.bookSellingPoint, "Define the most compelling payoff or mystery"),
      description: hasText(basicForm.bookSellingPoint) ? "Ready" : "Needs details",
      tone: hasText(basicForm.bookSellingPoint) ? "success" as const : "neutral" as const,
    },
    {
      label: "First 30-chapter promise",
      value: createPreview(basicForm.first30ChapterPromise, "Tell AI what the opening must deliver"),
      description: hasText(basicForm.first30ChapterPromise) ? "Ready" : "Needs details",
      tone: hasText(basicForm.first30ChapterPromise) ? "success" as const : "neutral" as const,
    },
  ];

  return (
    <section className="space-y-6 rounded-2xl bg-muted/15 p-4 sm:p-5 lg:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
              Book positioning
            </Badge>
            <span className="text-xs font-medium text-muted-foreground">Title, selling point, and early payoffs</span>
          </div>
          <h2 className="mt-3 text-lg font-semibold leading-7 text-foreground">Define what readers can expect from this book</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Describe who will keep reading, why, and what they can expect in the first 30 chapters. AI will use these promises to plan the world, characters, and chapters.
          </p>
        </div>
        {projectQuickStart ? <div className="shrink-0">{projectQuickStart}</div> : null}
      </div>

      <div className="grid gap-5 rounded-xl bg-background/70 px-4 py-4 xl:grid-cols-[14rem_minmax(0,1fr)] xl:items-center">
        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Positioning progress</div>
              <div className="mt-1 text-xs text-muted-foreground">{completedCount} / {POSITIONING_FIELDS.length} ready</div>
            </div>
            <div className="text-2xl font-semibold tracking-tight text-foreground">{readinessPercent}%</div>
          </div>
          <WorkflowProgressBar progress={readinessPercent} className="h-2" />
        </div>
        <StatusRail items={readinessItems} />
      </div>

      <div className="grid items-start gap-x-8 gap-y-6 xl:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-5">
          <div className="flex min-h-16 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Title and story premise</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">In a few sentences, introduce the protagonist, their dilemma, and the most compelling twist.</p>
            </div>
            {titleQuickFill ? <div className="shrink-0">{titleQuickFill}</div> : null}
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="basic-title">Novel title</FieldLabel>
            <Input
              id="basic-title"
              value={basicForm.title}
              placeholder="e.g., The Mist Harbor Tribunal"
              onChange={(event) => onFormChange({ title: event.target.value })}
              className="h-12 rounded-xl border-0 bg-background/85 text-base font-semibold ring-1 ring-border/50 transition-colors hover:bg-background focus-visible:ring-primary/30"
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <FieldLabel htmlFor="basic-description">Short description</FieldLabel>
              <span className="text-xs text-muted-foreground">Protagonist · Goal · Obstacle</span>
            </div>
            <textarea
              id="basic-description"
              rows={7}
              className="min-h-[184px] w-full resize-y rounded-xl border-0 bg-background/85 px-4 py-3 text-sm leading-7 outline-none ring-1 ring-border/50 transition-colors placeholder:text-muted-foreground/70 hover:bg-background focus-visible:ring-2 focus-visible:ring-primary/30"
              value={basicForm.description}
              placeholder="In 2–4 sentences, describe the protagonist, central conflict, and what makes the story compelling."
              onChange={(event) => onFormChange({ description: event.target.value })}
            />
          </div>
        </div>

        <div className="xl:border-l xl:border-border/50 xl:pl-8">
          <BookFramingSection
            basicForm={basicForm}
            onFormChange={onFormChange}
            quickFill={framingQuickFill}
          />
        </div>
      </div>
    </section>
  );
}
