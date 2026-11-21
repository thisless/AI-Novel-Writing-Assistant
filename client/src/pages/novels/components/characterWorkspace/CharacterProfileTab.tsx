import AiButton from "@/components/common/AiButton";
import SelectControl from "@/components/common/SelectControl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VISIBLE_PROFILE_FIELDS } from "./characterWorkspace.helpers";
import type { EditableCharacterFormProps } from "./characterWorkspace.types";

interface CharacterProfileTabProps extends EditableCharacterFormProps {
  onSyncTimeline: () => void;
  isSyncingTimeline: boolean;
  onSyncAllTimeline: () => void;
  isSyncingAllTimeline: boolean;
  onWorldCheck: () => void;
  isCheckingWorld: boolean;
}

export default function CharacterProfileTab(props: CharacterProfileTabProps) {
  const {
    characterForm,
    onCharacterFormChange,
    onSaveCharacter,
    isSavingCharacter,
    onSyncTimeline,
    isSyncingTimeline,
    onSyncAllTimeline,
    isSyncingAllTimeline,
    onWorldCheck,
    isCheckingWorld,
  } = props;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border/70 bg-muted/10 p-4">
        <div className="mb-3">
          <div className="text-sm font-medium">Basic profile</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">
            Maintain the character details that should remain consistent during chapter generation. Their current state and goal influence their actions in future chapters.
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <Input
            placeholder="Character name"
            value={characterForm.name}
            onChange={(event) => onCharacterFormChange("name", event.target.value)}
          />
          <Input
            placeholder="Character role"
            value={characterForm.role}
            onChange={(event) => onCharacterFormChange("role", event.target.value)}
          />
          <SelectControl
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={characterForm.gender}
            onChange={(event) => onCharacterFormChange("gender", event.target.value)}
          >
            <option value="unknown">Gender: Unknown</option>
            <option value="male">Gender: Male</option>
            <option value="female">Gender: Female</option>
            <option value="other">Gender: Other</option>
          </SelectControl>
        </div>
      </section>

      <section className="rounded-xl border border-border/70 bg-background p-4">
        <div className="mb-3 text-sm font-medium">Current situation</div>
        <div className="grid gap-2 md:grid-cols-2">
          <Input
            placeholder="Current state (e.g., recovering from a serious injury)"
            value={characterForm.currentState}
            onChange={(event) => onCharacterFormChange("currentState", event.target.value)}
          />
          <Input
            placeholder="Current goal (e.g., break through within three months)"
            value={characterForm.currentGoal}
            onChange={(event) => onCharacterFormChange("currentGoal", event.target.value)}
          />
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-3">
        <TextAreaField
          label="Additional personality details"
          value={characterForm.personality}
          onChange={(value) => onCharacterFormChange("personality", value)}
        />
        <TextAreaField
          label="Additional background"
          value={characterForm.background}
          onChange={(value) => onCharacterFormChange("background", value)}
        />
        <TextAreaField
          label="Additional character arc details"
          value={characterForm.development}
          onChange={(value) => onCharacterFormChange("development", value)}
        />
      </section>

      <section className="rounded-xl border border-border/70 bg-background p-4">
        <div className="mb-3 text-sm font-medium">Quick edit visible details</div>
        <div className="grid gap-2 md:grid-cols-2">
          {VISIBLE_PROFILE_FIELDS.map((field) => (
            <textarea
              key={field.key}
              className="min-h-[72px] w-full rounded-md border bg-background p-2 text-sm"
              placeholder={`${field.label}：${field.placeholder}`}
              value={characterForm[field.key]}
              onChange={(event) => onCharacterFormChange(field.key, event.target.value)}
            />
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2 rounded-xl border border-border/70 bg-muted/10 p-3">
        <Button size="sm" onClick={onSaveCharacter} disabled={isSavingCharacter}>
          {isSavingCharacter ? "Saving..." : "Save character profile"}
        </Button>
        <AiButton size="sm" variant="outline" onClick={onSyncTimeline} disabled={isSyncingTimeline}>
          {isSyncingTimeline ? "Syncing..." : "Sync character timeline"}
        </AiButton>
        <AiButton size="sm" variant="outline" onClick={onSyncAllTimeline} disabled={isSyncingAllTimeline}>
          {isSyncingAllTimeline ? "Syncing..." : "Sync all character timelines"}
        </AiButton>
        <AiButton size="sm" variant="outline" onClick={onWorldCheck} disabled={isCheckingWorld}>
          {isCheckingWorld ? "Checking..." : "Check world consistency"}
        </AiButton>
      </div>
    </div>
  );
}

function TextAreaField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-xl border border-border/70 bg-background p-3">
      <span className="text-sm font-medium">{props.label}</span>
      <textarea
        className="mt-2 min-h-[116px] w-full rounded-md border bg-background p-2 text-sm"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}
