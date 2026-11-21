import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = relative => readFile(new URL(relative, import.meta.url), "utf8");

test("outline-to-novel entry uses a dedicated preview route and is hidden on mobile", async () => {
  const [workspace, router, page] = await Promise.all([
    read("../src/pages/outlines/OutlineWorkspacePage.tsx"),
    read("../src/router/index.tsx"),
    read("../src/pages/outlines/openBook/OutlineOpenBookPage.tsx"),
  ]);
  assert.match(workspace, /useIsMobileViewport/);
  assert.match(workspace, /Start novel from outline/);
  assert.match(workspace, /bindingQuery\.isSuccess/);
  assert.match(router, /outlines\/:id\/open-book/);
  assert.match(page, /Confirm the outline and start a novel on desktop/);
});

test("outline-to-novel requests follow the shared contract and freeze the saved revision", async () => {
  const [api, page] = await Promise.all([
    read("../src/api/outlines.ts"),
    read("../src/pages/outlines/openBook/OutlineOpenBookPage.tsx"),
  ]);
  assert.match(api, /@ai-novel\/shared\/types\/outlineOpenBook/);
  assert.doesNotMatch(api, /export interface OutlineOpenBook(?:Preview|Settings|Binding)/);
  assert.match(page, /volumeQuotas:quotas/);
  assert.match(page, /requestHash:hash/);
  assert.match(page, /preview\.variables/);
  assert.match(page, /pending suggestions are excluded/);
  assert.match(page, /unsaved/);
  assert.match(page, /getOutlineRevision\(id, revisionId\)/);
  assert.match(page, /No model is called and no text is generated automatically/);
});

test("binding query preserves 200/null and does not treat project 404 as unbound", async () => {
  const api = await read("../src/api/outlines.ts");
  assert.doesNotMatch(api, /validateStatus:.*404|response\.status === 404 \? null/);
  assert.match(api, /as OutlineBookBindingView \| null/);
});
