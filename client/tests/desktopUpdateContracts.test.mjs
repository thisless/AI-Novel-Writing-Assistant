import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("desktop update entry and one-time release notes contracts are present", () => {
  const badge = read("src/components/layout/AppVersionBadge.tsx");
  const notesDialog = read("src/components/layout/DesktopReleaseNotesDialog.tsx");
  const notes = read("src/components/layout/desktopReleaseNotes.ts");
  const navbar = read("src/components/layout/Navbar.tsx");
  assert.match(badge, /Update now/);
  assert.match(badge, /Restart to install/);
  assert.match(notesDialog, /localStorage/);
  assert.match(notesDialog, /SEEN_PREFIX/);
  assert.match(notes, /What's new/);
  assert.match(navbar, /DesktopReleaseNotesDialog/);
});
