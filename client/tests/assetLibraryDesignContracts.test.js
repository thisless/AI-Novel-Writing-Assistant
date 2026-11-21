import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const clientRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readClientFile = (relativePath) => readFileSync(join(clientRoot, relativePath), "utf8");

const css = readClientFile("src/index.css");
const tailwindConfig = readClientFile("tailwind.config.ts");
const assetLibraryHeader = readClientFile("src/components/assetLibrary/AssetLibraryHeader.tsx");
const assetLibraryStatus = readClientFile("src/components/assetLibrary/AssetLibraryStatusGrid.tsx");
const assetLibrarySection = readClientFile("src/components/assetLibrary/AssetLibrarySection.tsx");
const knowledgePage = readClientFile("src/pages/knowledge/KnowledgePage.tsx");
const knowledgeDocuments = readClientFile("src/pages/knowledge/components/KnowledgeDocumentsTab.tsx");
const knowledgeOverview = readClientFile("src/pages/knowledge/components/KnowledgeLibraryOverview.tsx");
const knowledgeOps = readClientFile("src/pages/knowledge/components/KnowledgeOpsTab.tsx");
const knowledgeSettings = readClientFile("src/pages/knowledge/components/KnowledgeEmbeddingSettingsCard.tsx");
const worldList = readClientFile("src/pages/worlds/WorldList.tsx");
const worldWorkspace = readClientFile("src/pages/worlds/WorldWorkspace.tsx");
const worldHandbook = readClientFile("src/pages/worlds/components/workspace/WorldHandbookEditor.tsx");
const worldOverview = readClientFile("src/pages/worlds/components/workspace/WorldOverviewTab.tsx");
const worldLayers = readClientFile("src/pages/worlds/components/workspace/WorldLayersTab.tsx");
const worldDeepening = readClientFile("src/pages/worlds/components/workspace/WorldDeepeningTab.tsx");
const worldConsistency = readClientFile("src/pages/worlds/components/workspace/WorldConsistencyTab.tsx");
const worldAssets = readClientFile("src/pages/worlds/components/workspace/WorldAssetsTab.tsx");
const worldVisualization = readClientFile("src/pages/worlds/components/WorldVisualizationBoard.tsx");
const worldGraphCanvas = readClientFile("src/pages/worlds/components/visualization/WorldGraphCanvas.tsx");
const worldGraphElements = readClientFile("src/pages/worlds/components/visualization/WorldGraphElements.tsx");
const worldGraphLayout = readClientFile("src/pages/worlds/components/visualization/worldGraphLayout.ts");
const worldTimeline = readClientFile("src/pages/worlds/components/visualization/WorldTimelinePanel.tsx");
const genrePage = readClientFile("src/pages/genres/GenreManagementPage.tsx");
const genreTreeBrowser = readClientFile("src/pages/genres/components/GenreTreeBrowser.tsx");
const storyModePage = readClientFile("src/pages/storyModes/StoryModeManagementPage.tsx");
const storyModeCreateDialog = readClientFile("src/pages/storyModes/components/StoryModeCreateDialog.tsx");
const storyModeExpansionDialog = readClientFile("src/pages/storyModes/components/StoryModeExpansionDialog.tsx");
const storyModeProfileFields = readClientFile("src/pages/storyModes/components/StoryModeProfileFields.tsx");
const storyModeTreeBrowser = readClientFile("src/pages/storyModes/components/StoryModeTreeBrowser.tsx");
const storyModeProfileDetails = readClientFile("src/components/storyModes/StoryModeProfileDetails.tsx");
const assetTreeNavigator = readClientFile("src/components/assetLibrary/AssetTreeNavigator.tsx");
const characterPage = readClientFile("src/pages/characters/CharacterLibrary.tsx");
const writingFormulaLanding = readClientFile("src/pages/writingFormula/components/WritingFormulaLanding.tsx");
const writingFormulaWorkbench = readClientFile("src/pages/writingFormula/components/WritingFormulaWorkbenchPanel.tsx");
const writingFormulaCreateDialog = readClientFile("src/pages/writingFormula/components/WritingFormulaCreateDialog.tsx");

test("asset library semantic status colors are registered as theme tokens", () => {
  for (const token of ["success", "warning", "info"]) {
    assert.match(css, new RegExp(`--${token}:`));
    assert.match(tailwindConfig, new RegExp(`${token}:\\s*\\{`));
  }
});

test("asset library shared shells stay restrained and token based", () => {
  const sharedSource = [assetLibraryHeader, assetLibraryStatus, assetLibrarySection].join("\n");
  assert.match(sharedSource, /AssetLibraryHeader/);
  assert.match(sharedSource, /AssetLibraryRecommendation/);
  assert.match(sharedSource, /AssetLibraryEmptyState/);
  assert.match(sharedSource, /text-warning/);
  assert.match(sharedSource, /text-success/);
  assert.match(sharedSource, /text-info/);
  assert.doesNotMatch(sharedSource, /#[0-9a-f]{3,8}/i);
  assert.doesNotMatch(sharedSource, /(?:slate|amber|emerald|sky|rose|red|blue|green)-\d/);
  assert.doesNotMatch(sharedSource, /gradient|rounded-(?:xl|2xl|3xl)|shadow-(?:sm|md|lg|xl|2xl)/);
});

test("phase one asset pages expose purpose status recommendation and recovery states", () => {
  for (const source of [knowledgeOverview, genrePage, characterPage]) {
    assert.match(source, /AssetLibraryHeader/);
    assert.match(source, /AssetLibrary(?:StatusGrid|Recommendation)/);
  }

  assert.match(knowledgePage, /KnowledgeLibraryOverview/);
  assert.match(knowledgeDocuments, /isLoading/);
  assert.match(knowledgeDocuments, /errorMessage/);
  assert.match(knowledgeDocuments, /onRetry/);
  assert.match(knowledgeDocuments, /AssetLibraryEmptyState/);
  assert.match(genrePage, /genreTreeQuery\.isLoading/);
  assert.match(genrePage, /genreTreeQuery\.isError/);
  assert.match(characterPage, /characterListQuery\.isLoading/);
  assert.match(characterPage, /characterListQuery\.isError/);
});

test("knowledge library presents a document shelf before maintenance controls", () => {
  assert.match(knowledgeOverview, /aria-label="Knowledge document status"/);
  assert.match(knowledgeOverview, /recommendation\.tone !== "success"/);
  assert.match(knowledgePage, /TabsTrigger value="documents" className="rounded-full/);
  assert.match(knowledgeDocuments, /Document library/);
  assert.match(knowledgeDocuments, /xl:grid-cols-2/);
  assert.match(knowledgeDocuments, /More actions/);
  assert.match(knowledgeDocuments, /label="Continue creating"/);
  assert.match(knowledgeDocuments, /onOpenRecallTest/);
  assert.match(knowledgeDocuments, /onReindexDocument/);
  assert.match(knowledgeDocuments, /confirmArchiveDocument/);
});

test("knowledge maintenance keeps recovery obvious and technical detail secondary", () => {
  assert.match(knowledgeOps, /aria-label="Resource search status"/);
  assert.match(knowledgeOps, /Check search settings/);
  assert.match(knowledgeOps, /Resource sync history/);
  assert.match(knowledgeOps, /Task details/);
  assert.doesNotMatch(knowledgeOps, /Recent failed tasks/);
  assert.match(knowledgeSettings, /Use documents in your creative work/);
  assert.match(knowledgeSettings, /Choose how documents are processed/);
  assert.match(knowledgeSettings, /Connect a document store/);
  assert.match(knowledgeSettings, /Advanced settings/);
  assert.match(knowledgeSettings, /Save search settings/);
});

test("world library presents reusable story samples before handbook detail", () => {
  assert.match(worldList, /How to use a sample in a novel/);
  assert.match(worldList, /Show story ideas/);
  assert.match(worldList, /2xl:grid-cols-3/);
  assert.match(worldList, /View handbook/);
  assert.match(worldList, /Edit sample/);
  assert.match(worldList, /handleDelete/);
  assert.match(worldList, /worldListQuery\.isLoading/);
  assert.match(worldList, /worldListQuery\.isError/);
  assert.doesNotMatch(worldList, /grid grid-cols-4 gap-2 text-center/);
});

test("world workspace keeps handbook reading primary and AI maintenance guided", () => {
  assert.match(worldWorkspace, /Back to world library/);
  assert.match(worldWorkspace, /Writing model/);
  assert.match(worldWorkspace, /TabsTrigger value="structure" className="rounded-full/);
  assert.match(worldHandbook, /Start with the world's impression and core conflict/);
  assert.match(worldOverview, /Explore the world and its maps/);
  assert.match(worldOverview, /core rules/);
  assert.match(worldLayers, /AI layer summaries/);
  assert.match(worldLayers, /Refine current content with AI/);
  assert.match(worldDeepening, /Fill in key worldbuilding details/);
  assert.match(worldConsistency, /Check world consistency/);
  assert.match(worldAssets, /rounded-full px-4 py-2/);
  assert.match(worldAssets, /Maps and graphs/);
  assert.match(worldAssets, /Snapshots/);
  assert.match(worldAssets, /Export backup/);
  assert.match(worldAssets, /Import text/);
});

test("world visualizations separate layout, canvas, and view controls", () => {
  assert.match(worldVisualization, /WorldGraphCanvas/);
  assert.match(worldVisualization, /Faction graph ·/);
  assert.match(worldVisualization, /World map ·/);
  assert.match(worldVisualization, /WorldTimelinePanel/);
  assert.match(worldGraphCanvas, /ReactFlow/);
  assert.match(worldGraphCanvas, /WorldGraphNode/);
  assert.match(worldGraphCanvas, /WorldGraphEdge/);
  assert.match(worldGraphCanvas, /getVisibleEdgeLabelIds/);
  assert.match(worldGraphCanvas, /edgeHoverTimerRef/);
  assert.match(worldGraphCanvas, /window\.setTimeout/);
  assert.match(worldGraphCanvas, /Drag locations to arrange the map/);
  assert.match(worldGraphCanvas, /Hover over a connection to see both sides and full details/);
  assert.match(worldGraphCanvas, /FullscreenView/);
  assert.match(worldGraphCanvas, /View graph full screen/);
  assert.match(worldGraphCanvas, /Exit graph full screen/);
  assert.match(worldGraphElements, /EdgeLabelRenderer/);
  assert.match(worldGraphElements, /interactionWidth=\{28\}/);
  assert.match(worldGraphElements, /line-clamp-2/);
  assert.match(worldGraphElements, /group-focus-within:block/);
  assert.match(worldGraphElements, /Click an empty area of the canvas to close/);
  assert.match(worldGraphLayout, /forceSimulation/);
  assert.match(worldGraphLayout, /forceLink/);
  assert.match(worldGraphLayout, /forceX/);
  assert.match(worldGraphLayout, /spreadAxis/);
  assert.match(worldGraphLayout, /seededRandom/);
  assert.match(worldGraphLayout, /getVisibleEdgeLabelIds/);
  assert.match(worldTimeline, /Horizontal world timeline; scroll left or right/);
  assert.match(worldTimeline, /gridTemplateColumns/);
  assert.match(worldTimeline, /bottom-\[calc\(50%\+38px\)\]/);
  assert.match(worldTimeline, /md:hidden/);
  assert.match(worldTimeline, /FullscreenView/);
  assert.ok(worldVisualization.split("\n").length < 350);
  assert.ok(worldGraphCanvas.split("\n").length < 500);
  assert.ok(worldGraphElements.split("\n").length < 350);
  assert.ok(worldGraphLayout.split("\n").length < 500);
  assert.ok(worldTimeline.split("\n").length < 250);
});
test("genre library uses a compact tree browser with a separate detail surface", () => {
  assert.match(genrePage, /GenreTreeBrowser/);
  assert.match(genreTreeBrowser, /AssetTreeNavigator/);
  assert.match(assetTreeNavigator, /role="tree"/);
  assert.match(assetTreeNavigator, /role="treeitem"/);
  assert.match(genreTreeBrowser, /Genre directory/);
  assert.match(genreTreeBrowser, /selected-genre-title/);
  assert.match(genreTreeBrowser, /lg:grid-cols-\[320px_minmax\(0,1fr\)\]/);
  assert.match(genreTreeBrowser, /viewportClassName="max-h-\[380px\]"/);
  assert.doesNotMatch(genreTreeBrowser, /min-h-\[520px\]/);
  assert.doesNotMatch(genreTreeBrowser, /shadow-(?:sm|md|lg|xl|2xl)/);
});

test("story mode library reuses the tree navigator and keeps mode contracts in the detail pane", () => {
  assert.match(storyModePage, /StoryModeTreeBrowser/);
  assert.match(storyModeTreeBrowser, /AssetTreeNavigator/);
  assert.match(storyModeTreeBrowser, /Progression mode directory/);
  assert.match(storyModeTreeBrowser, /StoryModeProfileDetails/);
  assert.match(storyModeProfileDetails, /Core drive/);
  assert.match(storyModeProfileDetails, /Reader reward/);
  assert.match(storyModeProfileDetails, /Progression units/);
  assert.match(storyModeProfileDetails, /Conflict intensity/);
  assert.doesNotMatch(storyModeTreeBrowser, /shadow-(?:sm|md|lg|xl|2xl)/);
});

test("writing formula keeps a compact asset list and reveals the selected profile in place", () => {
  assert.match(writingFormulaLanding, /Choose a style profile, then edit it, apply it, or reduce AI-like writing/);
  assert.match(writingFormulaLanding, /showDetails \? \(/);
  assert.match(writingFormulaLanding, /Reading experience and positioning/);
  assert.match(writingFormulaLanding, /Rule summaries/);
  assert.match(writingFormulaLanding, /Profile overview/);
  assert.match(writingFormulaLanding, /Edit settings/);
  assert.match(writingFormulaLanding, /Apply and test/);
  assert.match(writingFormulaLanding, /Reduce AI-like writing/);
  assert.doesNotMatch(writingFormulaLanding, /xl:sticky xl:top-4/);
  assert.match(writingFormulaCreateDialog, /Start with a reading experience/);
  assert.match(writingFormulaCreateDialog, /Start with a template/);
  assert.match(writingFormulaCreateDialog, /Describe an idea/);
  assert.match(writingFormulaCreateDialog, /Learn from material/);
  assert.match(writingFormulaCreateDialog, /Draft a profile with AI/);
  assert.ok(writingFormulaLanding.split("\n").length < 450);
  assert.ok(writingFormulaWorkbench.split("\n").length < 350);
  assert.ok(writingFormulaCreateDialog.split("\n").length < 700);
});

test("story mode creation keeps AI assistance beside a grouped, independently scrolling draft", () => {
  assert.match(storyModePage, /StoryModeCreateDialog/);
  assert.match(storyModeCreateDialog, /AppDialogContent/);
  assert.match(storyModeCreateDialog, /lg:grid-cols-\[340px_minmax\(0,1fr\)\]/);
  assert.match(storyModeCreateDialog, /lg:overflow-y-auto/);
  assert.match(storyModeCreateDialog, /Draft with AI/);
  assert.match(storyModeCreateDialog, /Save selected subcategories/);
  assert.match(storyModeCreateDialog, /Draft instructions/);
  assert.doesNotMatch(storyModeCreateDialog, /max-h-\[90vh\].*overflow-auto/);

  for (const section of ["Core experience", "Chapter progression units", "Boundaries and guardrails"]) {
    assert.match(storyModeProfileFields, new RegExp(section));
  }
});

test("story mode expansion recommends distinct additions from the existing library", () => {
  assert.match(storyModePage, /StoryModeExpansionDialog/);
  assert.match(storyModePage, /generateStoryModeExpansion/);
  assert.match(storyModePage, /Expand progression modes/);
  assert.match(storyModeExpansionDialog, /Expansion scope/);
  assert.match(storyModeExpansionDialog, /Suggest new directions/);
  assert.match(storyModeExpansionDialog, /Progression units:/);
  assert.match(storyModeExpansionDialog, /Add to library/);
  assert.doesNotMatch(storyModeExpansionDialog, /shadow-(?:sm|md|lg|xl|2xl)/);
});
