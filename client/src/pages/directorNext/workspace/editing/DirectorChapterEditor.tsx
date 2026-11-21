import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getChapterEditorWorkspace, getNovelDetail } from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { AppDialogContent, Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import ChapterEditorShell from "@/pages/novels/components/chapterEditor/ChapterEditorShell";

export function DirectorChapterEditor({ novelId, chapterId, onClose, onSaved }: {
  novelId: string; chapterId: string; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const editingState = useRef({ isDirty: false, isBusy: false, hasCandidate: false });
  const detailQuery = useQuery({
    queryKey: queryKeys.novels.detail(novelId), queryFn: () => getNovelDetail(novelId),
    refetchOnWindowFocus: false,
  });
  const workspaceQuery = useQuery({
    queryKey: queryKeys.novels.chapterEditorWorkspace(novelId, chapterId),
    queryFn: () => getChapterEditorWorkspace(novelId, chapterId), staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false, refetchOnReconnect: false,
  });
  const chapter = detailQuery.data?.data?.chapters.find(row => row.id === chapterId);
  function requestClose() {
    const state = editingState.current;
    if (state.isBusy) {
      toast.error("Wait for the current operation to finish before leaving the manuscript editor.");
      return;
    }
    if ((state.isDirty || state.hasCandidate) && !window.confirm("Unsaved edits can be restored from the draft. Unaccepted AI candidates will be closed. Leave the manuscript editor?")) return;
    onClose();
  }
  return <Dialog open onOpenChange={open => { if (!open) requestClose(); }}>
    <AppDialogContent title={chapter ? `Edit prose · Chapter ${chapter.order} · ${chapter.title}` : "Edit prose"}
      description="Click in the prose to place the cursor, choose a continuation in the AI actions, then compare and insert a candidate. Generation follow mode is paused while editing."
      className="left-0 top-0 h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 rounded-none border-0"
      bodyClassName="flex min-h-0 flex-col overflow-hidden p-3 sm:p-4"
      onInteractOutside={event => event.preventDefault()}>
      {detailQuery.isError ? <div role="alert" className="space-y-3 py-8 text-sm"><p>Couldn't load the chapter. Reload it before editing.</p><Button onClick={() => void detailQuery.refetch()}>Reload chapter</Button></div>
        : !chapter ? <p className="py-8 text-sm text-muted-foreground">{detailQuery.isLoading ? "Loading chapter…" : "Chapter not found. Return to the directory and select a chapter."}</p>
          : <ChapterEditorShell key={chapter.id} novelId={novelId} chapter={chapter}
            workspace={workspaceQuery.data?.data ?? null}
            workspaceStatus={workspaceQuery.isLoading ? "loading" : workspaceQuery.isError ? "error" : "ready"}
            backLabel="Back to manuscript" onBack={onClose} onChapterSaved={onSaved}
            onEditingStateChange={state => { editingState.current = state; }}
            onRefreshWorkspace={() => { void workspaceQuery.refetch(); }} isRefreshingWorkspace={workspaceQuery.isFetching}/>
      }
    </AppDialogContent>
  </Dialog>;
}
