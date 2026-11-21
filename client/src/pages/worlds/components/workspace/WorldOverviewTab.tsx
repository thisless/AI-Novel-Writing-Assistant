import {
  BookOpen,
  Castle,
  Clock3,
  GitBranch,
  Map,
  MapPinned,
  Network,
  Pencil,
  ShieldAlert,
  Sparkles,
  WandSparkles,
  Workflow,
} from "lucide-react";
import type { WorldStructuredData, WorldVisualizationPayload } from "@ai-novel/shared/types/world";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { featureFlags } from "@/config/featureFlags";
import WorldVisualizationBoard from "../WorldVisualizationBoard";

interface WorldOverviewTabProps {
  summary?: string;
  sections: Array<{ key: string; title: string; content: string }>;
  structure?: WorldStructuredData;
  visualization?: WorldVisualizationPayload;
  onOpenStructure?: () => void;
  onOpenLayers?: () => void;
}

function compactText(value: string | null | undefined, fallback: string, limit = 120) {
  const text = value?.replace(/\s+/g, " ").trim();
  if (!text) {
    return fallback;
  }
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function listText(items: Array<string | null | undefined>, fallback: string, limit = 3) {
  const visible = items.map((item) => compactText(item, "", 96)).filter(Boolean).slice(0, limit);
  return visible.length > 0 ? visible : [fallback];
}

function HandbookBlock({
  icon: Icon,
  title,
  items,
  accent = "default",
}: {
  icon: typeof BookOpen;
  title: string;
  items: string[];
  accent?: "default" | "primary";
}) {
  return (
    <div className={accent === "primary" ? "rounded-2xl bg-primary/[0.055] p-4" : "rounded-2xl bg-muted/20 p-4"}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        {title}
      </div>
      <div className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
        {items.map((item) => (
          <div key={item} className="line-clamp-3">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyHandbookBlock({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BookOpen;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/45 bg-background/70 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        {title}
      </div>
      <div className="mt-2 text-sm leading-6 text-muted-foreground">{description}</div>
    </div>
  );
}

function WorldAssetPreviewBlock({
  icon: Icon,
  title,
  description,
  status,
}: {
  icon: typeof BookOpen;
  title: string;
  description: string;
  status: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/45 bg-background/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
          {title}
        </div>
        <Badge variant="secondary" className="border-0 bg-muted/60 font-normal">{status}</Badge>
      </div>
      <div className="mt-2 text-xs leading-5 text-muted-foreground">{description}</div>
    </div>
  );
}

export default function WorldOverviewTab(props: WorldOverviewTabProps) {
  const { summary, sections, structure, visualization, onOpenStructure, onOpenLayers } = props;
  const profile = structure?.profile;
  const hasHandbook = Boolean(structure);
  const worldPromise = compactText(
    profile?.identity || profile?.summary,
    summary ?? "Complete the world handbook to create a world that can be reused across novels.",
    120,
  );
  const coreRules = listText(
    structure?.rules?.axioms.map((rule) => [rule.name, rule.summary].filter(Boolean).join("：")) ?? [],
    "Add the rules that govern this world in the handbook editor.",
  );
  const majorForces = listText(
    [
      ...(structure?.forces ?? []).map((force) => [force.name, force.summary || force.currentObjective].filter(Boolean).join("：")),
      ...(structure?.factions ?? []).map((faction) => [faction.name, faction.position || faction.doctrine].filter(Boolean).join("：")),
    ],
    "Add the factions and powers that drive the story in the handbook editor.",
  );
  const storyLocations = listText(
    structure?.locations.map((location) =>
      [location.name, location.narrativeFunction || location.risk || location.summary].filter(Boolean).join("："),
    ) ?? [],
    "Add key locations for openings, progression, and turning points in the handbook editor.",
  );
  const tensions = listText(
    [
      profile?.coreConflict,
      ...(structure?.relations.forceRelations ?? []).map((relation) =>
        [relation.relation, relation.tension || relation.detail].filter(Boolean).join("："),
      ),
      ...(structure?.rules.sharedConsequences ?? []),
    ],
    "Add world conflicts that can create ongoing story pressure in the handbook editor.",
  );

  return (
    <section className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{featureFlags.worldVisEnabled ? "Explore the world and its maps" : "Explore the world handbook"}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Understand the world's promises, boundaries, major powers, and story settings from a reader's perspective.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" className="rounded-full" onClick={onOpenStructure}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
              Edit handbook
            </Button>
            <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={onOpenLayers}>
              <WandSparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              Build with AI
            </Button>
          </div>
        </div>
        {hasHandbook ? (
          <>
            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
              <div className="rounded-3xl bg-muted/20 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="border-0 bg-primary/[0.07] font-normal text-primary">World sample</Badge>
                  {profile?.tone ? <Badge variant="secondary" className="border-0 bg-muted/60 font-normal">{profile.tone}</Badge> : null}
                  {profile?.themes?.slice(0, 4).map((theme) => (
                    <Badge key={theme} variant="secondary" className="border-0 bg-muted/60 font-normal">
                      {theme}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3 text-lg font-semibold leading-7">
                  {worldPromise}
                </div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">
                  {compactText(profile?.summary, summary ?? "Add a concise overview that helps creators understand the world.", 180)}
                </div>
                <div className="mt-3 text-sm leading-6">
                  {compactText(profile?.coreConflict, "Adding the core conflict helps the system turn the world into an ongoing source of story pressure.", 160)}
                </div>
              </div>

              <div className="rounded-3xl border border-border/35 bg-card/70 p-5">
                <div className="text-sm font-medium">A reusable world sample can provide</div>
                <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  <div>Character identity boundaries, faction membership, and taboo combinations.</div>
                  <div>Opening locations, progression paths, and sources of conflict.</div>
                  <div>Rules to follow throughout the writing process.</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-7 gap-y-2 px-1 text-sm text-muted-foreground">
              <span><strong className="font-semibold tabular-nums text-foreground">{structure?.rules.axioms.length ?? 0}</strong> core rules</span>
              <span><strong className="font-semibold tabular-nums text-foreground">{(structure?.forces.length ?? 0) + (structure?.factions.length ?? 0)}</strong> powers and factions</span>
              <span><strong className="font-semibold tabular-nums text-foreground">{structure?.locations.length ?? 0}</strong> story locations</span>
              <span><strong className="font-semibold tabular-nums text-foreground">{(structure?.relations.forceRelations.length ?? 0) + (structure?.relations.locationControls.length ?? 0)}</strong> relationship links</span>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <HandbookBlock icon={Sparkles} title="Power and rules" items={coreRules} accent="primary" />
              <HandbookBlock icon={Castle} title="Major powers" items={majorForces} />
              <HandbookBlock icon={MapPinned} title="Story settings" items={storyLocations} />
              <HandbookBlock icon={GitBranch} title="Key tensions" items={tensions} />
            </div>

            <HandbookBlock
              icon={ShieldAlert}
              title="Priorities when using this world in a novel"
              items={[
                compactText(structure?.rules.summary, "Core rules constrain character identities, sources of conflict, and world consistency.", 150),
                ...listText(structure?.rules.taboo ?? [], "No taboo combinations are recorded. Add them in the handbook editor when strict constraints are needed.", 2),
              ]}
            />
          </>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[1.35fr_0.85fr]">
              <div className="rounded-3xl bg-muted/20 p-5">
                <Badge variant="secondary" className="border-0 bg-primary/[0.07] font-normal text-primary">World handbook not ready</Badge>
                <div className="mt-3 text-lg font-semibold leading-7">
                  {compactText(summary, "Ask AI to build the world framework or organize it in the handbook editor, then reuse it as a world sample.", 160)}
                </div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">
                  The handbook organizes scattered settings into rules, powers, locations, and story pressures for creators to understand and reuse.
                </div>
              </div>

              <div className="rounded-3xl border border-border/35 bg-card/70 p-5">
                <div className="text-sm font-medium">Suggested next steps</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={onOpenLayers}>
                    <WandSparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                    Build world with AI
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={onOpenStructure}>
                    <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                    Edit handbook
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <EmptyHandbookBlock icon={Sparkles} title="Power and rules" description="Record the foundational rules, costs, and taboos that cannot be casually broken." />
              <EmptyHandbookBlock icon={Castle} title="Major powers" description="Organize the groups, factions, interest groups, and pressures that drive the story." />
              <EmptyHandbookBlock icon={MapPinned} title="Story settings" description="Identify key locations for openings, progression, conflict, and turning points." />
              <EmptyHandbookBlock icon={GitBranch} title="Key tensions" description="Capture resource, faction, and rule-cost conflicts that can repeatedly drive the story." />
            </div>

            {sections.length > 0 ? (
              <div className="rounded-3xl border border-border/35 p-4">
                <div className="mb-2 text-sm font-medium">Existing setting excerpts</div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {sections.map((section) => (
                    <div key={section.key} className="rounded-2xl bg-muted/20 p-4 text-sm">
                      <div className="mb-1 font-medium">{section.title}</div>
                      <div className="line-clamp-4 whitespace-pre-wrap text-muted-foreground">{section.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
        {featureFlags.worldVisEnabled ? (
          <WorldVisualizationBoard payload={visualization} />
        ) : (
          <div className="rounded-3xl border border-border/35 p-5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Map className="h-4 w-4 text-primary" aria-hidden="true" />
                  World assets
                </div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">
                  Maps and graphs visualize the world handbook. They aren't overwritten by automatic sync and don't replace the handbook as the source of rules.
                </div>
              </div>
              <Badge variant="secondary" className="border-0 bg-muted/60 font-normal">Coming soon</Badge>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <WorldAssetPreviewBlock
                icon={MapPinned}
                title="World map"
                description="Shows regions, connected locations, story settings, and conflict intensity."
                status={(structure?.locations.length ?? 0) > 0 ? "Ready to organize" : "Add locations"}
              />
              <WorldAssetPreviewBlock
                icon={Network}
                title="Power map"
                description="Shows powers, allies and enemies, control relationships, and relative strength."
                status={(structure?.forces.length ?? 0) + (structure?.factions.length ?? 0) > 0 ? "Ready to organize" : "Add powers"}
              />
              <WorldAssetPreviewBlock
                icon={Clock3}
                title="World timeline"
                description="Shows historical events, shifting conditions, and changes as the novel progresses."
                status={profile?.coreConflict ? "Ready to organize" : "Add tensions"}
              />
              <WorldAssetPreviewBlock
                icon={Workflow}
                title="Power system tree"
                description="Shows ranks, resources, costs, taboos, and boundaries for advancement."
                status={(structure?.rules.axioms.length ?? 0) > 0 ? "Ready to organize" : "Add rules"}
              />
            </div>
          </div>
        )}
    </section>
  );
}
