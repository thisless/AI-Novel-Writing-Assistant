import type { Character } from "@ai-novel/shared/types/novel";
import AiButton from "@/components/common/AiButton";
import { Button } from "@/components/ui/button";
import { StatusRail, StepActionBar, StepHero } from "../workspaceShell";

interface CharacterPreparationHeroProps {
  characters: Character[];
  coreCharacterCount: number;
  selectedCharacter?: Character;
  baseCharacterCount: number;
  pendingCharacterResourceCount: number;
  onOpenCreateDialog: () => void;
  onOpenSupplementalDialog: () => void;
  onEvolveCharacter: () => void;
  isEvolvingCharacter: boolean;
  selectedCharacterId: string;
}

export default function CharacterPreparationHero(props: CharacterPreparationHeroProps) {
  const {
    characters,
    coreCharacterCount,
    selectedCharacter,
    baseCharacterCount,
    pendingCharacterResourceCount,
    onOpenCreateDialog,
    onOpenSupplementalDialog,
    onEvolveCharacter,
    isEvolvingCharacter,
    selectedCharacterId,
  } = props;
  const recommendedAction = getRecommendedAction({
    characterCount: characters.length,
    coreCharacterCount,
    selectedCharacter,
    pendingCharacterResourceCount,
  });

  return (
    <StepHero
      eyebrow="Cast"
      title="Character preparation"
      description="Build a cast of characters as ongoing story assets. Fill out the cast, then switch between profiles, visible details, resources, timelines, and relationships."
      className="border border-border/60 bg-[linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--muted))_100%)] shadow-sm"
    >
      <StatusRail
        items={[
          {
            label: "Characters",
            value: characters.length,
            description: characters.length > 0 ? "The cast is taking shape." : "Create a protagonist or import a character.",
            tone: characters.length > 0 ? "success" : "warning",
          },
          {
            label: "Core characters",
            value: coreCharacterCount,
            description: coreCharacterCount > 0 ? "Add more antagonists, allies, and sources of pressure." : "Define at least the protagonist and main antagonist.",
            tone: coreCharacterCount > 0 ? "success" : "warning",
          },
          {
            label: "Current focus",
            value: selectedCharacter?.name ?? "No character selected",
            description: selectedCharacter?.role || `${baseCharacterCount} characters available to import`,
            tone: selectedCharacter ? "info" : "neutral",
          },
        ]}
      />
      <StepActionBar
        className="mt-4 border border-border/60 bg-background/80"
        label="Suggested next step"
        description={recommendedAction}
        actions={(
          <>
            <Button onClick={onOpenCreateDialog}>Add character</Button>
            <AiButton variant="outline" onClick={onOpenSupplementalDialog}>
              Add supporting characters
            </AiButton>
            <AiButton
              variant="secondary"
              onClick={onEvolveCharacter}
              disabled={isEvolvingCharacter || !selectedCharacterId}
            >
              {isEvolvingCharacter ? "Updating..." : "Update current state with AI"}
            </AiButton>
          </>
        )}
      />
    </StepHero>
  );
}

function getRecommendedAction(input: {
  characterCount: number;
  coreCharacterCount: number;
  selectedCharacter?: Character;
  pendingCharacterResourceCount: number;
}): string {
  if (input.characterCount === 0) {
    return "Create or import a protagonist to give future world-building, volume planning, and chapter generation a clear central character.";
  }
  if (input.coreCharacterCount === 0) {
    return "Identify the protagonist, main antagonist, and key allies so future chapters have consistent sources of pressure.";
  }
  if (input.pendingCharacterResourceCount > 0) {
    return `${input.pendingCharacterResourceCount} resource changes need review. Check them on the Resources tab.`;
  }
  if (!input.selectedCharacter) {
    return "Select a character to manage their profile, visible details, resources, and timeline.";
  }
  return "Review the character's current goal, latest appearance, and key resources before asking AI to update their state.";
}
