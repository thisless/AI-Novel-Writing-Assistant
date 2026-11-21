import type { CharacterCastRole } from "@ai-novel/shared/types/novelCharacter";
import type { WorkspaceCharacter } from "../model";

const castLabels: Record<CharacterCastRole, { label: string; detail: string }> = {
  protagonist: { label: "Protagonist", detail: "Protagonist" },
  antagonist: { label: "Antagonist", detail: "Primary antagonist" },
  ally: { label: "Supporting", detail: "Ally" },
  foil: { label: "Supporting", detail: "Foil" },
  mentor: { label: "Supporting", detail: "Mentor" },
  love_interest: { label: "Supporting", detail: "Love interest" },
  pressure_source: { label: "Supporting", detail: "Pressure source" },
  catalyst: { label: "Supporting", detail: "Story catalyst" },
};

export function CharacterDirectoryItem({ character, active, onSelect }: {
  character: WorkspaceCharacter;
  active: boolean;
  onSelect: () => void;
}) {
  const cast = character.castRole ? castLabels[character.castRole] : undefined;
  const label = cast?.label ?? "Role not set";
  const detail = cast ? `Story role: ${cast.label} (${cast.detail})` : label;
  const identity = character.role?.trim() || character.identityLabel?.trim() || "Identity not set";
  return <button type="button" aria-current={active ? "true" : undefined}
    aria-label={`${character.name}, ${detail}, ${identity}`}
    className={`flex w-full min-w-0 flex-col gap-1 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-primary/10 font-medium text-primary" : "text-foreground/80"}`}
    onClick={onSelect}>
    <span className="flex w-full min-w-0 items-center gap-2">
      <span className="min-w-0 flex-1 truncate" title={character.name}>{character.name}</span>
      <span title={detail} className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${character.castRole === "protagonist" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{label}</span>
    </span>
    <span title={identity} className="w-full truncate text-xs font-normal text-muted-foreground">{identity}</span>
  </button>;
}
