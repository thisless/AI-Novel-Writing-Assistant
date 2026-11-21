import type {
  VolumeBeatSheet,
  VolumeChapterListGenerationMode,
  VolumeGenerationScopeInput,
  VolumePlan,
  VolumePlanDocument,
} from "@ai-novel/shared/types/novel";
import { findBeatSheet } from "../volumePlan.utils";
import type { ChapterDetailMode } from "../chapterDetailPlanning.shared";

export interface ChapterListGenerationRequest {
  generationMode?: VolumeChapterListGenerationMode;
  targetBeatKey?: string;
}

export interface VolumeGenerationPayload {
  scope: VolumeGenerationScopeInput;
  generationMode?: VolumeChapterListGenerationMode;
  targetVolumeId?: string;
  targetBeatKey?: string;
  targetChapterId?: string;
  detailMode?: ChapterDetailMode;
  draftVolumesOverride?: VolumePlan[];
  suppressSuccessMessage?: boolean;
}

export function startStrategyGenerationAction(params: {
  ensureCharacterGuard: () => boolean;
  userPreferredVolumeCount: number | null;
  forceSystemRecommendedVolumeCount: boolean;
  volumeCountGuidance: {
    systemRecommendedVolumeCount: number;
    allowedVolumeCountRange: { min: number; max: number };
    decisionVolumeCountRange: { min: number; max: number };
    respectedExistingVolumeCount?: number | null;
  };
  hasUnsavedVolumeDraft: boolean;
  generate: (payload: VolumeGenerationPayload) => void;
}): void {
  if (!params.ensureCharacterGuard()) {
    return;
  }
  const confirmed = window.confirm([
    "Generate a volume strategy recommendation to help decide the suggested number of volumes, fixed planning count, and each volume's role.",
    "This step won't generate the volume outline or chapter breakdown.",
    params.userPreferredVolumeCount != null
      ? `Generate the volume strategy for a fixed count of ${params.userPreferredVolumeCount} volumes.`
      : params.forceSystemRecommendedVolumeCount
        ? `Use the system-recommended count of ${params.volumeCountGuidance.systemRecommendedVolumeCount} volumes, not the current draft count.`
        : params.volumeCountGuidance.respectedExistingVolumeCount != null
          ? `Prefer the current draft structure of ${params.volumeCountGuidance.respectedExistingVolumeCount} volumes, within the allowed range of ${params.volumeCountGuidance.allowedVolumeCountRange.min}–${params.volumeCountGuidance.allowedVolumeCountRange.max}.`
          : `The system currently recommends ${params.volumeCountGuidance.systemRecommendedVolumeCount} volumes; the suggested range is ${params.volumeCountGuidance.decisionVolumeCountRange.min}–${params.volumeCountGuidance.decisionVolumeCountRange.max}.`,
    params.hasUnsavedVolumeDraft ? "The current unsaved page draft will be used as reference." : "The recommendation will use the current workspace state.",
  ].join("\n\n"));
  if (!confirmed) {
    return;
  }
  params.generate({ scope: "strategy" });
}

export function startStrategyCritiqueAction(params: {
  ensureCharacterGuard: () => boolean;
  generate: (payload: VolumeGenerationPayload) => void;
}): void {
  if (!params.ensureCharacterGuard()) {
    return;
  }
  params.generate({ scope: "strategy_critique" });
}

export function startSkeletonGenerationAction(params: {
  ensureCharacterGuard: () => boolean;
  hasUnsavedVolumeDraft: boolean;
  generate: (payload: VolumeGenerationPayload) => void;
}): void {
  if (!params.ensureCharacterGuard()) {
    return;
  }
  const confirmed = window.confirm([
    "Generate or regenerate the book's volume outline from the current volume strategy recommendation.",
    "Existing beat sheets and adjacent-volume rebalancing suggestions will be cleared, but chapter prose won't be deleted.",
    params.hasUnsavedVolumeDraft ? "The current page draft will be used as context for the volume outline." : "Continue from the current volume workspace.",
  ].join("\n\n"));
  if (!confirmed) {
    return;
  }
  params.generate({ scope: "skeleton" });
}

export function startBeatSheetGenerationAction(params: {
  volumeId: string;
  normalizedVolumeDraft: VolumePlan[];
  strategyPlan: object | null;
  beatSheets: VolumeBeatSheet[];
  ensureCharacterGuard: () => boolean;
  setStructuredMessage: (value: string) => void;
  generate: (payload: VolumeGenerationPayload) => void;
}): void {
  const targetVolume = params.normalizedVolumeDraft.find((volume) => volume.id === params.volumeId);
  if (!targetVolume) {
    params.setStructuredMessage("This volume doesn't exist, so a beat sheet can't be generated.");
    return;
  }
  if (!params.strategyPlan) {
    params.setStructuredMessage("Generate a volume strategy recommendation before generating the current volume's beat sheet.");
    return;
  }
  if (!params.ensureCharacterGuard()) {
    return;
  }
  const existingBeatSheet = findBeatSheet(params.beatSheets, params.volumeId);
  if (existingBeatSheet) {
    const confirmed = window.confirm([
      `Regenerate the beat sheet for "${targetVolume.title?.trim() || `Volume ${targetVolume.sortOrder}`}".`,
      "This will replace the current volume's beat sections and deliverables.",
      "Existing chapter lists and refinement assets won't be deleted, but check whether the chapter list still matches if the new beat ranges change.",
    ].join("\n\n"));
    if (!confirmed) {
      return;
    }
  }
  params.generate({
    scope: "beat_sheet",
    targetVolumeId: params.volumeId,
  });
}

export function startChapterListGenerationAction(params: {
  volumeId: string;
  request?: ChapterListGenerationRequest;
  normalizedVolumeDraft: VolumePlan[];
  beatSheets: VolumeBeatSheet[];
  ensureCharacterGuard: () => boolean;
  setStructuredMessage: (value: string) => void;
  generate: (payload: VolumeGenerationPayload) => void;
}): void {
  const targetVolume = params.normalizedVolumeDraft.find((volume) => volume.id === params.volumeId);
  if (!targetVolume) {
    params.setStructuredMessage("This volume doesn't exist, so a chapter list can't be generated.");
    return;
  }
  if (!findBeatSheet(params.beatSheets, params.volumeId)) {
    params.setStructuredMessage("This volume doesn't have a beat sheet yet. Generate one before creating a chapter list.");
    return;
  }
  if (!params.ensureCharacterGuard()) {
    return;
  }
  const generationMode = params.request?.generationMode ?? "full_volume";
  const targetBeatKey = params.request?.targetBeatKey?.trim();
  if (generationMode === "single_beat" && !targetBeatKey) {
    params.setStructuredMessage("This beat section doesn't exist, so its chapter titles can't be regenerated.");
    return;
  }
  params.generate({
    scope: "chapter_list",
    generationMode,
    targetVolumeId: params.volumeId,
    targetBeatKey,
  });
}

export function buildChapterListSuccessMessage(params: {
  document: VolumePlanDocument;
  targetVolumeId?: string;
  generationMode?: VolumeChapterListGenerationMode;
  targetBeatKey?: string;
  autoSyncedToChapterExecution?: boolean;
}): string {
  const updatedVolume = params.targetVolumeId
    ? params.document.volumes.find((volume) => volume.id === params.targetVolumeId)
    : undefined;
  const updatedChapterCount = updatedVolume?.chapters.length ?? 0;
  const syncSuffix = params.autoSyncedToChapterExecution ? " and connected to chapter execution" : "";
  if (params.generationMode === "single_beat" && params.targetVolumeId && params.targetBeatKey) {
    const targetBeat = findBeatSheet(params.document.beatSheets, params.targetVolumeId)?.beats
      .find((beat) => beat.key === params.targetBeatKey);
    return updatedChapterCount > 0
      ? `Beat section "${targetBeat ? `${targetBeat.label}${targetBeat.title ? ` · ${targetBeat.title}` : ""}` : params.targetBeatKey}" generated and saved${syncSuffix}. This volume now has ${updatedChapterCount} chapters.`
      : `Beat section "${targetBeat ? `${targetBeat.label}${targetBeat.title ? ` · ${targetBeat.title}` : ""}` : params.targetBeatKey}" generated and saved${syncSuffix}.`;
  }
  return updatedChapterCount > 0
    ? `Current volume chapter list generated and saved${syncSuffix}. It now contains ${updatedChapterCount} chapters, and adjacent-volume rebalancing suggestions were also updated.`
    : `Current volume chapter list generated and saved${syncSuffix}. Adjacent-volume rebalancing suggestions were also updated.`;
}
