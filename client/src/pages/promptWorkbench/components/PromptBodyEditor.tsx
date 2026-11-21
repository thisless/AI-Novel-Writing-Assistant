import { useMemo } from "react";
import { CheckCircle2, LockKeyhole, MapPin, RotateCcw, ShieldCheck } from "lucide-react";
import type {
  PromptCatalogItem,
  PromptPreviewResult,
  PromptSlotDefChoice,
  PromptSlotDefToggle,
  PromptSlotReconcileItem,
  PromptSlotReconcileResult,
  PromptTestRunResult,
} from "@/api/promptWorkbench";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  CONTEXT_GROUP_LABELS,
  LOCKED_CONTEXT_GROUPS,
} from "../promptWorkbenchLabels";
import type { PromptEditorSection, PromptSlotValue } from "../promptWorkbenchTypes";
import { PromptPreviewPanel } from "./PromptPreviewPanel";

function getMaxLength(section: PromptEditorSection): number | undefined {
  if ("maxLength" in section.slot) {
    return section.slot.maxLength;
  }
  return undefined;
}

function SlotBadges({ section }: { section: PromptEditorSection }) {
  if (!section.isDirty && !section.isSavedOverride) return null;
  return <span className="text-xs text-muted-foreground">{section.isDirty ? "Unsaved" : section.sourceLabel}</span>;
}

function ReconcileMiniBadge({ item }: { item?: PromptSlotReconcileItem }) {
  if (!item || item.state === "unchanged") {
    return null;
  }
  const label = item.state === "drifted"
    ? "Official version updated"
    : item.state === "new"
      ? "New slot"
      : "Slot removed";
  return (
    <Badge variant="secondary" className="border-amber-200 bg-amber-50 text-amber-800">
      {label}
    </Badge>
  );
}

function PromptSlotSection(props: {
  section: PromptEditorSection;
  reconcileItem?: PromptSlotReconcileItem;
  immersive?: boolean;
  disabled?: boolean;
  onChange: (key: string, value: PromptSlotValue) => void;
  onReset: (key: string) => void;
}) {
  const { disabled, immersive, onChange, onReset, reconcileItem, section } = props;
  const canReset = section.isDirty || section.isSavedOverride;
  const maxLength = getMaxLength(section);

  return (
    <section className={cn(
      "rounded-md bg-card",
      immersive && "bg-card",
      reconcileItem?.state === "drifted" && "border-amber-300 bg-amber-50/[0.25]",
      reconcileItem?.state === "orphaned" && "border-red-200 bg-red-50/30 opacity-80",
    )}>
      <div className="flex flex-col gap-3 pt-4 pb-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">{section.label}</h4>
            <SlotBadges section={section} />
            <ReconcileMiniBadge item={reconcileItem} />
          </div>
          {section.description ? (
            <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
          ) : null}

        </div>
        {canReset ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onReset(section.slotKey)}
            disabled={disabled}
            title={section.isOfficialDefaultOverride ? "Use the default instructions for all novels" : "Restore default instructions"}
            aria-label={`Restore default instructions for ${section.label}`}
            className="h-8 w-8 shrink-0 p-0"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="pb-4">
        {section.kind === "choice" ? (
          <ChoiceSlotControl
            section={section}
            disabled={disabled}
            onChange={(value) => onChange(section.slotKey, value)}
          />
        ) : section.kind === "toggle" ? (
          <ToggleSlotControl
            section={section}
            disabled={disabled}
            onChange={(value) => onChange(section.slotKey, value)}
          />
        ) : section.kind === "token" ? (
          <TokenSlotControl
            section={section}
            disabled={disabled}
            onChange={(value) => onChange(section.slotKey, value)}
          />
        ) : (
          <textarea
            aria-label={section.label}
            value={String(section.value)}
            maxLength={maxLength}
            disabled={disabled}
            placeholder={section.kind === "append" && "placeholderHint" in section.slot
              ? section.slot.placeholderHint : undefined}
            rows={section.kind === "append" ? 3 : 2}
            className="min-h-20 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            onChange={(event) => onChange(section.slotKey, event.target.value)}
          />
        )}

        {"requiredTokens" in section.slot && section.slot.requiredTokens?.length ? (
          <div className="mt-2 text-xs text-muted-foreground">
            Required: {section.slot.requiredTokens.join(", ")}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function reconcileStateLabel(item: PromptSlotReconcileItem): string {
  if (item.state === "drifted") return "Official copy updated";
  if (item.state === "new") return "New official slot";
  return "Slot removed";
}

function displaySlotValue(value: string | boolean | undefined): string {
  if (value === undefined) return "None";
  if (typeof value === "boolean") return value ? "On" : "Off";
  const trimmed = value.trim();
  if (!trimmed) return "Empty";
  return trimmed.length > 160 ? `${trimmed.slice(0, 160)}...` : trimmed;
}

function PromptOfficialVersionPanel(props: {
  reconcile: PromptSlotReconcileResult | null;
  isLoading?: boolean;
  pending?: boolean;
  onApplyOfficial: (slotKeys: string[]) => void;
  onKeepMine: (slotKeys: string[]) => void;
}) {
  const { isLoading, onApplyOfficial, onKeepMine, pending, reconcile } = props;
  const actionableItems = (reconcile?.items ?? []).filter((item) => item.state !== "unchanged");
  const restoreKeys = actionableItems.map((item) => item.key);
  const keepKeys = actionableItems
    .filter((item) => item.state === "drifted" || item.state === "orphaned")
    .map((item) => item.key);

  return (
    <section className="rounded-md bg-muted/30 px-4 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#25443f]">
            <ShieldCheck className="h-4 w-4 text-[#0f766e]" />
            Official version alignment
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#52606d]">
            Compare with the current official slots, restore reliable defaults, or keep your settings and clear version notices.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || restoreKeys.length === 0}
            onClick={() => onApplyOfficial(restoreKeys)}
            className="border-[#b8d9d0] bg-white text-[#0f5f59] hover:bg-[#eaf7f2]"
          >
            Restore current official version
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending || keepKeys.length === 0}
            onClick={() => onKeepMine(keepKeys)}
            className="text-[#52606d] hover:bg-white"
          >
            Keep my settings
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 rounded-md border border-dashed border-[#cbdad6] bg-white px-3 py-3 text-sm text-muted-foreground">
          Loading official version...
        </div>
      ) : actionableItems.length === 0 ? (
        <div className="mt-4 border-b border-border py-3 text-sm text-[#315f58]">
          All slots match the current official version.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {actionableItems.map((item) => (
            <div key={item.key} className="border-b border-border py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{item.label}</span>
                    <Badge variant="secondary" className="border-amber-200 bg-amber-50 text-amber-800">
                      {reconcileStateLabel(item)}
                    </Badge>
                    {item.overrideMode === "official_default" ? (
                      <Badge variant="outline" className="border-[#a7d7ca] bg-[#eaf7f2] text-[#0f766e]">
                        This novel uses the official default
                      </Badge>
                    ) : null}
                  </div>
                  {item.changelog ? (
                    <p className="text-xs text-muted-foreground">{item.changelog}</p>
                  ) : null}
                  <div className="grid gap-2 text-xs text-[#52606d] md:grid-cols-2">
                    <div className="rounded-md bg-[#f7fbf9] px-2 py-2">
                      <div className="mb-1 font-medium text-[#25443f]">Current official version</div>
                      <div className="whitespace-pre-wrap break-words">{displaySlotValue(item.defaultCurrent)}</div>
                    </div>
                    <div className="rounded-md bg-[#fffaf0] px-2 py-2">
                      <div className="mb-1 font-medium text-[#7a5620]">My settings</div>
                      <div className="whitespace-pre-wrap break-words">{displaySlotValue(item.overrideValue)}</div>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => onApplyOfficial([item.key])}
                    className="border-[#b8d9d0] bg-white text-[#0f5f59] hover:bg-[#eaf7f2]"
                  >
                    Restore current official version
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending || item.state === "new"}
                    onClick={() => onKeepMine([item.key])}
                    className="text-[#52606d] hover:bg-[#f4faf7]"
                  >
                    Keep my settings
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ChoiceSlotControl(props: {
  section: PromptEditorSection;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const { disabled, onChange, section } = props;
  const slot = section.slot as PromptSlotDefChoice;
  return (
    <div className="flex flex-wrap gap-2">
      {slot.options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={section.value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 basis-48 rounded-md border px-3 py-2 text-left text-sm transition-colors",
            section.value === option.value
              ? "border-primary bg-primary/10 text-foreground"
              : "border-input bg-background hover:bg-muted",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <div className="font-medium">{option.label}</div>
          <div className="mt-1 text-xs text-muted-foreground">{option.copy}</div>
        </button>
      ))}
    </div>
  );
}

function ToggleSlotControl(props: {
  section: PromptEditorSection;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  const { disabled, onChange, section } = props;
  const slot = section.slot as PromptSlotDefToggle;
  const checked = Boolean(section.value);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Switch aria-label={section.label} checked={checked} disabled={disabled} onCheckedChange={onChange} />
        <span className="text-sm font-medium text-foreground">{checked ? "Enabled" : "Disabled"}</span>
      </div>
      {checked ? (
        <div className="rounded-md bg-[#eef7f3] px-3 py-2 text-xs leading-relaxed text-[#52746d]">
          Added when enabled: {slot.copy}
        </div>
      ) : null}
    </div>
  );
}

function TokenSlotControl(props: {
  section: PromptEditorSection;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const { disabled, onChange, section } = props;
  const maxLength = getMaxLength(section);
  return (
    <div className="space-y-2">
      <Input
        aria-label={section.label}
        value={String(section.value)}
        onChange={(event) => onChange(maxLength ? event.target.value.slice(0, maxLength) : event.target.value)}
        disabled={disabled}
        placeholder={"patternHint" in section.slot ? section.slot.patternHint : undefined}
        className="font-mono"
      />
      {"patternHint" in section.slot && section.slot.patternHint ? (
        <div className="text-xs text-muted-foreground">Expected format: {section.slot.patternHint}</div>
      ) : null}
    </div>
  );
}

function ContextReferenceChips(props: {
  prompt: PromptCatalogItem;
  preview: PromptPreviewResult | null;
  onContextSelect: (blockId: string) => void;
}) {
  const { onContextSelect, preview, prompt } = props;
  const firstBlockByGroup = useMemo(() => {
    const map = new Map<string, string>();
    preview?.context.blocks.forEach((block) => {
      if (!map.has(block.group)) {
        map.set(block.group, block.id);
      }
    });
    return map;
  }, [preview?.context.blocks]);

  if (prompt.contextRequirements.length === 0) {
    return null;
  }

  return (
    <section className="rounded-md bg-muted/30 px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#25443f]">
        <MapPin className="h-4 w-4 text-[#0f766e]" />
        Context references
      </div>
      <div className="flex flex-wrap gap-1.5">
        {prompt.contextRequirements.map((requirement) => {
          const blockId = firstBlockByGroup.get(requirement.group);
          const locked = LOCKED_CONTEXT_GROUPS.has(requirement.group) || requirement.required;
          return (
            <button
              key={requirement.group}
              type="button"
              disabled={!blockId}
              onClick={() => blockId && onContextSelect(blockId)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors",
                blockId
                  ? "border-[#cbdad6] bg-white text-[#52606d] hover:border-[#0f766e] hover:bg-[#eaf7f2] hover:text-[#0f5f59]"
                  : "cursor-not-allowed border-transparent bg-muted/30 text-muted-foreground/70",
              )}
              title={requirement.group}
            >
              {locked ? <LockKeyhole className="h-3 w-3" /> : null}
              {CONTEXT_GROUP_LABELS[requirement.group] ?? requirement.group}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function PromptBodyEditor(props: {
  prompt: PromptCatalogItem;
  immersive?: boolean;
  preview: PromptPreviewResult | null;
  testRun?: PromptTestRunResult | null;
  testRunPending?: boolean;
  testRunError?: string | null;
  testRunStreamOutput?: string;
  sections: PromptEditorSection[];
  reconcile: PromptSlotReconcileResult | null;
  reconcileMap: Record<string, PromptSlotReconcileItem>;
  showReconcile: boolean;
  reconcileLoading?: boolean;
  reconcilePending?: boolean;
  disabled?: boolean;
  onSlotChange: (key: string, value: PromptSlotValue) => void;
  onSlotReset: (key: string) => void;
  onApplyOfficialSlots: (keys: string[]) => void;
  onKeepSlots: (keys: string[]) => void;
  onContextSelect: (blockId: string) => void;
}) {
  const {
    disabled,
    immersive,
    onApplyOfficialSlots,
    onContextSelect,
    onKeepSlots,
    onSlotChange,
    onSlotReset,
    preview,
    prompt,
    reconcile,
    reconcileLoading,
    reconcileMap,
    reconcilePending,
    sections,
    showReconcile,
    testRun,
    testRunError,
    testRunPending,
    testRunStreamOutput,
  } = props;
  const controlSections = sections.filter((section) => section.placement === "control");
  const bodySections = sections.filter((section) => section.placement === "body");
  const appendSections = sections.filter((section) => section.placement === "append");
  const hasEditableSlots = sections.length > 0;

  return (
    <div className={cn("mx-auto max-w-5xl space-y-6", immersive && "max-w-5xl")}>
      {showReconcile ? (
        <PromptOfficialVersionPanel
          reconcile={reconcile}
          isLoading={reconcileLoading}
          pending={reconcilePending}
          onApplyOfficial={onApplyOfficialSlots}
          onKeepMine={onKeepSlots}
        />
      ) : null}

      {!hasEditableSlots ? (
        <div className="rounded-md border border-dashed bg-background/80 p-5 text-sm text-muted-foreground">
          <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
            <LockKeyhole className="h-4 w-4 text-primary" />
            Read-only prompt
          </div>
          This prompt handles workflow decisions or result validation using system-provided rules. Generate a preview to see what AI receives.
        </div>
      ) : (
        <>
          {controlSections.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Writing style</h3>
              </div>
              <div className="divide-y divide-border">
                {controlSections.map((section) => (
                  <PromptSlotSection
                    key={section.slotKey}
                    section={section}
                    immersive={immersive}
                    reconcileItem={reconcileMap[section.slotKey]}
                    disabled={disabled}
                    onChange={onSlotChange}
                    onReset={onSlotReset}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {bodySections.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Primary adjustments</h3>
              <p className="text-sm text-muted-foreground">Focus on instructions related to your goal; leave the rest at their defaults.</p>
              <div className="divide-y divide-border">
                {bodySections.map((section) => (
                  <PromptSlotSection
                    key={section.slotKey}
                    section={section}
                    immersive={immersive}
                    reconcileItem={reconcileMap[section.slotKey]}
                    disabled={disabled}
                    onChange={onSlotChange}
                    onReset={onSlotReset}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {appendSections.length > 0 ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Additional instructions (optional)</h3>
              <div className="divide-y divide-border">
                {appendSections.map((section) => (
                  <PromptSlotSection
                    key={section.slotKey}
                    section={section}
                    immersive={immersive}
                    reconcileItem={reconcileMap[section.slotKey]}
                    disabled={disabled}
                    onChange={onSlotChange}
                    onReset={onSlotReset}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      <details key={preview ? "preview" : "empty"} open={Boolean(preview || testRun || testRunPending || testRunError)} className="border-t border-border pt-4">
        <summary className="cursor-pointer text-sm font-medium">Preview and test results</summary>
        <ContextReferenceChips prompt={prompt} preview={preview} onContextSelect={onContextSelect} />
        <PromptPreviewPanel
          preview={preview}
          testRun={testRun}
          testRunPending={testRunPending}
          testRunError={testRunError}
          testRunStreamOutput={testRunStreamOutput}
        />
      </details>
    </div>
  );
}
