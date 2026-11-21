import { useState } from "react";
import { Eye, FlaskConical, RotateCcw, Save, ShieldCheck } from "lucide-react";
import type { PromptCatalogItem } from "@/api/promptWorkbench";
import { Button } from "@/components/ui/button";
import { AppDialogContent, Dialog } from "@/components/ui/dialog";
import LLMSelector, { type LLMSelectorValue } from "@/components/common/LLMSelector";
import { cn } from "@/lib/utils";

interface PromptRunBarProps {
  prompt: PromptCatalogItem | null;
  estimatedTokens: number | null;
  dirtyCount: number;
  isPreviewPending: boolean;
  isTestRunPending?: boolean;
  isSavePending: boolean;
  isSaveSuccess: boolean;
  saveError?: string | null;
  saveDisabled: boolean;
  previewDisabled: boolean;
  testRunDisabled?: boolean;
  testLlm: LLMSelectorValue;
  onTestLlmChange: (value: LLMSelectorValue) => void;
  resetDisabled: boolean;
  officialVersionDisabled?: boolean;
  officialVersionLabel?: string;
  saveLabel?: string;
  savePendingLabel?: string;
  onGeneratePreview: () => void;
  onRunTest: () => void;
  onOpenOfficialVersion: () => void;
  onSave: () => void;
  onReset: () => void;
  writingLab?: boolean;
  scopeHint?: string;
  usesSample?: boolean;
}

export function PromptRunBar(props: PromptRunBarProps) {
  const {
    dirtyCount,
    estimatedTokens,
    isPreviewPending,
    isTestRunPending,
    isSavePending,
    isSaveSuccess,
    onGeneratePreview,
    onOpenOfficialVersion,
    onReset,
    onRunTest,
    onSave,
    officialVersionDisabled,
    officialVersionLabel = "Official version",
    previewDisabled,
    prompt,
    resetDisabled,
    saveDisabled,
    saveError,
    saveLabel = "Save changes",
    savePendingLabel = "Saving...",
    testLlm,
    onTestLlmChange,
    testRunDisabled,
    writingLab = false,
  } = props;
  const maxBudget = prompt?.contextPolicy.maxTokensBudget ?? null;
  const [testDialogOpen, setTestDialogOpen] = useState(false);

  function handleStartTestRun() {
    onRunTest();
    setTestDialogOpen(false);
  }

  return (
    <div className="shrink-0 border-t border-border bg-card/95 px-5 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <div aria-live="polite">
            <p className="text-xs text-muted-foreground">{props.scopeHint}</p>
            <p className={cn("mt-1 text-sm", saveError ? "text-destructive" : dirtyCount > 0 ? "text-warning" : "text-muted-foreground")}>
              {saveError ? "Save failed" : isSavePending ? "Saving…" : dirtyCount > 0 ? `${dirtyCount} unsaved changes` : isSaveSuccess ? "Saved" : "No unsaved changes"}
              {estimatedTokens !== null ? <span className="ml-3 text-xs text-muted-foreground" title={`Context budget: ${maxBudget ?? "unlimited"}`}>
                Preview: ~{estimatedTokens} tokens</span> : null}
            </p>
          </div>
          {saveError ? <div className="text-xs text-destructive">{saveError}</div> : null}
        </div>

        <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onOpenOfficialVersion}
            disabled={officialVersionDisabled}
            className="text-muted-foreground"
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            {officialVersionLabel}
          </Button>
          {!writingLab ? <Button
            type="button"
            variant="ghost"
            onClick={onGeneratePreview}
            disabled={previewDisabled || isPreviewPending}
            className="text-muted-foreground"
          >
            <Eye className="mr-2 h-4 w-4" />
            {isPreviewPending ? "Preparing preview..." : "Preview prompt"}
          </Button> : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => setTestDialogOpen(true)}
            disabled={testRunDisabled || isTestRunPending}
            className="text-foreground shadow-none"
          >
            <FlaskConical className="mr-2 h-4 w-4" />
            {isTestRunPending ? "Generating sample..." : writingLab ? "Try a sample" : "Test prompt"}
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={saveDisabled || isSavePending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSavePending ? savePendingLabel : saveLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onReset}
            disabled={resetDisabled}
            className="text-muted-foreground hover:bg-info/10 hover:text-info"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Discard changes
          </Button>
        </div>
      </div>
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <AppDialogContent
          title={writingLab ? "Try a sample" : "Test prompt"}
          description={props.usesSample
            ? "Test the current draft with sample content. The novel text will not be changed."
            : "Test the current draft with the selected novel and chapter. The chapter text will not be changed."}
          className="prompt-workbench-theme max-w-2xl"
          bodyClassName="bg-card"
          footer={(
            <>
              <Button type="button" variant="ghost" onClick={() => setTestDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleStartTestRun}
                disabled={testRunDisabled || isTestRunPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <FlaskConical className="mr-2 h-4 w-4" />
                {isTestRunPending ? "Generating sample..." : writingLab ? "Generate sample" : "Run test"}
              </Button>
            </>
          )}
        >
          <div className="space-y-4">
            <div className="bg-card py-2">
              <LLMSelector
                value={testLlm}
                onChange={onTestLlmChange}
                showBadge={false}
                showParameters
              />
            </div>
            <div className="rounded-md bg-warning/10 px-3 py-2 text-xs leading-relaxed text-warning">
              {writingLab
                ? "Generating a sample uses a live model and consumes credits. The result is only for comparing templates and will not be saved as chapter text."
                : "Running a test uses a live model and consumes credits. The result is for debugging only and will not be saved as chapter text."}
            </div>
          </div>
        </AppDialogContent>
      </Dialog>
    </div>
  );
}
