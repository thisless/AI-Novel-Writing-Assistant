import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { getNovelChapters } from "@/api/novel/chapters";
import { queryKeys } from "@/api/queryKeys";
import type { PromptCatalogItem } from "@/api/promptWorkbench";
import type { LLMSelectorValue } from "@/components/common/LLMSelector";
import { Button } from "@/components/ui/button";
import { AppDialogContent, Dialog } from "@/components/ui/dialog";
import SelectControl from "@/components/common/SelectControl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useLLMStore } from "@/store/llmStore";
import { AdvancedPromptTemplateEditor } from "./components/AdvancedPromptTemplateEditor";
import { PromptBodyEditor } from "./components/PromptBodyEditor";
import { PromptCatalogSidebar } from "./components/PromptCatalogSidebar";
import { ContextInjectionPanel } from "./components/ContextInjectionPanel";
import { PromptEditorShell } from "./components/PromptEditorShell";
import { PromptRunBar } from "./components/PromptRunBar";
import { PromptTestRunResultPanel } from "./components/PromptPreviewPanel";
import { usePromptCatalog } from "./hooks/usePromptCatalog";
import { usePromptDraftSlots } from "./hooks/usePromptDraftSlots";
import { usePromptPreview } from "./hooks/usePromptPreview";
import { usePromptTemplateEditor } from "./hooks/usePromptTemplateEditor";
import { WritingPlatformProfileManager } from "./components/WritingPlatformProfileManager";

type PromptEditMode = "slots" | "advanced";

export default function PromptWorkbenchPage() {
  const [searchParams] = useSearchParams();
  const writingLab = searchParams.get("experience") === "writing";
  const requestedNovelId = searchParams.get("novelId")?.trim() ?? "";
  const requestedChapterId = searchParams.get("chapterId")?.trim() ?? "";
  const writingLabSetupRef = useRef(false);
  const [keyword, setKeyword] = useState(() => writingLab ? "novel.chapter.writer" : "");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [entrypoint, setEntrypoint] = useState("manual_test");
  const [selectedContextBlockId, setSelectedContextBlockId] = useState<string | null>(null);
  const [immersiveMode, setImmersiveMode] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [editMode, setEditMode] = useState<PromptEditMode>(() => writingLab ? "advanced" : "slots");
  const [platformManagerOpen, setPlatformManagerOpen] = useState(false);
  const [showContext, setShowContext] = useState(writingLab);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTargetNovelId, setSaveTargetNovelId] = useState("");
  const globalLlmProvider = useLLMStore((state) => state.provider);
  const globalLlmModel = useLLMStore((state) => state.model);
  const globalLlmTemperature = useLLMStore((state) => state.temperature);
  const globalLlmMaxTokens = useLLMStore((state) => state.maxTokens);
  const [testLlm, setTestLlm] = useState<LLMSelectorValue>(() => ({
    provider: globalLlmProvider,
    model: globalLlmModel,
    temperature: globalLlmTemperature,
    maxTokens: globalLlmMaxTokens,
  }));

  const catalog = usePromptCatalog(keyword);
  const prompts = catalog.prompts;
  const selectedPrompt = useMemo(() => {
    if (prompts.length === 0) {
      return null;
    }
    if (writingLab) {
      return prompts.find((item) => item.id === "novel.chapter.writer") ?? prompts[0] ?? null;
    }
    return prompts.find((item) => item.key === selectedKey) ?? prompts[0] ?? null;
  }, [prompts, selectedKey, writingLab]);

  const slotState = usePromptDraftSlots(selectedPrompt);
  const activeNovel = useMemo(
    () => slotState.novels.find((novel) => novel.id === slotState.activeNovelId) ?? null,
    [slotState.activeNovelId, slotState.novels],
  );
  const chaptersQuery = useQuery({
    queryKey: queryKeys.novels.chapters(slotState.activeNovelId || "none"),
    queryFn: () => getNovelChapters(slotState.activeNovelId),
    enabled: Boolean(slotState.scope === "novel" && slotState.activeNovelId),
    staleTime: 30_000,
  });
  const chapters = chaptersQuery.data?.data ?? [];
  const selectedChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === selectedChapterId) ?? null,
    [chapters, selectedChapterId],
  );
  const advancedTemplateSupported = Boolean(selectedPrompt?.capabilities.supportsAdvancedTemplate);
  const advancedTemplateEnabled = advancedTemplateSupported;
  const templateState = usePromptTemplateEditor({
    prompt: selectedPrompt,
    novelId: slotState.scope === "novel" ? slotState.activeNovelId : "",
    chapterId: selectedChapterId,
    entrypoint,
    enabled: advancedTemplateEnabled,
  });
  const activeEditMode: PromptEditMode = editMode === "advanced" && advancedTemplateSupported ? "advanced" : "slots";
  const previewState = usePromptPreview({
    prompt: selectedPrompt,
    entrypoint,
    novelId: slotState.scope === "novel" && slotState.activeNovelId ? slotState.activeNovelId : undefined,
    chapterId: slotState.scope === "novel" && selectedChapterId ? selectedChapterId : undefined,
    previewNovel: activeNovel,
    previewChapter: selectedChapter,
    slotOverrides: slotState.drafts,
    templateDraft: activeEditMode === "advanced" && advancedTemplateEnabled ? templateState.draftTemplate ?? undefined : undefined,
  });
  const preview = previewState.preview;
  const testRunError = previewState.testRunError;

  useEffect(() => {
    setSelectedContextBlockId(null);
  }, [preview?.prompt.key, selectedPrompt?.key]);

  useEffect(() => {
    setSelectedChapterId("");
  }, [slotState.activeNovelId]);

  useEffect(() => {
    if (!writingLab || writingLabSetupRef.current) {
      return;
    }
    if (slotState.scope !== "novel") {
      slotState.setScope("novel");
      return;
    }
    if (requestedNovelId && slotState.selectedNovelId !== requestedNovelId) {
      slotState.setSelectedNovelId(requestedNovelId);
      return;
    }
    if (requestedChapterId) {
      setSelectedChapterId(requestedChapterId);
    }
    writingLabSetupRef.current = true;
  }, [
    requestedChapterId,
    requestedNovelId,
    slotState.scope,
    slotState.selectedNovelId,
    slotState.setScope,
    slotState.setSelectedNovelId,
    writingLab,
  ]);

  useEffect(() => {
    if (slotState.scope !== "novel" || !slotState.activeNovelId || chapters.length === 0) {
      return;
    }
    if (selectedChapterId && chapters.some((chapter) => chapter.id === selectedChapterId)) {
      return;
    }
    const defaultChapter = chapters.find((chapter) => chapter.content?.trim()) ?? chapters[0];
    setSelectedChapterId(defaultChapter?.id ?? "");
  }, [chapters, selectedChapterId, slotState.activeNovelId, slotState.scope]);

  useEffect(() => {
    if (!immersiveMode) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setImmersiveMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [immersiveMode]);

  useEffect(() => {
    if (!advancedTemplateSupported && editMode === "advanced") {
      setEditMode("slots");
    }
  }, [advancedTemplateSupported, editMode]);

  useEffect(() => {
    if (testLlm.provider || !globalLlmProvider) {
      return;
    }
    setTestLlm({
      provider: globalLlmProvider,
      model: globalLlmModel,
      temperature: globalLlmTemperature,
      maxTokens: globalLlmMaxTokens,
    });
  }, [
    globalLlmMaxTokens,
    globalLlmModel,
    globalLlmProvider,
    globalLlmTemperature,
    testLlm.provider,
  ]);

  function handleRunTest() {
    previewState.generateTestRun({
      ...(testLlm.provider ? { provider: testLlm.provider } : {}),
      ...(testLlm.model ? { model: testLlm.model } : {}),
      ...(testLlm.temperature !== undefined ? { temperature: testLlm.temperature } : {}),
      ...(testLlm.maxTokens !== undefined ? { maxTokens: testLlm.maxTokens } : {}),
    });
  }

  function handleSelectPrompt(prompt: PromptCatalogItem) {
    setSelectedKey(prompt.key);
    setSelectedContextBlockId(null);
  }

  const saveDisabled = !selectedPrompt?.slotSupported
    || slotState.isNovelScopeDisabled
    || !slotState.hasDirtyDrafts
    || slotState.saveMutation.isPending;
  const templateSaveError = templateState.saveMutation.error instanceof Error
    ? templateState.saveMutation.error.message
    : templateState.restoreMutation.error instanceof Error
      ? templateState.restoreMutation.error.message
      : templateState.activateMutation.error instanceof Error
        ? templateState.activateMutation.error.message
        : null;
  const isAdvancedMode = activeEditMode === "advanced";
  const effectiveDirtyCount = isAdvancedMode ? (templateState.isDirty ? 1 : 0) : slotState.dirtySlotKeys.length;
  const effectiveSavePending = isAdvancedMode ? templateState.saveMutation.isPending : slotState.saveMutation.isPending;
  const effectiveSaveSuccess = isAdvancedMode ? templateState.saveMutation.isSuccess : slotState.saveMutation.isSuccess;
  const effectiveSaveError = isAdvancedMode ? templateSaveError : slotState.saveError;
  const templateBusy = templateState.saveMutation.isPending
    || templateState.restoreMutation.isPending
    || templateState.activateMutation.isPending;
  const effectiveSaveDisabled = isAdvancedMode
    ? !templateState.isReady || (!templateState.isDirty && templateState.canPersist) || templateBusy
    : saveDisabled;
  const effectiveResetDisabled = isAdvancedMode ? !templateState.isDirty || templateBusy : !slotState.hasDirtyDrafts;
  const effectiveOfficialDisabled = isAdvancedMode
    ? !templateState.canPersist || templateState.view?.mode !== "custom" || templateBusy
    : !selectedPrompt?.slotSupported || slotState.isNovelScopeDisabled;

  return (
    <div
      className={cn(
        "prompt-workbench-theme flex h-full min-h-0 overflow-hidden bg-background text-foreground",
        immersiveMode && "fixed inset-0 z-50 h-screen bg-background",
      )}
    >
      {!immersiveMode && !writingLab ? (
        <div className="flex h-full min-h-0 w-[260px] min-w-[220px] max-w-[300px] shrink-0 overflow-hidden">
          <PromptCatalogSidebar
            keyword={keyword}
            onKeywordChange={setKeyword}
            prompts={prompts}
            selectedKey={selectedPrompt?.key ?? null}
            isLoading={catalog.query.isLoading}
            isFetching={catalog.query.isFetching}
            onSelect={handleSelectPrompt}
            onRefresh={() => void catalog.refetch()}
            onManagePlatforms={() => setPlatformManagerOpen(true)}
          />
        </div>
      ) : null}

      <main className="h-full min-h-0 min-w-0 flex-1 overflow-hidden">
        {selectedPrompt ? (
          <PromptEditorShell
            prompt={selectedPrompt}
            simplified={writingLab}
            advanced={isAdvancedMode}
            heading={writingLab ? "Manuscript preview lab" : undefined}
            immersive={immersiveMode}
            onImmersiveChange={setImmersiveMode}
            entrypoint={entrypoint}
            onEntrypointChange={setEntrypoint}
            scope={slotState.scope}
            onScopeChange={slotState.setScope}
            selectedNovelId={slotState.selectedNovelId}
            onNovelChange={slotState.setSelectedNovelId}
            novels={slotState.novels}
            selectedChapterId={selectedChapterId}
            onChapterChange={setSelectedChapterId}
            chapters={chapters.map((chapter) => ({
              id: chapter.id,
              title: chapter.title,
              order: chapter.order,
              hasContent: Boolean(chapter.content?.trim()),
            }))}
            bodyPanel={
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <Tabs value={activeEditMode} onValueChange={(value) => setEditMode(value as PromptEditMode)}>
                      <TabsList>
                        <TabsTrigger value="slots">Quick adjustments</TabsTrigger>
                        {advancedTemplateSupported ? <TabsTrigger value="advanced">Full template</TabsTrigger> : null}
                      </TabsList>
                    </Tabs>
                    <p className="mt-2 text-sm text-muted-foreground">{isAdvancedMode
                      ? "Edit the full prompt directly for more advanced customization."
                      : "Start with the main adjustments. Change only what you need; the defaults are ready to use."}</p>
                  </div>
                  {isAdvancedMode ? <Button variant="ghost" size="sm" aria-expanded={showContext}
                    onClick={() => setShowContext((value) => !value)}>{showContext ? "Hide context sources" : "View context sources"}</Button> : null}
                </div>
                {!isAdvancedMode && slotState.isNovelScopeDisabled ? (
                  <div className="rounded-md bg-muted/[0.35] px-4 py-3 text-sm text-muted-foreground">
                    Select a novel to customize its instructions, or switch to “All novels” to change the defaults.
                  </div>
                ) : null}
                {previewState.previewMutation.isError ? <p role="alert" className="text-sm text-destructive">
                  {previewState.previewMutation.error instanceof Error ? previewState.previewMutation.error.message : "Preview failed. Please try again."}
                </p> : null}
                {isAdvancedMode ? (
                  <AdvancedPromptTemplateEditor
                    templateState={templateState}
                    preview={preview}
                    testRun={previewState.testRun}
                    testRunPending={previewState.isTestRunPending}
                    testRunError={testRunError}
                    testRunStreamOutput={previewState.testRunStreamOutput}
                    disabled={!advancedTemplateEnabled}
                    showTestResult={!writingLab || !showContext}
                  />
                ) : (
                  <PromptBodyEditor
                    prompt={selectedPrompt}
                    immersive={immersiveMode}
                    preview={preview}
                    testRun={previewState.testRun}
                    testRunPending={previewState.isTestRunPending}
                    testRunError={testRunError}
                    testRunStreamOutput={previewState.testRunStreamOutput}
                    sections={slotState.sections}
                    reconcile={slotState.reconcile}
                    reconcileMap={slotState.reconcileMap}
                    showReconcile={slotState.showReconcile}
                    reconcileLoading={slotState.reconcileQuery.isFetching}
                    reconcilePending={slotState.reconcilePending}
                    disabled={
                      slotState.isNovelScopeDisabled
                      || slotState.saveMutation.isPending
                      || slotState.resetMutation.isPending
                    }
                    onSlotChange={slotState.changeSlotDraft}
                    onSlotReset={slotState.resetSlot}
                    onApplyOfficialSlots={slotState.adoptSlotsByKey}
                    onKeepSlots={slotState.keepSlotsByKey}
                    onContextSelect={setSelectedContextBlockId}
                  />
                )}
              </div>
            }
            contextPanel={isAdvancedMode && showContext ? (
              <div className="flex h-full min-h-0 flex-col">
                {writingLab && (previewState.testRun || previewState.testRunMutation.isPending || testRunError) ? (
                  <div className="max-h-[56%] shrink-0 overflow-y-auto border-b border-border p-3">
                    <PromptTestRunResultPanel
                      result={previewState.testRun}
                      isPending={previewState.isTestRunPending}
                      error={testRunError}
                      streamOutput={previewState.testRunStreamOutput}
                    />
                  </div>
                ) : null}
                <div className="min-h-0 flex-1">
                  <ContextInjectionPanel
                    preview={preview}
                    selectedBlockId={selectedContextBlockId}
                    onSelectBlock={setSelectedContextBlockId}
                    referenceCatalog={templateState.references}
                    onInsertToken={templateState.insertToken}
                  />
                </div>
              </div>
            ) : undefined}
            runBar={
              <PromptRunBar
                prompt={selectedPrompt}
                estimatedTokens={preview?.context.estimatedInputTokens ?? null}
                dirtyCount={effectiveDirtyCount}
                isPreviewPending={previewState.previewMutation.isPending}
                isTestRunPending={previewState.isTestRunPending}
                isSavePending={effectiveSavePending}
                isSaveSuccess={effectiveSaveSuccess}
                saveError={effectiveSaveError}
                saveDisabled={effectiveSaveDisabled}
                previewDisabled={!selectedPrompt || previewState.previewMutation.isPending || (isAdvancedMode && !templateState.isReady)}
                testRunDisabled={!selectedPrompt || previewState.isTestRunPending || (isAdvancedMode && !templateState.isReady)}
                testLlm={testLlm}
                onTestLlmChange={setTestLlm}
                resetDisabled={effectiveResetDisabled}
                officialVersionDisabled={effectiveOfficialDisabled}
                officialVersionLabel={isAdvancedMode ? "Restore official template" : "Official version"}
                saveLabel={isAdvancedMode ? (templateState.canPersist ? "Save novel template" : "Save to novel") : "Save settings"}
                scopeHint={isAdvancedMode
                  ? (templateState.canPersist ? `Apply to “${activeNovel?.title || "Selected novel"}”` : "Template draft · Not yet applied")
                  : slotState.scope === "global" ? "Default instructions for all novels" : `Only apply to “${activeNovel?.title || "Select a novel"}”`}
                usesSample={!slotState.activeNovelId}
                onGeneratePreview={previewState.generatePreview}
                onRunTest={handleRunTest}
                onOpenOfficialVersion={
                  isAdvancedMode
                    ? () => templateState.restoreMutation.mutate()
                    : slotState.openOfficialVersionPanel
                }
                onSave={
                  isAdvancedMode
                    ? () => {
                      if (templateState.canPersist) templateState.saveMutation.mutate(undefined);
                      else { setSaveTargetNovelId(slotState.selectedNovelId); setSaveDialogOpen(true); }
                    }
                    : slotState.saveDrafts
                }
                onReset={isAdvancedMode ? templateState.resetDraft : slotState.resetDrafts}
                writingLab={writingLab}
              />
            }
          />
        ) : (
          <div className="flex h-full items-center justify-center p-8">
            <div className="rounded-md border border-dashed bg-background/80 p-6 text-sm text-muted-foreground">
              Select a prompt.
            </div>
          </div>
        )}
      </main>
      <Dialog open={saveDialogOpen} onOpenChange={(open) => { if (!templateState.saveMutation.isPending) setSaveDialogOpen(open); }}>
        <AppDialogContent title="Apply template to novel" description="Save this as a new version for the selected novel's future generations. Existing chapter text will remain unchanged."
          footer={<>
            <Button variant="ghost" disabled={templateState.saveMutation.isPending} onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button disabled={!saveTargetNovelId || templateState.saveMutation.isPending} onClick={() => {
              templateState.saveMutation.mutate(saveTargetNovelId, { onSuccess: () => {
                setSaveDialogOpen(false);
                slotState.setScope("novel");
                slotState.setSelectedNovelId(saveTargetNovelId);
              } });
            }}>{templateState.saveMutation.isPending ? "Saving…" : "Save and apply"}</Button>
          </>}>
          <SelectControl value={saveTargetNovelId} onChange={(event) => setSaveTargetNovelId(event.target.value)}
            aria-label="Novel to apply template to" disabled={templateState.saveMutation.isPending}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Select a novel</option>
            {slotState.novels.map((novel) => <option key={novel.id} value={novel.id}>{novel.title || novel.id}</option>)}
          </SelectControl>
          {slotState.novelsQuery.isLoading ? <p className="mt-3 text-sm text-muted-foreground">Loading novel list…</p>
            : slotState.novelsQuery.isError ? <p role="alert" className="mt-3 text-sm text-destructive">Could not load the novel list.
              <Button variant="ghost" onClick={() => void slotState.novelsQuery.refetch()}>Retry</Button></p>
            : slotState.novels.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Create a novel to apply the template. You can continue editing and previewing the draft.</p> : null}
          {templateSaveError ? <p role="alert" className="mt-3 text-sm text-destructive">{templateSaveError}</p> : null}
        </AppDialogContent>
      </Dialog>
      <WritingPlatformProfileManager open={platformManagerOpen} onOpenChange={setPlatformManagerOpen} />
    </div>
  );
}
