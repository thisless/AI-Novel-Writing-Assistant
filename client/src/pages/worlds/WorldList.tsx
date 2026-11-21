import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Castle, ChevronDown, Compass, GitBranch, LibraryBig, MapPin, Pencil, Sparkles, Trash2 } from "lucide-react";
import type { WorldStructuredData } from "@ai-novel/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteWorld, getWorldList } from "@/api/world";
import { queryKeys } from "@/api/queryKeys";
import { featureFlags } from "@/config/featureFlags";
import { toast } from "@/components/ui/toast";

interface WorldLibraryCardProjection {
  summary: string;
  identity: string | null;
  tone: string | null;
  coreConflict: string | null;
  ruleCount: number;
  forceCount: number;
  locationCount: number;
  relationCount: number;
  coreRules: string[];
  majorForces: string[];
  storyLocations: string[];
  tensions: string[];
}

function extractStructuredPreview(raw: string): string | null {
  const text = raw.trim();
  if (!text || (!text.startsWith("[") && !text.startsWith("{"))) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) {
      const parts = parsed
        .slice(0, 2)
        .map((item) => {
          if (typeof item === "string") {
            return item.trim();
          }
          if (!item || typeof item !== "object") {
            return "";
          }
          const record = item as Record<string, unknown>;
          const title = [record.name, record.title, record.label].find((value) => typeof value === "string");
          const description = [record.description, record.content, record.detail].find((value) => typeof value === "string");
          if (typeof title === "string" && typeof description === "string") {
            return `${title.trim()}: ${description.trim()}`;
          }
          if (typeof title === "string") {
            return title.trim();
          }
          if (typeof description === "string") {
            return description.trim();
          }
          return "";
        })
        .filter(Boolean);
      if (parts.length > 0) {
        return parts.join("; ");
      }
      return "Contains world handbook content. Open the workspace for details.";
    }
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const summary = [record.summary, record.description, record.content].find((value) => typeof value === "string");
      if (typeof summary === "string" && summary.trim()) {
        return summary.trim();
      }
      return "Contains world handbook content. Open the workspace for details.";
    }
  } catch {
    return null;
  }

  return null;
}

function buildPreview(raw: string | null | undefined, fallback: string, limit: number): string {
  if (!raw?.trim()) {
    return fallback;
  }

  const normalized = raw.replace(/\s+/g, " ").trim();
  const structured = extractStructuredPreview(normalized);
  const preview = (structured ?? normalized).slice(0, limit);
  return preview.length < (structured ?? normalized).length ? `${preview}...` : preview;
}

function compactText(value: string | null | undefined, limit: number): string | null {
  const text = value?.replace(/\s+/g, " ").trim();
  if (!text) {
    return null;
  }
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function parseStructuredWorldData(structureJson: string | null | undefined): WorldStructuredData | null {
  if (!structureJson?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(structureJson) as Partial<WorldStructuredData>;
    if (!parsed || typeof parsed !== "object" || !parsed.profile) {
      return null;
    }
    return parsed as WorldStructuredData;
  } catch {
    return null;
  }
}

function buildWorldLibraryProjection(world: {
  description?: string | null;
  overviewSummary?: string | null;
  conflicts?: string | null;
  geography?: string | null;
  background?: string | null;
  factions?: string | null;
  structureJson?: string | null;
}): WorldLibraryCardProjection {
  const structured = parseStructuredWorldData(world.structureJson);
  const legacySummary = buildPreview(world.description ?? world.overviewSummary, "World overview not yet provided.", 120);
  const legacyDetail = buildPreview(
    world.conflicts ?? world.geography ?? world.background ?? world.factions,
    "Open the workspace to organize core rules, major powers, and story settings.",
    160,
  );

  if (!structured) {
    return {
      summary: legacySummary,
      identity: legacyDetail,
      tone: null,
      coreConflict: null,
      ruleCount: 0,
      forceCount: 0,
      locationCount: 0,
      relationCount: 0,
      coreRules: [],
      majorForces: [],
      storyLocations: [],
      tensions: [legacyDetail],
    };
  }

  const coreRules = (structured.rules?.axioms ?? [])
    .map((rule) => compactText([rule.name, rule.summary].filter(Boolean).join(": "), 72))
    .filter((item): item is string => Boolean(item))
    .slice(0, 3);
  const majorForces = [...(structured.forces ?? []), ...(structured.factions ?? [])]
    .map((force) => compactText("name" in force ? [force.name, "summary" in force ? force.summary : force.position].filter(Boolean).join(": ") : "", 64))
    .filter((item): item is string => Boolean(item))
    .slice(0, 3);
  const storyLocations = (structured.locations ?? [])
    .map((location) => compactText([location.name, location.narrativeFunction || location.summary].filter(Boolean).join(": "), 64))
    .filter((item): item is string => Boolean(item))
    .slice(0, 3);
  const tensions = [
    compactText(structured.profile?.coreConflict, 80),
    ...(structured.relations?.forceRelations ?? []).map((relation) =>
      compactText([relation.relation, relation.tension || relation.detail].filter(Boolean).join(": "), 72),
    ),
    ...(structured.rules?.sharedConsequences ?? []).map((item) => compactText(item, 72)),
  ]
    .filter((item): item is string => Boolean(item))
    .slice(0, 3);

  return {
    summary: compactText(structured.profile?.summary, 130) ?? legacySummary,
    identity: compactText(structured.profile?.identity, 96),
    tone: compactText(structured.profile?.tone, 40),
    coreConflict: compactText(structured.profile?.coreConflict, 96),
    ruleCount: structured.rules?.axioms?.length ?? 0,
    forceCount: (structured.forces?.length ?? 0) + (structured.factions?.length ?? 0),
    locationCount: structured.locations?.length ?? 0,
    relationCount: (structured.relations?.forceRelations?.length ?? 0) + (structured.relations?.locationControls?.length ?? 0),
    coreRules,
    majorForces,
    storyLocations,
    tensions,
  };
}

function WorldSampleLine({
  icon: Icon,
  label,
  items,
  fallback,
}: {
  icon: typeof Sparkles;
  label: string;
  items: string[];
  fallback: string;
}) {
  return (
    <div className="flex gap-2">
      <Icon className="mt-0.5 h-4 w-4 flex-none text-primary" aria-hidden="true" />
      <div className="min-w-0">
        <div className="text-xs font-medium text-foreground">{label}</div>
        <div className="mt-1 space-y-1 text-xs leading-5 text-muted-foreground">
          {(items.length > 0 ? items : [fallback]).map((item) => (
            <div key={item} className="line-clamp-2">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WorldList() {
  const queryClient = useQueryClient();
  const worldListQuery = useQuery({
    queryKey: queryKeys.worlds.all,
    queryFn: getWorldList,
  });

  const deleteWorldMutation = useMutation({
    mutationFn: (id: string) => deleteWorld(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.worlds.all });
      toast.success("World sample deleted.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not delete the world sample.");
    },
  });

  const worlds = worldListQuery.data?.data ?? [];

  const handleDelete = (worldId: string, worldName: string) => {
    const confirmed = window.confirm(`Delete the world sample "${worldName}"? This action cannot be undone.`);
    if (!confirmed) {
      return;
    }
    deleteWorldMutation.mutate(worldId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/[0.07] text-primary">
            <LibraryBig className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">World library</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Browse reusable worldbuilding and find rules, powers, settings, and conflicts for new stories.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {featureFlags.worldWizardEnabled ? (
            <Button asChild className="rounded-full">
              <Link to="/worlds/generator">Create world sample</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <details className="group rounded-2xl bg-muted/20 px-5 py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm marker:hidden">
          <span className="font-medium">How to use a sample in a novel</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="mt-3 grid gap-3 border-t border-border/30 pt-3 text-sm leading-6 text-muted-foreground md:grid-cols-3">
          <div><span className="mr-2 font-medium text-foreground">1</span>Organize reusable rules, powers, locations, and tensions.</div>
          <div><span className="mr-2 font-medium text-foreground">2</span>Import from a novel's setup page to create a copy for that novel.</div>
          <div><span className="mr-2 font-medium text-foreground">3</span>If the sample and novel's world diverge, decide whether to push or pull updates.</div>
        </div>
      </details>

      {worldListQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3" aria-label="Loading world samples">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-80 animate-pulse rounded-3xl bg-muted/30" />
          ))}
        </div>
      ) : worldListQuery.isError ? (
        <div className="flex min-h-52 flex-col items-center justify-center rounded-3xl bg-destructive/[0.04] px-6 text-center">
          <div className="font-medium">Could not load world samples</div>
          <div className="mt-1 text-sm text-muted-foreground">Check your network connection and try again.</div>
          <Button type="button" variant="outline" className="mt-4 rounded-full" onClick={() => void worldListQuery.refetch()}>
            Reload
          </Button>
        </div>
      ) : worlds.length === 0 ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl bg-muted/20 px-6 text-center">
          <BookOpen className="h-7 w-7 text-muted-foreground/60" aria-hidden="true" />
          <div className="mt-3 font-medium">No world samples yet</div>
          <div className="mt-1 text-sm text-muted-foreground">Create a reusable world with rules, settings, and sources of conflict for future novels.</div>
          {featureFlags.worldWizardEnabled ? (
            <Button asChild className="mt-5 rounded-full">
              <Link to="/worlds/generator">Create your first world sample</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {worlds.map((world) => {
            const preview = buildWorldLibraryProjection(world);

            return (
              <article
                key={world.id}
                className="flex min-h-[390px] flex-col rounded-3xl border border-border/35 bg-card/70 p-5 transition-all hover:border-border/60 hover:shadow-[0_14px_36px_rgba(15,23,42,0.04)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="line-clamp-2 text-lg font-semibold tracking-tight">{world.name}</h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {world.worldType ? <Badge variant="secondary" className="border-0 bg-muted/60 font-normal">{world.worldType}</Badge> : null}
                      {preview.tone ? <Badge variant="secondary" className="border-0 bg-primary/[0.06] font-normal text-primary">{preview.tone}</Badge> : null}
                    </div>
                  </div>
                  <div className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-primary/[0.07] text-primary">
                    <BookOpen className="h-5 w-5" aria-hidden="true" />
                  </div>
                </div>

                <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{preview.summary}</p>

                {preview.identity || preview.coreConflict ? (
                  <div className="mt-4 rounded-2xl bg-muted/25 px-4 py-3 text-sm leading-6">
                    {preview.identity ? <div className="line-clamp-2 font-medium text-foreground">{preview.identity}</div> : null}
                    {preview.coreConflict ? (
                      <div className="mt-1 line-clamp-2 text-muted-foreground">{preview.coreConflict}</div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                  <span><strong className="font-semibold tabular-nums text-foreground">{preview.ruleCount}</strong> rules</span>
                  <span><strong className="font-semibold tabular-nums text-foreground">{preview.forceCount}</strong> powers</span>
                  <span><strong className="font-semibold tabular-nums text-foreground">{preview.locationCount}</strong> locations</span>
                  <span><strong className="font-semibold tabular-nums text-foreground">{preview.relationCount}</strong> relationships</span>
                </div>

                <details className="group mt-4 border-t border-border/30 pt-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-xs text-muted-foreground marker:hidden">
                    <span>Show story ideas</span>
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <WorldSampleLine
                      icon={Sparkles}
                      label="Power and rules"
                      items={preview.coreRules}
                      fallback="Open the workspace to organize the rules that govern this world."
                    />
                    <WorldSampleLine
                      icon={Castle}
                      label="Powers and factions"
                      items={preview.majorForces}
                      fallback="Open the workspace to add the organizations and factions that drive the story."
                    />
                    <WorldSampleLine
                      icon={MapPin}
                      label="Story settings"
                      items={preview.storyLocations}
                      fallback="Open the workspace to mark locations for the novel's opening and escalating conflicts."
                    />
                    <WorldSampleLine
                      icon={GitBranch}
                      label="Potential conflict threads"
                      items={preview.tensions}
                      fallback="Organize the world's tensions in the workspace for use in novel generation."
                    />
                  </div>
                  <div className="mt-4 text-[11px] text-muted-foreground">Version v{world.version} · {world.status}</div>
                </details>

                <div className="mt-auto flex flex-wrap items-center gap-1 border-t border-border/30 pt-4">
                  <Button asChild size="sm" className="rounded-full">
                    <Link to={`/worlds/${world.id}/workspace`}>
                      <Compass className="mr-1 h-4 w-4" aria-hidden="true" />
                      View handbook
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost" className="rounded-full text-muted-foreground">
                    <Link to={`/worlds/${world.id}/workspace`}>
                      <Pencil className="mr-1 h-4 w-4" aria-hidden="true" />
                      Edit sample
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto rounded-full px-2 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(world.id, world.name)}
                    disabled={deleteWorldMutation.isPending && deleteWorldMutation.variables === world.id}
                    aria-label={`Delete world sample ${world.name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    {deleteWorldMutation.isPending && deleteWorldMutation.variables === world.id ? "Deleting…" : "Delete"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
