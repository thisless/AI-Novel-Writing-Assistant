import { useState } from "react";
import { ChevronDown, Edit3, FlaskConical, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LandingProfileItem } from "../writingFormulaLandingItems";

interface WritingFormulaLandingProps {
  onOpenCreate: () => void;
  onSelectProfile: (profileId: string) => void;
  onEditProfile: (profileId: string) => void;
  onOpenWorkbench: (profileId: string) => void;
  onUseProfileForClean: (profileId: string) => void;
  onDeleteProfile: (profileId: string) => void;
  onOpenPromptLab: () => void;
  onRetry: () => void;
  loading: boolean;
  error?: string;
  deletePending: boolean;
  profileItems: LandingProfileItem[];
  selectedProfileId: string;
}

function DetailStatRow(props: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm leading-6">
      <dt className="shrink-0 text-muted-foreground">{props.label}</dt>
      <dd className="min-w-0 break-words text-right">{props.value}</dd>
    </div>
  );
}

function RuleDisclosure(props: { title: string; summary: string }) {
  return (
    <details className="group py-3">
      <summary className="cursor-pointer list-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-3 text-sm font-medium">
          {props.title}
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" />
        </span>
        <span className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted-foreground group-open:hidden">{props.summary}</span>
      </summary>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{props.summary}</p>
    </details>
  );
}

export default function WritingFormulaLanding(props: WritingFormulaLandingProps) {
  const [search, setSearch] = useState("");
  const [collapsedProfileId, setCollapsedProfileId] = useState<string | null>(null);
  const query = search.trim().toLocaleLowerCase();
  const visibleProfiles = props.profileItems.filter((profile) => (
    [profile.name, profile.description, profile.category, ...profile.tags].join(" ").toLocaleLowerCase().includes(query)
  ));
  const customProfiles = visibleProfiles.filter((item) => !item.isStarter);
  const starterProfiles = visibleProfiles.filter((item) => item.isStarter);

  const renderProfileCard = (profile: LandingProfileItem) => {
    const isSelected = profile.id === props.selectedProfileId;
    const showDetails = isSelected && collapsedProfileId !== profile.id;
    const detailsId = "writing-profile-details-" + profile.id;

    return (
      <article key={profile.id} className={cn(
        "border-l-2 px-4 py-5 transition-colors sm:px-6",
        isSelected ? "border-l-primary bg-primary/[0.04]" : "border-l-transparent hover:bg-muted/20",
      )}>
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <button type="button" aria-expanded={showDetails} aria-controls={showDetails ? detailsId : undefined}
            aria-label={(showDetails ? "Collapse style details: " : "View style details: ") + profile.name}
            className="min-w-0 flex-1 basis-80 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => {
              // Folding a preview must not change the active profile or clear its test draft.
              if (isSelected) {
                setCollapsedProfileId(showDetails ? profile.id : null);
              } else {
                setCollapsedProfileId(null);
                props.onSelectProfile(profile.id);
              }
            }}>
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0 break-words text-base font-semibold leading-6">{profile.name}</span>
              <ChevronDown aria-hidden="true" className={cn(
                "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
                showDetails && "rotate-180",
              )} />
            </span>
            <span className="mt-1.5 block text-xs text-muted-foreground">
              {profile.originLabel}{profile.category ? " · " + profile.category : ""}
            </span>
            {!showDetails ? <span className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{profile.summaryLine}</span> : null}
          </button>

          <div className="flex flex-wrap items-center gap-1" role="group" aria-label={profile.name + " actions"}>
            <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-xs"
              title="Edit the style description, rules, and anti-AI constraints" onClick={() => props.onEditProfile(profile.id)}>
              <Edit3 aria-hidden="true" className="h-3.5 w-3.5" />Edit settings
            </Button>
            <Button type="button" size="sm" variant={isSelected ? "default" : "secondary"} className="h-8 px-2.5 text-xs"
              title="Bind a target or try a sample with this style" onClick={() => props.onOpenWorkbench(profile.id)}>
              <FlaskConical aria-hidden="true" className="h-3.5 w-3.5" />Apply and test
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-xs"
              title="Check prose and preview a focused revision" onClick={() => props.onUseProfileForClean(profile.id)}>
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />Reduce AI-like writing
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={props.deletePending}
              className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={"Delete style: " + profile.name} onClick={() => props.onDeleteProfile(profile.id)}>
              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />{props.deletePending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>

        {profile.tags.length > 0 || (!showDetails && profile.recentNovelTitle) ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {profile.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded bg-muted/60 px-2 py-1 text-xs text-muted-foreground">{tag}</span>
            ))}
            {!showDetails && profile.recentNovelTitle ? (
              <span className="text-xs text-muted-foreground">Recently bound: {profile.recentNovelTitle}</span>
            ) : null}
          </div>
        ) : null}

        {showDetails ? (
          <div id={detailsId} className="mt-5 grid gap-6 border-t border-border/60 pt-5 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0 space-y-5">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Reading experience and positioning</h3>
                <p className="whitespace-pre-wrap break-words text-sm leading-7">{profile.description}</p>
              </section>
              <section>
                <h3 className="mb-1 text-sm font-semibold">Rule summaries</h3>
                <div className="divide-y divide-border/60">
                  <RuleDisclosure title="Narrative progression" summary={profile.narrativeSummary} />
                  <RuleDisclosure title="Character expression" summary={profile.characterSummary} />
                  <RuleDisclosure title="Language and texture" summary={profile.languageSummary} />
                  <RuleDisclosure title="Pacing" summary={profile.rhythmSummary} />
                </div>
              </section>
              {profile.sourceContentPreview ? (
                <details className="group border-t border-border/60 pt-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                    Source text sample<ChevronDown aria-hidden="true" className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                  </summary>
                  <blockquote className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-muted/30 p-4 text-sm leading-7 text-muted-foreground">{profile.sourceContentPreview}</blockquote>
                </details>
              ) : null}
            </div>

            <aside aria-label={profile.name + " asset information"} className="min-w-0 space-y-5 xl:border-l xl:border-border/60 xl:pl-6">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Profile overview</h3>
                <dl className="space-y-2">
                  <DetailStatRow label="Last updated" value={profile.updatedAtLabel} />
                  <DetailStatRow label="Bound targets" value={String(profile.bindingCount)} />
                  <DetailStatRow label="Most recent novel" value={profile.recentNovelTitle || "No novel bound yet"} />
                  <DetailStatRow label="Applicable genres" value={profile.applicableGenres.join(" / ") || "Not specified"} />
                </dl>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded py-1 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                    Source and extraction details<ChevronDown aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                  </summary>
                  <dl className="mt-2 space-y-2">
                    <DetailStatRow label="Source" value={profile.sourceTypeLabel} />
                    <DetailStatRow label="Enabled features" value={String(profile.extractedFeatureCount)} />
                    <DetailStatRow label="High-risk source features" value={String(profile.highRiskFeatureCount)} />
                    <DetailStatRow label="Selected preset" value={profile.selectedPresetLabel || "None selected"} />
                    <DetailStatRow label="Available presets" value={profile.presetLabels.join(" / ") || "None"} />
                  </dl>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">Extraction details help you review reusable style features. The count is not a measure of quality.</p>
                </details>
              </section>
              <section className="space-y-3 border-t border-border/60 pt-4">
                <h3 className="text-sm font-semibold">Anti-AI constraints</h3>
                {profile.antiAiFocus.length > 0 ? (
                  <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                    {profile.antiAiFocus.map((line) => <li key={line} className="break-words">{line}</li>)}
                  </ul>
                ) : null}
                {profile.antiAiRuleNames.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.antiAiRuleNames.map((ruleName) => <span key={ruleName} className="rounded bg-muted/60 px-2 py-1 text-xs text-muted-foreground">{ruleName}</span>)}
                  </div>
                ) : null}
                {profile.extractionAntiAiRecommendationCount > 0 ? (
                  <p className="text-xs leading-5 text-muted-foreground">Extraction suggested {profile.extractionAntiAiRecommendationCount} additional rules. Review them in Edit settings.</p>
                ) : null}
                {!profile.antiAiFocus.length && !profile.antiAiRuleNames.length && !profile.extractionAntiAiRecommendationCount ? (
                  <p className="text-sm leading-6 text-muted-foreground">No anti-AI constraints configured. Choose suitable rules in Edit settings.</p>
                ) : null}
              </section>
              <p className="border-t border-border/60 pt-4 text-xs leading-6 text-muted-foreground">Try a short sample under “Apply and test” before binding this style to a work.</p>
            </aside>
          </div>
        ) : null}
      </article>
    );
  };

  const renderProfileSection = (title: string, profiles: LandingProfileItem[]) => (
    <section className="overflow-hidden rounded-xl bg-card text-card-foreground">
      <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold">{title}</h2>
        <span className="text-xs tabular-nums text-muted-foreground">{profiles.length} profiles</span>
      </div>
      <div className="divide-y divide-border/60">{profiles.map(renderProfileCard)}</div>
    </section>
  );

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold">Style profiles</h2>
            <p className="text-sm leading-6 text-muted-foreground">Choose a style profile, then edit it, apply it, or reduce AI-like writing.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={props.onOpenPromptLab}>Prose prompt lab</Button>
            <Button type="button" onClick={props.onOpenCreate}><Plus aria-hidden="true" className="h-4 w-4" />New style profile</Button>
          </div>
        </div>
        <div className="relative max-w-xl">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
            aria-label="Search style profile names, descriptions, or tags" placeholder="Search style profiles, descriptions, or tags" className="bg-background pl-9" />
        </div>
        <p className="border-b border-border/60 pb-4 text-xs leading-6 text-muted-foreground">Set a novel's default style in its basic information. Bind targets or generate samples under “Apply and test.”</p>
      </div>

      {props.loading ? <p role="status" className="py-8 text-sm text-muted-foreground">Loading style profiles…</p> : null}
      {props.error ? (
        <div role="alert" className="rounded-lg bg-destructive/10 p-4 text-sm">
          <p>{props.error}</p>
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={props.onRetry}>Reload</Button>
        </div>
      ) : null}
      {!props.loading && !props.error && props.profileItems.length === 0 ? (
        <div className="rounded-xl bg-card px-6 py-10">
          <h3 className="text-base font-semibold">Create your first style profile</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Describe the reading experience you want, or start with a template or sample text. AI will organize it into editable rules.</p>
          <Button type="button" className="mt-4" onClick={props.onOpenCreate}>Get started</Button>
        </div>
      ) : null}
      {!props.loading && !props.error && props.profileItems.length > 0 && visibleProfiles.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          <p>No matching style profiles. Try another name or tag.</p>
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setSearch("")}>Clear search</Button>
        </div>
      ) : null}
      {customProfiles.length > 0 ? renderProfileSection("My style profiles", customProfiles) : null}
      {starterProfiles.length > 0 ? renderProfileSection("Starter styles · Ready to use or customize", starterProfiles) : null}
    </div>
  );
}
