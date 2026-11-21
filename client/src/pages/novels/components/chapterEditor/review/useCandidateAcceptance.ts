import { useMutation } from "@tanstack/react-query";
import type { ChapterEditorCandidate } from "@ai-novel/shared/types/novel";
import { applySelectedChapterEditorDiff, groupChapterEditorDiffChanges, insertChapterContinuation, replaceChapterSelection } from "@ai-novel/shared/types/chapterEditor/document";
import { createNovelSnapshot, updateNovelChapter } from "@/api/novel";
import { toast } from "@/components/ui/toast";
import type { ChapterEditorSessionState } from "../chapterEditorTypes";

export function useCandidateAcceptance(input: {
  novelId: string;
  chapter?: { id: string; order: number };
  session: ChapterEditorSessionState;
  candidate: ChapterEditorCandidate | null;
  selectedChangeIds: ReadonlySet<string>;
  content: string;
  sourceSnapshot?: string;
  savedUpdatedAt: string;
  savedContent: string;
  acknowledgeSave: (expectedDraftContent: string, saved: { content?: string | null; updatedAt: string }) => void;
  onAccepted: (result: { nextContent: string; savedUpdatedAt: string; fullyAccepted: boolean }) => Promise<void>;
}) {
  return useMutation({
    mutationFn: async () => {
      const { chapter, candidate, session, selectedChangeIds } = input;
      const sourceContent = input.content;
      if (!chapter || !candidate || !session.targetRange || session.status !== "ready") {
        throw new Error("There is no candidate ready to apply.");
      }
      if (selectedChangeIds.size === 0) throw new Error("Select at least one change to accept.");
      if (input.sourceSnapshot !== sourceContent) throw new Error("The manuscript has changed. Generate a new revision.");
      const replacement = applySelectedChapterEditorDiff(session.targetRange.text, candidate.content, candidate.diffChunks, selectedChangeIds);
      const nextContent = session.mode === "continuation"
        ? insertChapterContinuation(sourceContent, session.targetRange.from, replacement)
        : replaceChapterSelection(sourceContent, session.targetRange, replacement);
      if (nextContent === sourceContent) throw new Error("The selected changes match the original text. Nothing to save.");
      await createNovelSnapshot(input.novelId, {
        triggerType: "manual", label: `chapter-editor:${chapter.order}:${session.scope}:${Date.now()}`,
      });
      const response = await updateNovelChapter(input.novelId, chapter.id, {
        content: nextContent, expectedUpdatedAt: input.savedUpdatedAt, expectedContent: input.savedContent,
      });
      const fullyAccepted = groupChapterEditorDiffChanges(candidate.diffChunks).every((change) => selectedChangeIds.has(change.id));
      return { sourceContent, nextContent, saved: response.data, fullyAccepted };
    },
    onSuccess: async ({ sourceContent, nextContent, saved, fullyAccepted }) => {
      const savedUpdatedAt = String(saved?.updatedAt ?? Date.now());
      input.acknowledgeSave(sourceContent, { content: saved?.content ?? nextContent, updatedAt: savedUpdatedAt });
      await input.onAccepted({ nextContent: saved?.content ?? nextContent, savedUpdatedAt, fullyAccepted });
      toast.success("Selected changes saved. You can view the previous version in the history.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not apply the candidate."),
  });
}
