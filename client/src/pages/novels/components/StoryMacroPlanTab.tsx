import type { StoryConflictLayers } from "@ai-novel/shared/types/storyMacro";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { StoryMacroTabProps } from "./NovelEditView.types";
import {
  ENGINE_TEXT_FIELDS,
  FieldActions,
  listToText,
} from "./StoryMacroPlanTab.shared";
import DirectorTakeoverEntryPanel from "./DirectorTakeoverEntryPanel";
import { DetailDisclosure } from "./workspaceShell";
import StoryEngineStudio from "./storyMacroPlan/StoryEngineStudio";
import StoryMacroEditableField from "./storyMacroPlan/StoryMacroEditableField";

const EMPTY_CONFLICT_LAYERS: StoryConflictLayers = {
  external: "",
  internal: "",
  relational: "",
};

export default function StoryMacroPlanTab(props: StoryMacroTabProps) {
  const expansion = props.expansion ?? {
    expanded_premise: "",
    protagonist_core: "",
    conflict_engine: "",
    conflict_layers: EMPTY_CONFLICT_LAYERS,
    mystery_box: "",
    emotional_line: "",
    setpiece_seeds: [],
    tone_reference: "",
  };

  return (
    <div className="space-y-4">
      <DirectorTakeoverEntryPanel
        title="Start Auto Director from the story macro plan"
        description="AI will check whether the story macro plan and book contract are ready, then fill in missing content or rerun the current step as requested."
        entry={props.directorTakeoverEntry}
      />
      <StoryEngineStudio tab={props} />

      <DetailDisclosure
        title="Story engine and advanced constraints"
        description="These advanced story engine editing and diagnostic tools are collapsed by default to keep the workspace manageable while you define the direction."
      >
        <div className="space-y-4">
          {props.expansion ? (
            <Card>
              <CardHeader>
                <CardTitle>Story engine blueprint</CardTitle>
                <CardDescription>
                  Define what sustains the story: how the protagonist is trapped, how conflict escalates, and how unanswered questions keep readers engaged.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 xl:grid-cols-2">
                  {ENGINE_TEXT_FIELDS.map((item) => {
                    const value = expansion[item.field as keyof typeof expansion];
                    return (
                      <StoryMacroEditableField
                        key={item.field}
                        label={item.label}
                        value={typeof value === "string" ? value : ""}
                        onChange={(value) => props.onFieldChange(item.field, value)}
                        placeholder={item.placeholder}
                        className="bg-muted/10 p-4"
                        actions={
                          <FieldActions
                            field={item.field}
                            lockedFields={props.lockedFields}
                            regeneratingField={props.regeneratingField}
                            storyInput={props.storyInput}
                            onToggleLock={props.onToggleLock}
                            onRegenerateField={props.onRegenerateField}
                          />
                        }
                      />
                    );
                  })}
                </div>

                <div className="space-y-2 bg-muted/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium text-foreground">Conflict layers</div>
                    <FieldActions
                      field="conflict_layers"
                      lockedFields={props.lockedFields}
                      regeneratingField={props.regeneratingField}
                      storyInput={props.storyInput}
                      onToggleLock={props.onToggleLock}
                      onRegenerateField={props.onRegenerateField}
                    />
                  </div>
                  <div className="grid gap-4 xl:grid-cols-3">
                    <StoryMacroEditableField
                      label="External pressure"
                      value={expansion.conflict_layers.external}
                      onChange={(value) => props.onFieldChange("conflict_layers", {
                        ...expansion.conflict_layers,
                        external: value,
                      })}
                      placeholder="How external systems, threats, or circumstances keep pressuring the protagonist."
                    />
                    <StoryMacroEditableField
                      label="Internal struggle"
                      value={expansion.conflict_layers.internal}
                      onChange={(value) => props.onFieldChange("conflict_layers", {
                        ...expansion.conflict_layers,
                        internal: value,
                      })}
                      placeholder="How the protagonist's fears, desires, or misjudgments backfire."
                    />
                    <StoryMacroEditableField
                      label="Relationship pressure"
                      value={expansion.conflict_layers.relational}
                      onChange={(value) => props.onFieldChange("conflict_layers", {
                        ...expansion.conflict_layers,
                        relational: value,
                      })}
                      placeholder="How key relationships create difficult choices and emotional tension."
                    />
                  </div>
                </div>

                <StoryMacroEditableField
                  label="High-tension scene ideas"
                  value={listToText(expansion.setpiece_seeds)}
                  onChange={(value) => props.onFieldChange(
                    "setpiece_seeds",
                    value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
                  )}
                  placeholder="Enter one high-tension scene per line."
                  list
                  className="bg-muted/10 p-4"
                  actions={
                    <FieldActions
                      field="setpiece_seeds"
                      lockedFields={props.lockedFields}
                      regeneratingField={props.regeneratingField}
                      storyInput={props.storyInput}
                      onToggleLock={props.onToggleLock}
                      onRegenerateField={props.onRegenerateField}
                    />
                  }
                />
              </CardContent>
            </Card>
          ) : null}

          {props.issues.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Conflicts and information gaps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {props.issues.map((issue, index) => (
                  <div key={`${issue.type}-${issue.field}-${index}`} className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <div className="font-medium">{issue.type === "conflict" ? "Conflicting inputs" : "Insufficient information"}</div>
                    <div className="mt-1">{issue.message}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Hard constraints</CardTitle>
              <CardDescription>
                These rules set firm boundaries for future generation and help keep the story consistent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <StoryMacroEditableField
                label="Narrative rules"
                value={listToText(props.constraints)}
                onChange={(value) => props.onFieldChange(
                  "constraints",
                  value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
                )}
                placeholder="Enter one narrative rule per line."
                list
                actions={
                  <FieldActions
                    field="constraints"
                    lockedFields={props.lockedFields}
                    regeneratingField={props.regeneratingField}
                    storyInput={props.storyInput}
                    onToggleLock={props.onToggleLock}
                    onRegenerateField={props.onRegenerateField}
                  />
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Constraint engine</CardTitle>
              <CardDescription>
                These saved rules are used directly for future characters, storylines, and chapter plans.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {props.constraintEngine ? (
                <>
                  <div className="space-y-2 rounded-xl border border-border/70 p-4">
                    <div className="text-sm font-medium text-foreground">Story premise</div>
                    <div className="text-sm leading-7 text-muted-foreground">{props.constraintEngine.premise}</div>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="space-y-2 rounded-xl border border-border/70 p-4">
                      <div className="text-sm font-medium text-foreground">Central mystery</div>
                      <div className="text-sm text-muted-foreground">{props.constraintEngine.mystery_box}</div>
                    </div>
                    <div className="space-y-2 rounded-xl border border-border/70 p-4">
                      <div className="text-sm font-medium text-foreground">Conflict axis</div>
                      <div className="text-sm text-muted-foreground">{props.constraintEngine.conflict_axis}</div>
                    </div>
                    <div className="space-y-2 rounded-xl border border-border/70 p-4">
                      <div className="text-sm font-medium text-foreground">Roles that create pressure</div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {props.constraintEngine.pressure_roles.map((item) => (
                          <div key={item}>{item}</div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 rounded-xl border border-border/70 p-4">
                      <div className="text-sm font-medium text-foreground">Growth milestones</div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {props.constraintEngine.growth_path.map((item) => (
                          <div key={item}>{item}</div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 rounded-xl border border-border/70 p-4">
                      <div className="text-sm font-medium text-foreground">Story phases</div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {props.constraintEngine.phase_model.map((phase) => (
                          <div key={phase.name}>
                            <span className="font-medium text-foreground">{phase.name}</span>
                            {" · "}
                            {phase.goal}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 rounded-xl border border-border/70 p-4">
                      <div className="text-sm font-medium text-foreground">Hard constraints</div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {props.constraintEngine.hard_constraints.map((item) => (
                          <div key={item}>{item}</div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 rounded-xl border border-border/70 p-4 xl:col-span-2">
                      <div className="text-sm font-medium text-foreground">Payoff milestones</div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {props.constraintEngine.turning_points.map((item) => (
                          <div key={`${item.phase}-${item.title}`}>
                            <span className="font-medium text-foreground">{item.phase}</span>
                            {" · "}
                            {item.summary}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 rounded-xl border border-border/70 p-4">
                      <div className="text-sm font-medium text-foreground">Must happen in the ending</div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {props.constraintEngine.ending_constraints.must_have.map((item) => (
                          <div key={item}>{item}</div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 rounded-xl border border-border/70 p-4">
                      <div className="text-sm font-medium text-foreground">Must be avoided in the ending</div>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {props.constraintEngine.ending_constraints.must_not_have.map((item) => (
                          <div key={item}>{item}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                  No constraint engine yet. Complete the story engine breakdown, then select “Build constraint engine.”
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Story state</CardTitle>
              <CardDescription>
                Save the current phase and protagonist's situation for future chapters.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-[160px_160px_minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Current phase</div>
                <Input
                  type="number"
                  value={props.state.currentPhase}
                  onChange={(event) => props.onStateChange("currentPhase", Number(event.target.value))}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Progress</div>
                <Input
                  type="number"
                  value={props.state.progress}
                  onChange={(event) => props.onStateChange("progress", Number(event.target.value))}
                  min={0}
                  max={100}
                />
              </div>
              <StoryMacroEditableField
                label="Protagonist's current situation"
                value={props.state.protagonistState}
                onChange={(value) => props.onStateChange("protagonistState", value)}
                placeholder="e.g., Still denying the truth, but no longer able to walk away."
              />
              <div className="flex items-end">
                <Button variant="outline" onClick={props.onSaveState} disabled={props.isSavingState}>
                  {props.isSavingState ? "Saving..." : "Save state"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DetailDisclosure>
    </div>
  );
}
