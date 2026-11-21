import { useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Castle, Plus } from "lucide-react";
import type { WorldForce, WorldStructuredData } from "@ai-novel/shared/types/world";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HandbookField, HandbookTextarea, SectionHeader } from "./HandbookPrimitives";
import { makeId, removeItem, updateItem } from "./handbookEditorUtils";

export default function WorldHandbookForceSection(props: {
  draftStructure: WorldStructuredData;
  setDraftStructure: Dispatch<SetStateAction<WorldStructuredData | null>>;
}) {
  const { draftStructure, setDraftStructure } = props;
  const forceSummary = useMemo(() => {
    const forceNames = draftStructure.forces.map((force) => force.name).filter(Boolean).slice(0, 4);
    return forceNames.length > 0 ? forceNames.join(" / ") : "Add major powers to clarify character identities, faction conflicts, and chapter-level pressures.";
  }, [draftStructure.forces]);

  const addForce = () => {
    setDraftStructure((prev) =>
      prev
        ? {
          ...prev,
          forces: [
            ...prev.forces,
            {
              id: makeId("force", prev.forces.length),
              name: "",
              type: "",
              factionId: null,
              summary: "",
              baseOfPower: "",
              currentObjective: "",
              pressure: "",
              leader: null,
              narrativeRole: "",
            },
          ],
        }
        : prev,
    );
  };

  return (
    <section className="rounded-md border p-4">
      <SectionHeader
        icon={Castle}
        title="Major powers"
        description={`Show creators who is competing for resources, who creates obstacles, and where characters might come from. ${forceSummary}`}
        count={draftStructure.forces.length}
      />
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {draftStructure.forces.map((force: WorldForce, index) => (
          <div key={force.id || index} className="rounded-md border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">Power {index + 1}</div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setDraftStructure((prev) => (prev ? { ...prev, forces: removeItem(prev.forces, index) } : prev))
                }
              >
                Remove
              </Button>
            </div>
            <div className="mt-3 grid gap-3">
              <HandbookField title="Power name" hint="An organization characters may come from, join, betray, or oppose.">
                <Input
                  value={force.name}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev ? { ...prev, forces: updateItem(prev.forces, index, { name: event.target.value }) } : prev,
                    )
                  }
                  placeholder="Star Emperor's court, Celestial Bureau, Demon Alliance"
                />
              </HandbookField>
              <HandbookField title="Power type" hint="Help AI understand how it operates and what kind of organization it is.">
                <Input
                  value={force.type}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev ? { ...prev, forces: updateItem(prev.forces, index, { type: event.target.value }) } : prev,
                    )
                  }
                  placeholder="Dynasty, sect, company, underground organization…"
                />
              </HandbookField>
              <HandbookField title="What it represents" hint="Describe its position, resources, and defining traits.">
                <HandbookTextarea
                  value={force.summary}
                  onChange={(value) =>
                    setDraftStructure((prev) =>
                      prev ? { ...prev, forces: updateItem(prev.forces, index, { summary: value }) } : prev,
                    )
                  }
                  placeholder="What does this power represent in the world?"
                  minRows={3}
                />
              </HandbookField>
              <HandbookField title="Current objective" hint="Objectives drive chapter events and character conflicts.">
                <Input
                  value={force.currentObjective}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev
                        ? { ...prev, forces: updateItem(prev.forces, index, { currentObjective: event.target.value }) }
                        : prev,
                    )
                  }
                  placeholder="Claim a mineral vein, suppress the truth, find a lost heir"
                />
              </HandbookField>
              <HandbookField title="Pressure on the story" hint="This may force the protagonist or other powers to choose, flee, negotiate, or fight.">
                <Input
                  value={force.pressure}
                  onChange={(event) =>
                    setDraftStructure((prev) =>
                      prev ? { ...prev, forces: updateItem(prev.forces, index, { pressure: event.target.value }) } : prev,
                    )
                  }
                  placeholder="Hunt the protagonist, control resources, start a war, trigger a crisis of trust"
                />
              </HandbookField>
            </div>
          </div>
        ))}
      </div>
      <Button type="button" className="mt-3" variant="outline" onClick={addForce}>
        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
        Add major power
      </Button>
    </section>
  );
}
