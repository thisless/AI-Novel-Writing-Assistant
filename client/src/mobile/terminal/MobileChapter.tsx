import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Chapter } from "@ai-novel/shared/types/novel";
import { updateNovelChapter } from "@/api/novel";
import { useChapterDraft } from "@/pages/novels/components/chapterEditor/document";
import { Button } from "@/components/ui/button";

export function MobileChapter({ novelId, chapter }: { novelId: string; chapter: Chapter }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const draft = useChapterDraft({ novelId, chapter, busy: saving });
  async function save() {
    setSaving(true); setError("");
    const content = draft.contentDraft;
    try {
      const response = await updateNovelChapter(novelId, chapter.id, { content, expectedUpdatedAt: draft.savedUpdatedAt, expectedContent: draft.savedContent });
      if (!response.data) throw new Error("Could not save the chapter. Please try again.");
      draft.acknowledgeSave(content, response.data);
      await queryClient.invalidateQueries({ queryKey: ["mobileNovel", novelId] });
      setEditing(false);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not save the chapter. Please try again."); }
    finally { setSaving(false); }
  }
  return <article className="space-y-4 border-t pt-5">
    <h2 className="text-lg font-semibold">Chapter {chapter.order} · {chapter.title}</h2>
    <p className="text-xs text-muted-foreground">{chapter.content?.trim() ? `${chapter.content.length} characters` : "Chapter text not yet generated"}</p>
    {draft.restored || draft.isDirty ? <p role="status" className="text-sm text-muted-foreground">You have unsaved local edits. Select “Edit chapter” to continue.</p> : null}
    {draft.storageError ? <p role="alert" className="text-sm text-destructive">Could not save the local draft. Keep this page open and save the chapter text.</p> : null}
    {draft.hasExternalChange ? <div role="alert" className="space-y-2 text-sm text-destructive"><p>The saved chapter text has changed. Review the changes, then load the latest version.</p><Button variant="outline" onClick={() => { if (window.confirm("Loading the latest chapter text will replace your unsaved local edits. Continue?")) draft.loadSavedVersion(); }}>Load saved version</Button></div> : null}
    {editing ? <>
      <textarea aria-label="Chapter text" className="min-h-[60dvh] w-full rounded-md border bg-background p-3 text-base leading-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={draft.contentDraft} disabled={saving} onChange={event => draft.setContentDraft(event.target.value)} />
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <div className="sticky bottom-20 flex gap-3 bg-background py-3"><Button onClick={() => void save()} disabled={saving || !draft.isDirty || draft.hasExternalChange}>{saving ? "Saving…" : "Save chapter"}</Button><Button variant="ghost" disabled={saving} onClick={() => setEditing(false)}>Back to reading</Button></div>
    </> : <><div className="whitespace-pre-wrap break-words text-base leading-8">{chapter.content || "Chapter text will appear here after AI generation."}</div><Button variant="outline" onClick={() => setEditing(true)}>Edit chapter</Button></>}
  </article>;
}
