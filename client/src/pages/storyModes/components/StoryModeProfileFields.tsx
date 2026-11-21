import type { StoryModeProfile } from "@ai-novel/shared/types/storyMode";
import SelectControl from "@/components/common/SelectControl";

function linesToList(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function listToLines(value: string[]): string {
  return value.join("\n");
}

interface StoryModeProfileFieldsProps {
  value: StoryModeProfile;
  onChange: (value: StoryModeProfile) => void;
}

export default function StoryModeProfileFields({
  value,
  onChange,
}: StoryModeProfileFieldsProps) {
  const updateList = (field: keyof Pick<
    StoryModeProfile,
    "progressionUnits" | "allowedConflictForms" | "forbiddenConflictForms" | "mandatorySignals" | "antiSignals"
  >, text: string) => {
    onChange({
      ...value,
      [field]: linesToList(text),
    });
  };

  const textareaClassName = "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

  return (
    <div className="space-y-7">
      <section className="border-t border-border pt-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Core experience</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Define what keeps the story moving and what readers gain at each stage.</p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Core drive</span>
            <textarea
              rows={3}
              className={textareaClassName}
              value={value.coreDrive}
              placeholder="For example: Construction goals keep scaling up as resources and influence grow."
              onChange={(event) => onChange({ ...value, coreDrive: event.target.value })}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Reader reward</span>
            <textarea
              rows={3}
              className={textareaClassName}
              value={value.readerReward}
              placeholder="For example: See plans succeed, territory expand, and characters gain status."
              onChange={(event) => onChange({ ...value, readerReward: event.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="border-t border-border pt-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Progression rhythm</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Define chapter-level cycles and how each stage delivers results.</p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Chapter progression units</span>
            <textarea
              rows={4}
              className={textareaClassName}
              value={listToLines(value.progressionUnits)}
              placeholder={"One item per line, for example:\nFind a resource shortage\nComplete a construction goal\nGet feedback on progress"}
              onChange={(event) => updateList("progressionUnits", event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Chapter scope</span>
            <textarea
              rows={4}
              className={textareaClassName}
              value={value.chapterUnit}
              placeholder="Describe the scale of goals and changes typically completed in one chapter."
              onChange={(event) => onChange({ ...value, chapterUnit: event.target.value })}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Typical ways to overcome obstacles</span>
            <textarea
              rows={3}
              className={textareaClassName}
              value={value.resolutionStyle}
              placeholder="Explain how the protagonist usually overcomes obstacles and moves to the next stage."
              onChange={(event) => onChange({ ...value, resolutionStyle: event.target.value })}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Stage or volume-end reward</span>
            <textarea
              rows={3}
              className={textareaClassName}
              value={value.volumeReward}
              placeholder="Describe what must be delivered at the end of a major stage."
              onChange={(event) => onChange({ ...value, volumeReward: event.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="border-t border-border pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Boundaries and guardrails</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Tell AI which conflicts suit this mode and when the story should pull back.</p>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-sm">
            <span className="font-medium text-foreground">Conflict intensity</span>
            <SelectControl
              className="w-28"
              value={value.conflictCeiling}
              onChange={(event) => onChange({ ...value, conflictCeiling: event.target.value as StoryModeProfile["conflictCeiling"] })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </SelectControl>
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Suitable conflicts</span>
            <textarea
              rows={4}
              className={textareaClassName}
              value={listToLines(value.allowedConflictForms)}
              placeholder="Enter one reusable conflict type per line."
              onChange={(event) => updateList("allowedConflictForms", event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Unsuitable conflicts</span>
            <textarea
              rows={4}
              className={textareaClassName}
              value={listToLines(value.forbiddenConflictForms)}
              placeholder="Enter one conflict type per line that would undermine this mode."
              onChange={(event) => updateList("forbiddenConflictForms", event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Required signals</span>
            <textarea
              rows={4}
              className={textareaClassName}
              value={listToLines(value.mandatorySignals)}
              placeholder="Enter one signal per line that shows the mode is working."
              onChange={(event) => updateList("mandatorySignals", event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-foreground">Signals of unwanted drift</span>
            <textarea
              rows={4}
              className={textareaClassName}
              value={listToLines(value.antiSignals)}
              placeholder="Enter one signal per line that indicates the story is drifting away from this mode."
              onChange={(event) => updateList("antiSignals", event.target.value)}
            />
          </label>
        </div>
      </section>
    </div>
  );
}
