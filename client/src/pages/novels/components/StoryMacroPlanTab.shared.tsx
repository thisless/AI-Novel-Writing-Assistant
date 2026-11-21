import type { StoryMacroField } from "@ai-novel/shared/types/storyMacro";
import AiButton from "@/components/common/AiButton";
import { Button } from "@/components/ui/button";

export const ENGINE_TEXT_FIELDS: Array<{
  field: StoryMacroField;
  label: string;
  placeholder: string;
  multiline?: boolean;
}> = [
  { field: "expanded_premise", label: "Enhanced premise", placeholder: "Write an enhanced story premise that establishes pressure and suspense.", multiline: true },
  { field: "protagonist_core", label: "Protagonist's core situation", placeholder: "Describe the protagonist's predicament, vulnerabilities, and potential for change.", multiline: true },
  { field: "conflict_engine", label: "Conflict engine", placeholder: "Explain how the story can keep escalating beyond a single conflict.", multiline: true },
  { field: "mystery_box", label: "Central mystery", placeholder: "Describe the question readers most want answered, but cannot answer yet.", multiline: true },
  { field: "emotional_line", label: "Emotional progression", placeholder: "Describe how emotions deepen over time, rather than simply intensifying.", multiline: true },
  { field: "tone_reference", label: "Narrative tone", placeholder: "Describe the style, narrative stance, and level of control.", multiline: true },
];

export const SUMMARY_FIELDS: Array<{
  field: StoryMacroField;
  label: string;
  placeholder: string;
  multiline?: boolean;
}> = [
  { field: "selling_point", label: "One-line selling point", placeholder: "In one sentence, describe what will draw readers to this story." },
  { field: "core_conflict", label: "Long-term opposition", placeholder: "Describe an enduring, irreconcilable conflict." },
  { field: "main_hook", label: "Main story hook", placeholder: "Describe the central unanswered question." },
  { field: "progression_loop", label: "Progression loop", placeholder: "Explain how discovery -> escalation -> reversal repeats.", multiline: true },
  { field: "growth_path", label: "Growth path", placeholder: "Describe how the protagonist's perspective changes over time.", multiline: true },
  { field: "ending_flavor", label: "Ending tone", placeholder: "e.g., Collapse, ambiguity, reversal, or restrained melancholy." },
];

export function listToText(value: string[]): string {
  return value.join("\n");
}

export function textareaClassName(minHeight = "min-h-28") {
  return `${minHeight} w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring`;
}

export function FieldActions(props: {
  field: StoryMacroField;
  lockedFields: Partial<Record<StoryMacroField, boolean>>;
  regeneratingField: StoryMacroField | "";
  storyInput: string;
  onToggleLock: (field: StoryMacroField) => void;
  onRegenerateField: (field: StoryMacroField) => void;
}) {
  const isLocked = Boolean(props.lockedFields[props.field]);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant={isLocked ? "secondary" : "outline"}
        onClick={() => props.onToggleLock(props.field)}
      >
        {isLocked ? "Locked" : "Lock"}
      </Button>
      <AiButton
        size="sm"
        variant="outline"
        onClick={() => props.onRegenerateField(props.field)}
        disabled={props.regeneratingField === props.field || isLocked || !props.storyInput.trim()}
      >
        {props.regeneratingField === props.field ? "Regenerating..." : "Regenerate"}
      </AiButton>
    </div>
  );
}
