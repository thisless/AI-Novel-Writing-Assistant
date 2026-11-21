import type { NovelWorkspaceTab } from "../novelWorkspaceNavigation";
import type { NovelEditViewProps } from "../components/NovelEditView.types";

export interface MobileSaveState {
  visible: boolean;
  label: string;
  savingLabel: string;
  isSaving: boolean;
  onSave: () => void;
}

export function getMobileNovelWorkspaceStatusText(input: {
  activeLabel: string;
  workflowLabel: string;
}): string {
  if (input.activeLabel === input.workflowLabel) {
    return `Current step: ${input.activeLabel}`;
  }

  return `Current step: ${input.activeLabel} · Recommended next: ${input.workflowLabel}`;
}

export function getMobileNovelSaveState(
  tab: NovelWorkspaceTab,
  props: NovelEditViewProps,
): MobileSaveState {
  switch (tab) {
    case "basic":
      return {
        visible: true,
        label: "Save basic information",
        savingLabel: "Saving...",
        isSaving: props.basicTab.isSaving,
        onSave: props.basicTab.onSave,
      };
    case "story_macro":
      return {
        visible: true,
        label: "Save story plan",
        savingLabel: "Saving...",
        isSaving: props.storyMacroTab.isSaving,
        onSave: props.storyMacroTab.onSaveEdits,
      };
    case "world":
      return {
        visible: false,
        label: "",
        savingLabel: "",
        isSaving: false,
        onSave: () => undefined,
      };
    case "character":
      return {
        visible: true,
        label: "Save character",
        savingLabel: "Saving...",
        isSaving: props.characterTab.isSavingCharacter,
        onSave: props.characterTab.onSaveCharacter,
      };
    case "outline":
      return {
        visible: true,
        label: "Save volume workspace",
        savingLabel: "Saving...",
        isSaving: props.outlineTab.isSaving,
        onSave: props.outlineTab.onSave,
      };
    case "structured":
      return {
        visible: true,
        label: "Save chapter breakdown",
        savingLabel: "Saving...",
        isSaving: props.structuredTab.isSaving,
        onSave: props.structuredTab.onSave,
      };
    default:
      return {
        visible: false,
        label: "",
        savingLabel: "",
        isSaving: false,
        onSave: () => undefined,
      };
  }
}
