import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatOutlineValue, localizeOutlineText } from "../src/pages/outlines/outlineNodes.ts";

const before = { story: { nodeId: "s", title: "总纲" }, volumes: [], chapters: [{ nodeId: "c", title: "第一章：来信" }], characters: [{ nodeId: "p", name: "苏禾" }], payoffs: [], facts: [] };
const after = { ...before, chapters: [{ nodeId: "c", title: "第一章：空信封" }] };

test("outline comparisons resolve arrays against each selected revision", () => {
  assert.equal(formatOutlineValue(["c"], "payoffChapterNodeIds", before), "第一章：来信");
  assert.equal(formatOutlineValue(["c"], "payoffChapterNodeIds", after), "第一章：空信封");
  assert.equal(formatOutlineValue(["p"], "characterNodeIds", before), "苏禾");
});
test("outline empty and deleted references are human readable", () => {
  assert.equal(formatOutlineValue([], "relatedNodeIds", before), "Not set");
  assert.equal(formatOutlineValue(["missing"], "relatedNodeIds", before), "(Deleted node)");
  assert.equal(formatOutlineValue({ type: "chapter", nodeId: "c" }, "scope", before), "Type: Chapter; Node: 第一章：来信");
});
test("proposal references include newly added and renamed nodes", () => {
  assert.equal(formatOutlineValue(["new-c"], "chapterNodeIds", before, { "new-c": "第二章：退潮" }), "第二章：退潮");
  assert.equal(formatOutlineValue("c", "volumeNodeId", before, { c: "新标题" }), "新标题");
});
test("model risk prose translates known fields and hides internal operation IDs", () => {
  assert.equal(localizeOutlineText("theme repeated; immutable=false; consistent with op-tone-07", { "op-tone-07": "Edit “Story”" }), "Theme repeated; Editable setting; consistent with Edit “Story”");
  assert.equal(localizeOutlineText("op-unknown-01 depends on tone"), "related change depends on Tone");
});
test("outline layout is scoped, independently scrollable and comparison columns use pane width", () => {
  const css = readFileSync(new URL("../src/pages/outlines/outlineWorkspace.css", import.meta.url), "utf8");
  assert.match(css, /@container \(min-width: 400px\)/);
  assert.match(css, /clamp\(420px, 32vw, 480px\)/);
  assert.match(css, /overflow-y: auto/);
  const sidebar = readFileSync(new URL("../src/components/layout/Sidebar.tsx", import.meta.url), "utf8");
  assert.ok(!sidebar.includes('"bg-primary/5 hover:bg-primary/10"'));
});
