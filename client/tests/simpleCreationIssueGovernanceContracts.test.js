import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const shelfSource = fs.readFileSync(
  new URL("../src/pages/novels/simpleCreation/SimpleNovelShelfPage.tsx", import.meta.url),
  "utf8",
);
const panelSource = fs.readFileSync(
  new URL("../src/pages/novels/simpleCreation/SimpleCreationIssueGovernancePanel.tsx", import.meta.url),
  "utf8",
);
const globalPolicySource = fs.readFileSync(
  new URL("../src/pages/settings/AutoDirectorIssuePolicyCard.tsx", import.meta.url),
  "utf8",
);
const issuePolicySource = fs.readFileSync(
  new URL("../../shared/types/directorIssue.ts", import.meta.url),
  "utf8",
);
const novelPolicySource = fs.readFileSync(
  new URL("../src/pages/novels/components/NovelDirectorIssuePolicyCard.tsx", import.meta.url),
  "utf8",
);

test("simple creation shelf exposes issue governance without professional conversion", () => {
  assert.match(shelfSource, /SimpleCreationIssueGovernancePanel/);
  assert.match(panelSource, /getNovelDirectorIssuePolicy/);
  assert.match(panelSource, /recentIssues/);
  assert.match(panelSource, /AI issue handling/);
  assert.match(panelSource, /Manage issues/);
  assert.match(panelSource, /NovelDirectorIssuePolicyCard/);
  assert.doesNotMatch(panelSource, /convertNovelToProfessional/);
});

test("simple creation shelf provides a preview shortcut for the current chapter", () => {
  assert.match(shelfSource, /Preview/);
  assert.match(shelfSource, /\/novels\/\$\{id\}\/preview/);
  assert.match(shelfSource, /chapterId=\$\{encodeURIComponent\(selectedChapter\.id\)\}/);
});

test("simple creation shelf switches to professional mode without an irreversible conversion dialog", () => {
  assert.match(shelfSource, /setNovelCreationExperience\(id, "professional"\)/);
  assert.match(shelfSource, /Professional mode/);
  assert.doesNotMatch(shelfSource, /此操作不能切回简易创作/);
});

test("all issue actions remain editable and changed rules show a safety warning", () => {
  assert.match(globalPolicySource, /DIRECTOR_ISSUE_ACTIONS\.map/);
  assert.doesNotMatch(globalPolicySource, /disabled=\{entry\.allowedActions\.length === 1\}/);
  assert.match(novelPolicySource, /const CONFIGURABLE_ISSUES = DIRECTOR_ISSUE_CATALOG;/);
  assert.doesNotMatch(novelPolicySource, /DIRECTOR_ISSUE_CATALOG\.filter/);
  for (const source of [globalPolicySource, novelPolicySource]) {
    assert.match(source, /You changed/);
    assert.match(source, /hasChanges(?: \|\| retryChanged)? \? \(/);
    assert.match(source, /role="status"/);
    assert.match(source, /Safety/);
  }
});

test("issue management exposes the two production presets with a single retry ceiling", () => {
  for (const source of [globalPolicySource, novelPolicySource]) {
    assert.match(source, /DIRECTOR_ISSUE_POLICY_PRESETS/);
    assert.match(source, /maxAutomaticRetries/);
    assert.match(source, /Up to 1 retry/);
  }
  assert.match(issuePolicySource, /Finish the whole book/);
  assert.match(issuePolicySource, /Quality first/);
  assert.match(novelPolicySource, /hasCompleteActionMap/);
  assert.match(novelPolicySource, /!hasCompleteActionMap \? <option value="">Inherit global setting<\/option> : null/);
});
