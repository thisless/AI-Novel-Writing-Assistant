import { useEffect, useState } from "react";
import { AlertTriangle, BookOpen, Castle, GitBranch, MapPinned, Pencil, Save, ScrollText, WandSparkles } from "lucide-react";
import type {
  WorldBindingSupport,
  WorldStructuredData,
  WorldStructureSectionKey,
} from "@ai-novel/shared/types/world";
import type { WorldStructurePayload } from "@/api/world";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HandbookField,
  HandbookPreviewCard,
  HandbookPreviewLine,
  HandbookTextarea,
} from "./handbook/HandbookPrimitives";
import WorldHandbookForceSection from "./handbook/WorldHandbookForceSection";
import WorldHandbookLocationSection from "./handbook/WorldHandbookLocationSection";
import WorldHandbookRuleSection from "./handbook/WorldHandbookRuleSection";
import WorldHandbookTensionSection from "./handbook/WorldHandbookTensionSection";

type EditableHandbookSection = "profile" | "rules" | "forces" | "locations" | "relations";

function compactText(value: string | null | undefined, fallback: string, limit = 120): string {
  const text = value?.replace(/\s+/g, " ").trim();
  if (!text) {
    return fallback;
  }
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function joinPreview(items: Array<string | null | undefined>, fallback: string): string {
  const text = items
    .map((item) => item?.replace(/\s+/g, " ").trim())
    .filter((item): item is string => Boolean(item))
    .slice(0, 3)
    .join(" / ");
  return text || fallback;
}

export default function WorldHandbookEditor(props: {
  initialPayload?: WorldStructurePayload;
  savePending: boolean;
  backfillPending: boolean;
  generatePending: boolean;
  onSave: (structure: WorldStructuredData, bindingSupport: WorldBindingSupport) => Promise<void>;
  onBackfill: () => Promise<{ structure: WorldStructuredData; bindingSupport: WorldBindingSupport } | undefined>;
  onGenerate: (
    section: WorldStructureSectionKey,
    structure: WorldStructuredData,
    bindingSupport: WorldBindingSupport,
  ) => Promise<{ structure: WorldStructuredData; bindingSupport: WorldBindingSupport } | undefined>;
  onOpenDeepening: () => void;
  onOpenLayers: () => void;
  onOpenOverview: () => void;
  onOpenAdvanced: () => void;
}) {
  const {
    initialPayload,
    savePending,
    backfillPending,
    generatePending,
    onSave,
    onBackfill,
    onGenerate,
    onOpenDeepening,
    onOpenLayers,
    onOpenOverview,
    onOpenAdvanced,
  } = props;
  const [draftStructure, setDraftStructure] = useState<WorldStructuredData | null>(initialPayload?.structure ?? null);
  const [draftBindingSupport, setDraftBindingSupport] = useState<WorldBindingSupport | null>(
    initialPayload?.bindingSupport ?? null,
  );
  const [activeAiSection, setActiveAiSection] = useState<WorldStructureSectionKey>("profile");
  const [editingSection, setEditingSection] = useState<EditableHandbookSection | null>(null);

  useEffect(() => {
    if (!initialPayload) {
      return;
    }
    setDraftStructure(initialPayload.structure);
    setDraftBindingSupport(initialPayload.bindingSupport);
  }, [initialPayload]);

  if (!draftStructure || !draftBindingSupport) {
    return (
      <section className="flex min-h-56 flex-col items-center justify-center rounded-3xl bg-muted/20 px-6 text-center">
          <BookOpen className="h-6 w-6 text-muted-foreground/60" aria-hidden="true" />
          <div className="mt-3 font-medium">Loading world handbook</div>
          <div className="mt-1 text-sm leading-6 text-muted-foreground">Ask AI to organize existing worldbuilding into a complete handbook when needed.</div>
          <Button
            className="mt-4 rounded-full"
            variant="outline"
            onClick={async () => {
              const result = await onBackfill();
              if (result) {
                setDraftStructure(result.structure);
                setDraftBindingSupport(result.bindingSupport);
              }
            }}
            disabled={backfillPending}
          >
            {backfillPending ? "Organizing…" : "Organize handbook with AI"}
          </Button>
      </section>
    );
  }

  const saveDraft = async () => {
    await onSave(draftStructure, draftBindingSupport);
  };

  const generateSection = async () => {
    const result = await onGenerate(activeAiSection, draftStructure, draftBindingSupport);
    if (result) {
      setDraftStructure(result.structure);
      setDraftBindingSupport(result.bindingSupport);
    }
  };

  return (
    <section className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Organize the world handbook</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Start with the world's impression and core conflict, then organize its rules, powers, locations, and tensions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={onOpenOverview}>
              <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
              View handbook
            </Button>
            <Button type="button" size="sm" className="rounded-full" onClick={saveDraft} disabled={savePending}>
              <Save className="mr-2 h-4 w-4" aria-hidden="true" />
              {savePending ? "Saving…" : "Save handbook"}
            </Button>
          </div>
        </div>
        <div className="rounded-3xl bg-muted/20 p-5 sm:p-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="border-0 bg-primary/[0.07] font-normal text-primary">World impression</Badge>
            {draftStructure.profile.tone ? <Badge variant="secondary" className="border-0 bg-muted/60 font-normal">{draftStructure.profile.tone}</Badge> : null}
            {draftStructure.profile.themes.slice(0, 4).map((theme) => (
              <Badge key={theme} variant="secondary" className="border-0 bg-muted/60 font-normal">
                {theme}
              </Badge>
            ))}
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[0.75fr_1.25fr]">
            <HandbookPreviewLine
              label="World in one sentence"
              value={draftStructure.profile.identity}
              fallback="Describe the genre, era, and defining wonder of this world in one sentence."
            />
            <HandbookPreviewLine
              label="First impression"
              value={draftStructure.profile.summary}
              fallback="Describe the world's first impression, order, dangers, or wonders."
            />
            <HandbookPreviewLine
              label="Tone"
              value={draftStructure.profile.tone || draftStructure.profile.themes.join(", ")}
              fallback="Describe the tone, such as action-packed progression, dark epic, lighthearted adventure, or political intrigue."
            />
            <HandbookPreviewLine
              label="Ongoing story conflict"
              value={draftStructure.profile.coreConflict}
              fallback="Describe a conflict that repeatedly drives character choices, faction clashes, and chapter events."
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setEditingSection("profile")}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
              Edit world overview
            </Button>
          </div>
          {editingSection === "profile" ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-[0.8fr_1.4fr]">
            <div className="space-y-3">
              <HandbookField title="World in one sentence" hint="Quickly convey the world's genre, era, and defining wonder to creators and AI.">
                <Input
                  value={draftStructure.profile.identity}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev ? { ...prev, profile: { ...prev.profile, identity: event.target.value } } : prev,
                    )
                  }
                  placeholder="For example: A cultivation dynasty running out of its star cores"
                />
              </HandbookField>
              <HandbookField title="Tone" hint="Set whether the story is dark, action-packed, lighthearted, political, or exploratory.">
                <Input
                  value={draftStructure.profile.tone}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev ? { ...prev, profile: { ...prev.profile, tone: event.target.value } } : prev,
                    )
                  }
                  placeholder="Dark epic, lighthearted adventure, political intrigue…"
                />
              </HandbookField>
              <HandbookField title="Theme keywords" hint="Separate keywords with commas to keep characters, locations, and conflicts aligned with the same genre.">
                <Input
                  value={draftStructure.profile.themes.join(", ")}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? {
                          ...prev,
                          profile: {
                            ...prev.profile,
                            themes: event.target.value.split(/[、,，]/).map((item) => item.trim()).filter(Boolean),
                          },
                        }
                        : prev,
                    )
                  }
                  placeholder="Revenge, dynastic change, awakening powers"
                />
              </HandbookField>
            </div>
            <div className="space-y-3">
              <HandbookField title="The world's first impression" hint="Write a short passage a creator can repeat; there is no need to split it into geography, culture, or history.">
                <HandbookTextarea
                  value={draftStructure.profile.summary}
                  onChange={(value) =>
                    setDraftStructure((prev) => (prev ? { ...prev, profile: { ...prev.profile, summary: value } } : prev))
                  }
                  placeholder="Describe what the world looks like and where the story begins."
                />
              </HandbookField>
              <HandbookField title="Ongoing story conflict" hint="This is not background information, but a problem that repeatedly drives character actions, faction clashes, and chapter events.">
                <HandbookTextarea
                  value={draftStructure.profile.coreConflict}
                  onChange={(value) =>
                    setDraftStructure((prev) =>
                      prev ? { ...prev, profile: { ...prev.profile, coreConflict: value } } : prev,
                    )
                  }
                  placeholder="For example: As star cores run dry, cultivators fight for longevity, the court hides the truth, and demons invade the border."
                  minRows={3}
                />
              </HandbookField>
            </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border/35 bg-card/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">AI-assisted organization</div>
              <div className="mt-1 text-sm leading-6 text-muted-foreground">
                Ask AI to complete a handbook section using existing content, then revise it before saving.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "profile", label: "World overview" },
                { key: "rules", label: "Rules" },
                { key: "factions", label: "Powers" },
                { key: "locations", label: "Locations" },
                { key: "relations", label: "Tensions" },
              ].map((item) => (
                <Button
                  key={item.key}
                  type="button"
                  size="sm"
                  variant={activeAiSection === item.key ? "default" : "ghost"}
                  className="rounded-full"
                  onClick={() => setActiveAiSection(item.key as WorldStructureSectionKey)}
                >
                  {item.label}
                </Button>
              ))}
              <Button type="button" size="sm" variant="secondary" className="rounded-full" onClick={generateSection} disabled={generatePending}>
                <WandSparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                {generatePending ? "Completing…" : "Complete selected section"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <HandbookPreviewCard
            icon={ScrollText}
            title="Core rules"
            description={`${draftStructure.rules.axioms.length} rules constrain power, resources, taboos, and costs.`}
            action={
              <Button type="button" size="sm" variant="outline" onClick={() => setEditingSection("rules")}>
                Edit rules
              </Button>
            }
          >
            <div className="space-y-3">
              <HandbookPreviewLine
                label="Rule summary"
                value={draftStructure.rules.summary}
                fallback="Add the hard rules that govern the world to keep character abilities and story resolutions in check."
              />
              <HandbookPreviewLine
                label="Representative rules"
                value={joinPreview(
                  draftStructure.rules.axioms.map((rule) => [rule.name, rule.summary].filter(Boolean).join("：")),
                  "Add 2–3 core rules that must be followed.",
                )}
                fallback="Add 2–3 core rules that must be followed."
              />
            </div>
          </HandbookPreviewCard>

          <HandbookPreviewCard
            icon={Castle}
            title="Major powers"
            description={`${draftStructure.forces.length} powers shape character affiliations, faction pressures, and competition for resources.`}
            action={
              <Button type="button" size="sm" variant="outline" onClick={() => setEditingSection("forces")}>
                Edit powers
              </Button>
            }
          >
            <div className="space-y-3">
              <HandbookPreviewLine
                label="Active powers"
                value={joinPreview(
                  draftStructure.forces.map((force) => [force.name, force.currentObjective].filter(Boolean).join("：")),
                  "Add major powers to clarify character identities and faction conflicts.",
                )}
                fallback="Add major powers to clarify character identities and faction conflicts."
              />
              <HandbookPreviewLine
                label="Story pressures"
                value={joinPreview(
                  draftStructure.forces.map((force) => force.pressure),
                  "Add the pressures that powers place on the protagonist and world order.",
                )}
                fallback="Add the pressures that powers place on the protagonist and world order."
              />
            </div>
          </HandbookPreviewCard>

          <HandbookPreviewCard
            icon={MapPinned}
            title="Story settings"
            description={`${draftStructure.locations.length} locations provide settings for openings, progression, turning points, climaxes, and maps.`}
            action={
              <Button type="button" size="sm" variant="outline" onClick={() => setEditingSection("locations")}>
                Edit locations
              </Button>
            }
          >
            <div className="space-y-3">
              <HandbookPreviewLine
                label="Available locations"
                value={joinPreview(
                  draftStructure.locations.map((location) =>
                    [location.name, location.narrativeFunction || location.terrain].filter(Boolean).join("："),
                  ),
                  "Add locations for the opening, trials, conflicts, or revelations.",
                )}
                fallback="Add locations for the opening, trials, conflicts, or revelations."
              />
              <HandbookPreviewLine
                label="Entry risks"
                value={joinPreview(
                  draftStructure.locations.map((location) => location.risk),
                  "Add the resistance, costs, or identity risks involved in entering a location.",
                )}
                fallback="Add the resistance, costs, or identity risks involved in entering a location."
              />
            </div>
          </HandbookPreviewCard>

          <HandbookPreviewCard
            icon={GitBranch}
            title="Conflict and tension"
            description="Record power relationships, location control, shared consequences, and taboos to keep the world story-ready."
            action={
              <Button type="button" size="sm" variant="outline" onClick={() => setEditingSection("relations")}>
                Edit tensions
              </Button>
            }
          >
            <div className="space-y-3">
              <HandbookPreviewLine
                label="Power relationships"
                value={joinPreview(
                  draftStructure.relations.forceRelations.map((relation) =>
                    [relation.relation, relation.tension || relation.detail].filter(Boolean).join("："),
                  ),
                  "Add who is allied, hostile, competing, or taking advantage of whom.",
                )}
                fallback="Add who is allied, hostile, competing, or taking advantage of whom."
              />
              <HandbookPreviewLine
                label="Shared consequences"
                value={joinPreview(
                  draftStructure.rules.sharedConsequences,
                  "Add world-wide consequences of breaking rules or escalating conflicts.",
                )}
                fallback="Add world-wide consequences of breaking rules or escalating conflicts."
              />
            </div>
          </HandbookPreviewCard>
        </div>

        {editingSection ? (
          <div className="rounded-2xl bg-primary/[0.055] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 text-primary" aria-hidden="true" />
                Editing the selected section. Save to update the handbook overview above.
              </div>
              <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setEditingSection(null)}>
                Close editor
              </Button>
            </div>
          </div>
        ) : null}

        {editingSection === "rules" ? (
          <WorldHandbookRuleSection draftStructure={draftStructure} setDraftStructure={setDraftStructure} />
        ) : null}
        {editingSection === "forces" ? (
          <WorldHandbookForceSection draftStructure={draftStructure} setDraftStructure={setDraftStructure} />
        ) : null}
        {editingSection === "locations" ? (
          <WorldHandbookLocationSection draftStructure={draftStructure} setDraftStructure={setDraftStructure} />
        ) : null}
        {editingSection === "relations" ? (
          <WorldHandbookTensionSection
            draftStructure={draftStructure}
            setDraftStructure={setDraftStructure}
            onOpenDeepening={onOpenDeepening}
            onOpenLayers={onOpenLayers}
            onOpenAdvanced={onOpenAdvanced}
          />
        ) : null}
    </section>
  );
}
