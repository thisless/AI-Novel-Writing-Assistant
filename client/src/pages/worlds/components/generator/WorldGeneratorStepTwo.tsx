import type {
  WorldSkeletonGenerationCounts,
  WorldSkeletonPreset,
} from "@ai-novel/shared/types/worldWizard";
import {
  WORLD_SKELETON_COUNT_LIMITS,
  WORLD_SKELETON_PRESET_COUNTS,
} from "@ai-novel/shared/types/worldWizard";
import { Button } from "@/components/ui/button";

const PRESET_CARDS: Array<{
  value: WorldSkeletonPreset;
  title: string;
  description: string;
}> = [
  {
    value: "light",
    title: "Lightweight setting",
    description: "For short stories, a single main plot, or lower complexity. Start with a clear, easy-to-write setting.",
  },
  {
    value: "standard",
    title: "Standard novel",
    description: "For most long-form web novels. Generates a useful set of rules, powers, locations, and story entry points.",
  },
  {
    value: "epic",
    title: "Complex ensemble",
    description: "For stories with many powers, locations, and concurrent conflicts that need a richer map and relationship network.",
  },
];

const COUNT_LABELS: Record<keyof WorldSkeletonGenerationCounts, string> = {
  rules: "Core rules",
  factionGroups: "Faction directions",
  forces: "Powers",
  locations: "Key locations",
  conflicts: "Relationships / conflicts",
  storyEntrySuggestions: "Story entry points",
};

interface WorldGeneratorStepTwoProps {
  preset: WorldSkeletonPreset;
  counts: WorldSkeletonGenerationCounts;
  generating: boolean;
  onPresetChange: (preset: WorldSkeletonPreset) => void;
  onCountChange: (key: keyof WorldSkeletonGenerationCounts, value: number) => void;
  onGenerateSkeleton: () => void;
}

export default function WorldGeneratorStepTwo(props: WorldGeneratorStepTwoProps) {
  const {
    preset,
    counts,
    generating,
    onPresetChange,
    onCountChange,
    onGenerateSkeleton,
  } = props;

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-background p-4">
        <div className="text-sm font-medium">Choose world size</div>
        <div className="mt-1 text-xs text-muted-foreground">
          World size determines how many rules, factions, powers, key locations, and story entry points AI generates. "Standard novel" is recommended.
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {PRESET_CARDS.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`rounded-md border p-4 text-left transition ${
              preset === item.value ? "border-primary bg-primary/5" : "bg-background hover:border-primary/60"
            }`}
            onClick={() => onPresetChange(item.value)}
          >
            <div className="text-sm font-semibold">{item.title}</div>
            <div className="mt-2 text-xs leading-5 text-muted-foreground">{item.description}</div>
            <div className="mt-3 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              <span>Powers {WORLD_SKELETON_PRESET_COUNTS[item.value].forces}</span>
              <span>Locations {WORLD_SKELETON_PRESET_COUNTS[item.value].locations}</span>
              <span>Conflicts {WORLD_SKELETON_PRESET_COUNTS[item.value].conflicts}</span>
              <span>Entry points {WORLD_SKELETON_PRESET_COUNTS[item.value].storyEntrySuggestions}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-md border p-4">
        <div className="text-sm font-medium">Adjust quantities</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Beginners should keep the defaults. Adjust these only if you know you want a smaller or larger world.
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(Object.keys(COUNT_LABELS) as Array<keyof WorldSkeletonGenerationCounts>).map((key) => {
            const limit = WORLD_SKELETON_COUNT_LIMITS[key];
            return (
              <label key={key} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{COUNT_LABELS[key]}</span>
                  <span className="text-xs text-muted-foreground">{counts[key]}</span>
                </div>
                <input
                  className="mt-3 w-full"
                  type="range"
                  min={limit.min}
                  max={limit.max}
                  step={1}
                  value={counts[key]}
                  onChange={(event) => onCountChange(key, Number(event.target.value))}
                />
              </label>
            );
          })}
        </div>
      </div>

      <Button onClick={onGenerateSkeleton} disabled={generating}>
        {generating ? "Generating world skeleton…" : "Generate world skeleton"}
      </Button>
    </div>
  );
}
