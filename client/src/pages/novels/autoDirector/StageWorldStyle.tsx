import type { StyleIntentSummary } from "@ai-novel/shared/types/styleEngine";
import { Button } from "@/components/ui/button";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";
import type { NovelBasicFormState } from "../novelBasicInfo.shared";
import { BASIC_INFO_FIELD_HINTS } from "../novelBasicInfo.shared";
import { FieldLabel } from "../components/basicInfoForm/BasicInfoFormPrimitives";
import SelectControl from "@/components/common/SelectControl";

interface StageWorldStyleProps {
  basicForm: NovelBasicFormState;
  worldOptions: Array<{ id: string; name: string }>;
  styleProfileOptions: Array<{ id: string; name: string }>;
  selectedStyleProfileId: string;
  selectedStyleSummary: StyleIntentSummary | null;
  onStyleProfileChange: (value: string) => void;
  onBasicFormChange: (patch: Partial<NovelBasicFormState>) => void;
  onBack: () => void;
  onConfirm: () => void;
}

export default function StageWorldStyle({
  basicForm,
  worldOptions,
  styleProfileOptions,
  selectedStyleProfileId,
  selectedStyleSummary,
  onStyleProfileChange,
  onBasicFormChange,
  onBack,
  onConfirm,
}: StageWorldStyleProps) {
  const selectedWorld = worldOptions.find((world) => world.id === basicForm.worldId) ?? null;
  const controlClassName = "w-full rounded-lg border-0 bg-muted/40 px-3 py-2.5 text-sm outline-none ring-1 ring-transparent transition hover:bg-muted/55 focus:bg-background focus:ring-2 focus:ring-primary/25";

  return (
    <section className="mx-auto w-full max-w-5xl space-y-7 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-2xl font-semibold tracking-normal text-foreground">Set the story's world and tone</div>
          <div className={`mt-2 max-w-2xl text-sm leading-6 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            Choose a world for AI to reference, or let it build one from your initial idea. Your style selection will guide future planning and drafting.
          </div>
        </div>
        <div className="rounded-full bg-muted/55 px-3 py-1 text-xs text-muted-foreground">
          You can keep the defaults
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <FieldLabel htmlFor="director-basic-world" hint={BASIC_INFO_FIELD_HINTS.worldId}>Reference world for planning</FieldLabel>
          <SelectControl
            id="director-basic-world"
            className={controlClassName}
            value={basicForm.worldId}
            onChange={(event) => onBasicFormChange({ worldId: event.target.value })}
            disabled={worldOptions.length === 0}
          >
            <option value="">No reference world</option>
            {worldOptions.map((world) => (
              <option key={world.id} value={world.id}>{world.name}</option>
            ))}
          </SelectControl>
          <div className={`text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            {worldOptions.length > 0
              ? "This provides a quick reference for Auto Director. For full import, generation, and sync options, use “Book world” on the novel page."
              : "No world samples are available. You can start with your initial idea instead."}
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="text-sm font-medium text-foreground">World building for this book</div>
          {selectedWorld ? (
            <div className={`text-sm leading-6 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              Auto Director will use the “{selectedWorld.name}” world as a reference and establish world rules for this book before preparing characters.
            </div>
          ) : (
            <div className="rounded-lg bg-muted/45 px-4 py-3 text-sm leading-6 text-foreground">
              AI will build the world from the high-level plan and use it to create characters, chapters, and prose.
            </div>
          )}
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="director-basic-style-profile" hint="Optional. The director will use a concise style summary during early planning and the full style rules during drafting.">
            Default book style
          </FieldLabel>
          <SelectControl
            id="director-basic-style-profile"
            className={controlClassName}
            value={selectedStyleProfileId}
            onChange={(event) => onStyleProfileChange(event.target.value)}
          >
            <option value="">Use style keywords only</option>
            {styleProfileOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </SelectControl>
          <div className={`text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            {selectedStyleSummary?.stageSummaryLines[0] ?? "If you have a saved style profile, select one to better understand how the director will write."}
          </div>
          {selectedStyleSummary?.stageSummaryLines.length ? (
            <div className={`pt-1 text-xs leading-6 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              This style will shape the tone and pacing of future chapters: {selectedStyleSummary.stageSummaryLines.join("; ")}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>Back to initial setup</Button>
        <Button type="button" onClick={onConfirm}>Confirm world and style</Button>
      </div>
    </section>
  );
}
