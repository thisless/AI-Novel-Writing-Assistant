import { useState } from "react";
import type { NovelBasicFormState } from "../novelBasicInfo.shared";
import {
  BASIC_INFO_FIELD_HINTS,
  EMOTION_OPTIONS,
  PACE_OPTIONS,
  POWER_SYSTEM_OPTIONS,
  POV_OPTIONS,
  READER_CHANNEL_OPTIONS,
  WRITING_PLATFORM_OPTIONS,
} from "../novelBasicInfo.shared";
import { parseEstimatedChapterCountInput } from "./estimatedChapterCountInput";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";
import { BookFramingQuickFillButton } from "../components/basicInfoForm/BookFramingQuickFillButton";
import {
  FieldLabel,
  findOptionSummary,
} from "../components/basicInfoForm/BasicInfoFormPrimitives";
import SelectControl from "@/components/common/SelectControl";

interface StageBasicSetupProps {
  basicForm: NovelBasicFormState;
  genreOptions: Array<{ id: string; path: string; label: string }>;
  idea: string;
  onBasicFormChange: (patch: Partial<NovelBasicFormState>) => void;
  onBack: () => void;
  onConfirm: () => void;
}

export default function StageBasicSetup({
  basicForm,
  genreOptions,
  idea,
  onBasicFormChange,
  onBack,
  onConfirm,
}: StageBasicSetupProps) {
  const [estimatedChapterCountDraft, setEstimatedChapterCountDraft] = useState<string | null>(null);
  const [volumeCountDraft, setVolumeCountDraft] = useState<string | null>(null);
  const hasLargeChapterPlan = basicForm.estimatedChapterCount > 200;
  const controlClassName = "w-full rounded-lg border-0 bg-muted/40 px-3 py-2.5 text-sm outline-none ring-1 ring-transparent transition hover:bg-muted/55 focus:bg-background focus:ring-2 focus:ring-primary/25";

  return (
    <section className="mx-auto w-full max-w-5xl space-y-7 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-2xl font-semibold tracking-normal text-foreground">Set the feel of your book</div>
          <div className={`mt-2 max-w-2xl text-sm leading-6 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            Set the basics that shape the reading experience. If you are unsure, keep the defaults and let AI use your initial idea as a guide.
          </div>
        </div>
        <div className="rounded-full bg-muted/55 px-3 py-1 text-xs text-muted-foreground">
          About 1 minute
        </div>
      </div>

      <div className="flex items-start gap-3 border-y border-border/60 py-4">
        <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
        <div>
          <div className="text-sm font-medium text-foreground">AI will establish the creative foundation</div>
          <div className={`mt-1 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            The system will use your initial idea to determine the genre and primary story direction, carrying them through story planning, drafting, review, and revision. You can adjust the approach later in the project settings.
          </div>
        </div>
      </div>

      <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel htmlFor="director-basic-platform" hint="Sets the platform style for planning, drafting, review, and revision.">Target platform</FieldLabel>
          <SelectControl
            id="director-basic-platform"
            className={controlClassName}
            value={basicForm.writingPlatformPreference}
            onChange={(event) => onBasicFormChange({ writingPlatformPreference: event.target.value as NovelBasicFormState["writingPlatformPreference"] })}
          >
            {WRITING_PLATFORM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </SelectControl>
          <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            {findOptionSummary(WRITING_PLATFORM_OPTIONS, basicForm.writingPlatformPreference)}
          </div>
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="director-basic-reader-channel" hint={BASIC_INFO_FIELD_HINTS.readerChannelPreference}>Target readership</FieldLabel>
          <SelectControl
            id="director-basic-reader-channel"
            className={controlClassName}
            value={basicForm.readerChannelPreference}
            onChange={(event) => onBasicFormChange({
              readerChannelPreference: event.target.value as NovelBasicFormState["readerChannelPreference"],
            })}
          >
            {READER_CHANNEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </SelectControl>
          <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            {findOptionSummary(READER_CHANNEL_OPTIONS, basicForm.readerChannelPreference)}
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="director-basic-pov" hint={BASIC_INFO_FIELD_HINTS.narrativePov}>Point of view</FieldLabel>
          <SelectControl
            id="director-basic-pov"
            className={controlClassName}
            value={basicForm.narrativePov}
            onChange={(event) => onBasicFormChange({
              narrativePov: event.target.value as NovelBasicFormState["narrativePov"],
            })}
          >
            {POV_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </SelectControl>
          <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            {findOptionSummary(POV_OPTIONS, basicForm.narrativePov)}
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="director-basic-pace" hint={BASIC_INFO_FIELD_HINTS.pacePreference}>Pacing</FieldLabel>
          <SelectControl
            id="director-basic-pace"
            className={controlClassName}
            value={basicForm.pacePreference}
            onChange={(event) => onBasicFormChange({
              pacePreference: event.target.value as NovelBasicFormState["pacePreference"],
            })}
          >
            {PACE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </SelectControl>
          <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            {findOptionSummary(PACE_OPTIONS, basicForm.pacePreference)}
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="director-basic-emotion" hint={BASIC_INFO_FIELD_HINTS.emotionIntensity}>Emotional intensity</FieldLabel>
          <SelectControl
            id="director-basic-emotion"
            className={controlClassName}
            value={basicForm.emotionIntensity}
            onChange={(event) => onBasicFormChange({
              emotionIntensity: event.target.value as NovelBasicFormState["emotionIntensity"],
            })}
          >
            {EMOTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </SelectControl>
          <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            {findOptionSummary(EMOTION_OPTIONS, basicForm.emotionIntensity)}
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="director-basic-power-system" hint={BASIC_INFO_FIELD_HINTS.powerSystemPreference}>Power system</FieldLabel>
          <SelectControl
            id="director-basic-power-system"
            className={controlClassName}
            value={basicForm.powerSystemPreference}
            onChange={(event) => onBasicFormChange({
              powerSystemPreference: event.target.value as NovelBasicFormState["powerSystemPreference"],
            })}
          >
            {POWER_SYSTEM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </SelectControl>
          <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            {findOptionSummary(POWER_SYSTEM_OPTIONS, basicForm.powerSystemPreference)}
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="director-basic-estimated" hint={BASIC_INFO_FIELD_HINTS.estimatedChapterCount}>Estimated chapter count</FieldLabel>
          <Input
            id="director-basic-estimated"
            type="number"
            min={1}
            max={2000}
            className={controlClassName}
            placeholder="Recommended by AI based on your story direction"
            value={estimatedChapterCountDraft ?? (basicForm.estimatedChapterCountSource === "default" ? "" : String(basicForm.estimatedChapterCount))}
            onChange={(event) => {
              const draft = event.target.value;
              setEstimatedChapterCountDraft(draft);
              const estimatedChapterCount = parseEstimatedChapterCountInput(draft);
              if (estimatedChapterCount !== null) onBasicFormChange({ estimatedChapterCount, estimatedChapterCountSource: "user" });
              else if (!draft.trim()) onBasicFormChange({estimatedChapterCountSource: "default"});
            }}
            onBlur={() => setEstimatedChapterCountDraft(null)}
          />
          <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            Leave blank for an AI recommendation, or enter a target to guide the book structure and volume and chapter planning.
          </div>
          {basicForm.estimatedChapterCountSource !== "default" && basicForm.estimatedChapterCount <= 60 ? (
            <div className={`rounded-lg bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900 ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              Compact novel mode: AI will complete the full story in a shorter format, adding up to 5 closing chapters if needed.
            </div>
          ) : null}
          {hasLargeChapterPlan ? (
            <div className={`rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              Consider starting small: review the plan and opening chapters first, then expand the scope if it meets your expectations.
            </div>
          ) : null}
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="director-basic-volumes">Fixed number of volumes (optional)</FieldLabel>
          <Input id="director-basic-volumes" type="number" min={1} max={24} step={1}
            className={controlClassName} placeholder="Leave blank for an AI recommendation"
            value={volumeCountDraft ?? basicForm.userPreferredVolumeCount ?? ""}
            onChange={(event) => {
              const draft = event.target.value;
              setVolumeCountDraft(draft);
              const count = Number(draft);
              if (!draft) onBasicFormChange({userPreferredVolumeCount: undefined});
              else if (Number.isInteger(count) && count >= 1 && count <= 24) onBasicFormChange({userPreferredVolumeCount: count});
            }}
            onBlur={() => setVolumeCountDraft(null)}/>
          <p className="text-xs text-muted-foreground">Enter 1–24 volumes to use that count throughout the book, or leave blank for an AI recommendation based on the story's scope.</p>
        </div>
      </div>

      <details className="group pt-2">
        <summary className="cursor-pointer list-none">
          <div>
            <div className="text-base font-semibold text-foreground">Add audience and selling points</div>
            <div className={`mt-1 max-w-3xl text-sm leading-6 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              Skip this if you are unsure. These details help AI understand who the book is for and what readers should get from the first 30 chapters.
            </div>
          </div>
        </summary>

        <div className="mt-5 flex justify-start">
          <BookFramingQuickFillButton
            basicForm={basicForm}
            genreOptions={genreOptions}
            descriptionOverride={idea}
            onApplySuggestion={onBasicFormChange}
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel htmlFor="director-basic-target-audience" hint={BASIC_INFO_FIELD_HINTS.targetAudience}>
              Target audience
            </FieldLabel>
            <Input
              id="director-basic-target-audience"
              className={controlClassName}
              value={basicForm.targetAudience}
              placeholder="e.g., Readers who enjoy high-stakes urban comebacks, tense relationships, and compelling hooks"
              onChange={(event) => onBasicFormChange({ targetAudience: event.target.value })}
            />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="director-basic-commercial-tags" hint={BASIC_INFO_FIELD_HINTS.commercialTagsText}>
              Key commercial tags
            </FieldLabel>
            <Input
              id="director-basic-commercial-tags"
              className={controlClassName}
              value={basicForm.commercialTagsText}
              placeholder="e.g., Comeback, high-stakes conflict, suspense, workplace intrigue"
              onChange={(event) => onBasicFormChange({ commercialTagsText: event.target.value })}
            />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="director-basic-competing-feel" hint={BASIC_INFO_FIELD_HINTS.competingFeel}>
              Comparable style / familiar reading experience
            </FieldLabel>
            <Input
              id="director-basic-competing-feel"
              className={controlClassName}
              value={basicForm.competingFeel}
              placeholder="e.g., Workplace pressure grounded in reality, with dry humor and intense relationship dynamics"
              onChange={(event) => onBasicFormChange({ competingFeel: event.target.value })}
            />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="director-basic-book-selling-point" hint={BASIC_INFO_FIELD_HINTS.bookSellingPoint}>
              Core selling point
            </FieldLabel>
            <textarea
              id="director-basic-book-selling-point"
              rows={3}
              className={`${controlClassName} min-h-[96px] resize-y`}
              value={basicForm.bookSellingPoint}
              placeholder="e.g., Each real-world problem the protagonist solves disrupts a wider web of relationships and interests, keeping readers eager for the next reversal."
              onChange={(event) => onBasicFormChange({ bookSellingPoint: event.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="director-basic-first30-promise" hint={BASIC_INFO_FIELD_HINTS.first30ChapterPromise}>
            First 30-chapter promise
          </FieldLabel>
          <textarea
            id="director-basic-first30-promise"
            rows={4}
            className={`${controlClassName} min-h-[120px] resize-y`}
            value={basicForm.first30ChapterPromise}
            placeholder="e.g., The first 30 chapters should establish the protagonist's position, introduce the main rival, deliver the first major relationship reversal, and promise escalating stakes."
            onChange={(event) => onBasicFormChange({ first30ChapterPromise: event.target.value })}
          />
        </div>
      </details>

      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>Back to idea</Button>
        <Button type="button" onClick={onConfirm}>Confirm initial setup</Button>
      </div>
    </section>
  );
}
