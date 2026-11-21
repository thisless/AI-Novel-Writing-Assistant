import { BookOpen, GitBranch, Settings2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LLMSelector from "@/components/common/LLMSelector";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";
import type { NovelBasicFormState } from "../novelBasicInfo.shared";
import { findDirectorIssuePolicyPreset, type DirectorIssuePolicy } from "@ai-novel/shared/types/directorIssue";
import { AutoDirectorIssuePolicyCard } from "@/pages/settings/AutoDirectorIssuePolicyCard";

interface StageModelRunProps {
  directorVersion: "v1" | "v2";
  availableDirectorVersions: ("v1" | "v2")[];
  onDirectorVersionChange: (version: "v1" | "v2") => void;
  versionLocked?: boolean;
  basicForm: NovelBasicFormState;
  onBasicFormChange: (patch: Partial<NovelBasicFormState>) => void;
  canGenerate: boolean;
  generationDisabledReasons: string[];
  directorVersionsError: boolean;
  onRetryDirectorVersions: () => void;
  isGenerating: boolean;
  onBack: () => void;
  onGenerate: () => void;
  issuePolicy?: DirectorIssuePolicy | null;
  issuePolicyLoading: boolean;
  onIssuePolicyChange: (policy: DirectorIssuePolicy) => void;
}

export default function StageModelRun({
  directorVersion,
  availableDirectorVersions,
  onDirectorVersionChange,
  versionLocked,
  basicForm,
  onBasicFormChange,
  canGenerate,
  generationDisabledReasons,
  directorVersionsError,
  onRetryDirectorVersions,
  isGenerating,
  onBack,
  onGenerate,
  issuePolicy,
  issuePolicyLoading,
  onIssuePolicyChange,
}: StageModelRunProps) {
  const [issuePolicyDialogOpen, setIssuePolicyDialogOpen] = useState(false);
  const issuePolicySummary = issuePolicy
    ? findDirectorIssuePolicyPreset(issuePolicy)?.name ?? "Custom rules for this setup"
    : "Using default rules";

  return (
    <section className="mx-auto w-full max-w-5xl space-y-7 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-2xl font-semibold tracking-normal text-foreground">Confirm model and production setup</div>
          <div className={`mt-2 max-w-2xl text-sm leading-6 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            After confirmation, AI will suggest two story directions, then prepare the characters, volumes, and chapters before drafting.
          </div>
        </div>
        <div className="rounded-full bg-muted/55 px-3 py-1 text-xs text-muted-foreground">
          Final step before starting
        </div>
      </div>

      <div className="space-y-6">
        <section className="space-y-2">
          <label htmlFor="opening-director-version" className="block text-sm font-medium">Director version</label>
          <select id="opening-director-version" value={directorVersion} disabled={versionLocked || isGenerating}
            onChange={event => onDirectorVersionChange(event.target.value as "v1" | "v2")}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-sm">
            {availableDirectorVersions.map(version => <option key={version} value={version}>{version === "v2" ? "Director V2 · New" : "Director V1 · Original"}</option>)}
            {!availableDirectorVersions.includes(directorVersion) ? <option value={directorVersion}>{availableDirectorVersions.length ? `Director ${directorVersion.toUpperCase()} · Disabled` : directorVersionsError ? "Failed to load director versions" : "Loading director versions…"}</option> : null}
          </select>
          <p className="text-xs leading-5 text-muted-foreground">Choose the workflow for this book. Configure full automation or stage-by-stage approval in the corresponding director workspace.</p>
          {versionLocked ? <p className="text-xs text-muted-foreground">Finish the current setup task before choosing another version.</p> : null}
        </section>
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-[0_20px_55px_-45px_hsl(var(--foreground)/0.5)]">
          <div className="border-b border-border/60 bg-muted/15 px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <GitBranch className="h-4 w-4 text-primary" />
              How Auto Director works
            </div>
          </div>
          <div className="grid gap-px bg-border/60 md:grid-cols-3">
            <div className="bg-background p-5">
              <Sparkles className="h-5 w-5 text-primary" />
              <div className="mt-3 text-sm font-semibold text-foreground">1. Choose a story direction</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">AI generates two distinct directions for you to choose from.</div>
            </div>
            <div className="bg-background p-5">
              <BookOpen className="h-5 w-5 text-primary" />
              <div className="mt-3 text-sm font-semibold text-foreground">2. Prepare everything for drafting</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">The system prepares characters, volume strategy, chapter outlines, and execution resources.</div>
            </div>
            <div className="bg-background p-5">
              <Settings2 className="h-5 w-5 text-primary" />
              <div className="mt-3 text-sm font-semibold text-foreground">3. Choose how to draft</div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">Simple mode lets AI write the entire book; Professional mode opens the full workspace.</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-primary/10 bg-primary/[0.05] px-5 py-3 text-xs">
            <span className="font-medium text-foreground">Drafting will wait for your choice</span>
            <span className="text-muted-foreground">No chapter prose will be generated in advance</span>
          </div>
        </section>

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground">Check and revise prose with AI</div>
            <div className={`text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              When enabled, chapter reviews will check style and signs of AI-generated prose. Issues that require changes will be revised according to this setup; other suggestions will remain as quality notes.
            </div>
          </div>
          <Switch
            aria-label="Check and revise prose with AI"
            checked={basicForm.postGenerationStyleReviewEnabled}
            onCheckedChange={(checked) => onBasicFormChange({ postGenerationStyleReviewEnabled: checked })}
          />
        </div>

        <details className="group rounded-2xl border border-border/70 bg-background px-5 py-4">
          <summary className="cursor-pointer list-none">
            <div className="text-sm font-medium text-foreground">Model settings</div>
            <div className={`mt-1 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              Configure the model, temperature, and output limit for this setup. A temperature of 0.3–0.7 is recommended for structural planning.
            </div>
          </summary>
          <div className="mt-4">
            <LLMSelector showParameters />
          </div>
        </details>

        <section className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">Issue handling for this book</div>
            <div className={`mt-1 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              {issuePolicyLoading ? "Loading default rules." : `${issuePolicySummary}. You can start without making changes.`}
            </div>
          </div>
          <Button type="button" variant="outline" className="shrink-0" onClick={() => setIssuePolicyDialogOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Manage issues for this book
          </Button>
        </section>

        <Dialog open={issuePolicyDialogOpen} onOpenChange={setIssuePolicyDialogOpen}>
          <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage issues for this book</DialogTitle>
              <DialogDescription>Choose how issues should be handled before starting. Leave the defaults unchanged to continue with the standard rules.</DialogDescription>
            </DialogHeader>
            <AutoDirectorIssuePolicyCard
              policy={issuePolicy}
              isLoading={issuePolicyLoading}
              isSaving={false}
              onSave={(policy) => {
                onIssuePolicyChange(policy);
                setIssuePolicyDialogOpen(false);
              }}
              saveButtonLabel="Apply to this setup"
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>Back to world and style</Button>
        <div className="space-y-2 sm:max-w-md sm:text-right">
          {!canGenerate ? (
            <ul id="direction-generation-disabled-reasons" role="status" className="space-y-1 text-sm text-muted-foreground">
              {generationDisabledReasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          ) : null}
          {directorVersionsError ? (
            <Button type="button" variant="ghost" size="sm" onClick={onRetryDirectorVersions}>Retry loading director versions</Button>
          ) : null}
          <Button type="button" onClick={onGenerate} disabled={!canGenerate}
            aria-describedby={!canGenerate ? "direction-generation-disabled-reasons" : undefined}>
            {isGenerating ? "Generating..." : "Generate story directions"}
          </Button>
        </div>
      </div>
    </section>
  );
}
