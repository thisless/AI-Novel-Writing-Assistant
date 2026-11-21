import { BookOpen, CircleGauge, Workflow } from "lucide-react";
import type { NovelStoryMode } from "@ai-novel/shared/types/storyMode";
import { cn } from "@/lib/utils";

const conflictCeilingLabel = {
  low: "Low",
  medium: "Medium",
  high: "High",
} as const;

function ContractList({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span key={item} className="rounded-md border border-border/70 bg-muted/20 px-2 py-1 text-xs text-foreground">
              {item}
            </span>
          ))}
        </div>
      ) : (
        <div className="mt-2 text-sm text-muted-foreground">{emptyText}</div>
      )}
    </div>
  );
}

export default function StoryModeProfileDetails({
  node,
  eyebrow = "Story progression",
  className,
  titleId,
}: {
  node: Pick<NovelStoryMode, "name" | "description" | "template" | "profile">;
  eyebrow?: string;
  className?: string;
  titleId?: string;
}) {
  const { profile } = node;

  return (
    <div className={cn("max-w-4xl", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium tracking-[0.16em] text-muted-foreground">{eyebrow}</div>
          <h2 id={titleId} className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{node.name}</h2>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border/70 px-3 py-2 text-xs text-muted-foreground">
          <CircleGauge className="h-4 w-4" aria-hidden="true" />
          Conflict intensity: {conflictCeilingLabel[profile.conflictCeiling]}
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        {node.description?.trim() || profile.coreDrive}
      </p>

      <div className="mt-6 grid gap-px overflow-hidden rounded-md border border-border/70 bg-border/70 md:grid-cols-2">
        <div className="bg-background p-4">
          <Workflow className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <div className="mt-3 text-xs font-medium text-muted-foreground">Core drive</div>
          <div className="mt-1 text-sm leading-6 text-foreground">{profile.coreDrive}</div>
        </div>
        <div className="bg-background p-4">
          <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <div className="mt-3 text-xs font-medium text-muted-foreground">Reader reward</div>
          <div className="mt-1 text-sm leading-6 text-foreground">{profile.readerReward}</div>
        </div>
        <div className="bg-background p-4">
          <div className="text-xs font-medium text-muted-foreground">Chapter progression unit</div>
          <div className="mt-1 text-sm leading-6 text-foreground">{profile.chapterUnit}</div>
        </div>
        <div className="bg-background p-4">
          <div className="text-xs font-medium text-muted-foreground">Stage reward</div>
          <div className="mt-1 text-sm leading-6 text-foreground">{profile.volumeReward}</div>
        </div>
      </div>

      <div className="mt-7 grid gap-6 md:grid-cols-2">
        <ContractList title="Progression units" items={profile.progressionUnits} emptyText="No progression units defined" />
        <ContractList title="Suitable conflicts" items={profile.allowedConflictForms} emptyText="No suitable conflicts defined" />
        <ContractList title="Required signals" items={profile.mandatorySignals} emptyText="No required signals defined" />
        <ContractList title="Signals to avoid" items={profile.antiSignals} emptyText="No signals to avoid defined" />
      </div>

      <div className="mt-7 border-l-2 border-foreground/20 pl-4">
        <div className="text-sm font-semibold text-foreground">Resolution style</div>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">{profile.resolutionStyle}</p>
        {profile.forbiddenConflictForms.length > 0 ? (
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            Not suitable: {profile.forbiddenConflictForms.join(", ")}
          </p>
        ) : null}
      </div>

      {node.template?.trim() ? (
        <div className="mt-7 border-t border-border/70 pt-6">
          <div className="text-sm font-semibold text-foreground">Additional AI guidance</div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{node.template}</p>
        </div>
      ) : null}
    </div>
  );
}
