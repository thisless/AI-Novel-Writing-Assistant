import type { DirectorVersion } from "@ai-novel/shared/types/director/version";

export function getDirectionGenerationDisabledReasons(input: {
  idea: string;
  directorVersion: DirectorVersion;
  availableVersions: readonly DirectorVersion[];
  versionsLoading: boolean;
  versionsError: boolean;
  isGenerating: boolean;
  requireCreativeCarryoverAdopted: boolean;
  creativeCarryoverAdopted: boolean;
}): string[] {
  const reasons: string[] = [];
  if (!input.idea.trim()) {
    reasons.push("Return to Step 1 and enter an idea for this book.");
  }
  if (input.versionsLoading) {
    reasons.push("Loading available director versions. Please wait.");
  } else if (input.versionsError) {
    reasons.push("Failed to load available director versions. Please try again.");
  } else if (!input.availableVersions.includes(input.directorVersion)) {
    reasons.push("The selected director version is unavailable. Choose an available version.");
  }
  if (input.isGenerating) {
    reasons.push("Generating the book direction. Please wait for this to finish.");
  }
  if (input.requireCreativeCarryoverAdopted && !input.creativeCarryoverAdopted) {
    reasons.push("Open the creative plan and apply the recommended option.");
  }
  return reasons;
}
