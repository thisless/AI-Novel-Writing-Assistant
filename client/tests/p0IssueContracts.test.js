import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("AI 执行台在审校待确认且有报告时提供修复入口", async () => {
  const source = await read("src/pages/novels/components/ChapterExecutionActionPanel.tsx");
  assert.match(source, /displayedStatus === "pending_review"/);
  assert.match(source, /selectedChapter\.generationState === "reviewed"/);
  assert.match(source, /chapterAuditReports\.length > 0/);
});

test("semi-automated step confirmation exposes the chapter handoff in the execution panel", async () => {
  const source = await read("src/pages/novels/components/ChapterExecutionActionPanel.tsx");
  assert.match(source, /Hand chapter changes back to Auto Director/);
  assert.match(source, /Confirm changes and continue/);
  assert.match(source, /manualDirectorHandoff\.onAccept/);
});

test("半自动审核可以选择其他导演步骤重新校准", async () => {
  const dialog = await read("src/pages/novels/components/DirectorStepCalibrationDialog.tsx");
  const page = await read("src/pages/novels/NovelEdit.tsx");
  const mobile = await read("src/pages/novels/mobile/MobileNovelEditView.tsx");
  assert.match(dialog, /getDirectorTaskFactInspection/);
  assert.match(dialog, /Adjust a Director step/);
  assert.match(dialog, /Improve step/);
  assert.match(dialog, /Regenerate step/);
  assert.match(page, /directorStepCalibration=/);
  assert.match(page, /checkpointType === "step_review_required"/);
  assert.match(mobile, /DirectorStepCalibrationDialog/);
});

test("正文编辑器在光标处提供续写候选并保留候选写回入口", async () => {
  const editor = await read("src/pages/novels/components/chapterEditor/ChapterEditorShell.tsx");
  const toolbar = await read("src/pages/novels/components/chapterEditor/CursorAIToolbar.tsx");
  const acceptance = await read("src/pages/novels/components/chapterEditor/review/useCandidateAcceptance.ts");
  assert.match(toolbar, /CHAPTER_EDITOR_CURSOR_OPERATION_LABELS/);
  assert.match(toolbar, /"continue"/);
  assert.match(toolbar, /"conflict"/);
  assert.match(editor, /previewChapterCursorContinuation/);
  assert.match(acceptance, /insertChapterContinuation/);
  assert.match(acceptance, /expectedUpdatedAt: input\.savedUpdatedAt/);
});

test("章节问题卡提供保存后确认已处理的来源页闭环", async () => {
  const sidebar = await read("src/pages/novels/components/chapterEditor/diagnostics/ChapterEditorDiagnosticList.tsx");
  const shell = await read("src/pages/novels/components/chapterEditor/ChapterEditorShell.tsx");
  assert.match(sidebar, /Mark issue as addressed/);
  assert.match(sidebar, /Save before confirming/);
  assert.match(shell, /resolveChapterAuditIssue/);
  assert.match(shell, /onRefreshWorkspace\?\.\(\)/);
});

test("正文候选支持按差异项选择写回", async () => {
  const editor = await read("src/pages/novels/components/chapterEditor/ChapterEditorShell.tsx");
  const panel = await read("src/pages/novels/components/chapterEditor/ChapterEditorDirectorPanel.tsx");
  const acceptance = await read("src/pages/novels/components/chapterEditor/review/useCandidateAcceptance.ts");
  assert.match(acceptance, /applySelectedChapterEditorDiff/);
  assert.match(editor, /selectedDiffChangeIds/);
  assert.match(panel, /Choose changes to apply to the manuscript/);
  assert.match(panel, /Accept selected changes/);
});

test("正文编辑器提供本章版本预览和安全载入入口", async () => {
  const drawer = await read("src/pages/novels/components/chapterEditor/ChapterVersionDrawer.tsx");
  const shell = await read("src/pages/novels/components/chapterEditor/ChapterEditorShell.tsx");
  const api = await read("src/api/novel/production.ts");
  assert.match(drawer, /listNovelChapterSnapshots/);
  assert.match(drawer, /Load into editor/);
  assert.match(drawer, /Save to apply it to the manuscript/);
  assert.doesNotMatch(drawer, /restoreNovelSnapshot/);
  assert.match(shell, /onOpenChapterVersions/);
  assert.match(api, /chapters\/\$\{chapterId\}\/snapshots/);
});

test("正文编辑器提供快捷保存并刷新本章版本列表", async () => {
  const shell = await read("src/pages/novels/components/chapterEditor/ChapterEditorShell.tsx");
  const sidebar = await read("src/pages/novels/components/chapterEditor/ChapterEditorSidebar.tsx");
  assert.match(shell, /handleSaveShortcut/);
  assert.match(shell, /chapterSnapshots\(novelId, chapter\.id\)/);
  assert.match(sidebar, /Ctrl\/Cmd\+S/);
});

test("载入旧版本后的首次保存先保护当前正文", async () => {
  const shell = await read("src/pages/novels/components/chapterEditor/ChapterEditorShell.tsx");
  const drawer = await read("src/pages/novels/components/chapterEditor/ChapterVersionDrawer.tsx");
  assert.match(shell, /loadedSnapshotId/);
  assert.match(shell, /before-version-load/);
  assert.match(shell, /createNovelSnapshot/);
  assert.match(drawer, /onLoadContent\(selectedSnapshot\.content, selectedSnapshot\.id\)/);
});

test("自定义厂商配置可选择鉴权方式", async () => {
  const source = await read("src/pages/settings/components/ProviderConfigDialog.tsx");
  assert.match(source, /Authorization: Bearer/);
  assert.match(source, /x-api-key/);
  assert.match(source, /No authentication/);
});
