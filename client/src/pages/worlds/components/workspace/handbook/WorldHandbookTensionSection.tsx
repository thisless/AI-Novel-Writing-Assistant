import { GitBranch } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { WorldStructuredData } from "@ai-novel/shared/types/world";
import { Button } from "@/components/ui/button";
import { HandbookField, HandbookTextarea, SectionHeader } from "./HandbookPrimitives";
import { listToText, textToList } from "./handbookEditorUtils";

export default function WorldHandbookTensionSection(props: {
  draftStructure: WorldStructuredData;
  setDraftStructure: Dispatch<SetStateAction<WorldStructuredData | null>>;
  onOpenDeepening: () => void;
  onOpenLayers: () => void;
  onOpenAdvanced: () => void;
}) {
  const { draftStructure, setDraftStructure, onOpenDeepening, onOpenLayers, onOpenAdvanced } = props;

  return (
    <section className="rounded-md border p-4">
      <SectionHeader
        icon={GitBranch}
        title="Key tensions"
        description="Distill the worldbuilding into problems that keep the story moving, so the world is more than background."
      />
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <HandbookField title="Core world conflict" hint="An ongoing clash between resources, order, power systems, or faction goals.">
          <HandbookTextarea
            value={draftStructure.profile.coreConflict}
            onChange={(value) =>
              setDraftStructure((prev) => (prev ? { ...prev, profile: { ...prev.profile, coreConflict: value } } : prev))
            }
            placeholder="For example: dwindling resources, collapsing order, or incompatible power systems."
          />
        </HandbookField>
        <HandbookField title="Shared consequences" hint="List the lasting costs created by the world's rules, one per line.">
          <HandbookTextarea
            value={listToText(draftStructure.rules.sharedConsequences)}
            onChange={(value) =>
              setDraftStructure((prev) =>
                prev ? { ...prev, rules: { ...prev.rules, sharedConsequences: textToList(value) } } : prev,
              )
            }
            placeholder="Greater power brings greater risk of mutation&#10;Prosperous cities depend more on dangerous resources"
          />
        </HandbookField>
        <HandbookField title="Taboos" hint="List character backgrounds, uses of power, or plot resolutions that must not appear, one per line.">
          <HandbookTextarea
            value={listToText(draftStructure.rules.taboo)}
            onChange={(value) =>
              setDraftStructure((prev) => (prev ? { ...prev, rules: { ...prev.rules, taboo: textToList(value) } } : prev))
            }
            placeholder="Mortals cannot control star cores without a cost&#10;Court spies cannot openly join the Demon faction"
          />
        </HandbookField>
        <div className="rounded-md border border-dashed p-3 text-sm leading-6 text-muted-foreground">
          Use the advanced structure editor to refine power relationships, location control, or import structured data. Most creators only need to maintain the handbook content on this page.
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onOpenDeepening}>
              Answer questions
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onOpenLayers}>
              Layer summaries
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onOpenAdvanced}>
              Advanced structure editor
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
