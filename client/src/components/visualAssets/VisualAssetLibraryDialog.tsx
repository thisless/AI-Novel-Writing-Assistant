import { Dialog, AppDialogContent } from "@/components/ui/dialog";
import { VisualAssetLibrary } from "./VisualAssetLibrary";
import type { VisualAssetLibraryDialogProps } from "./visualAssetLibrary.types";

export function VisualAssetLibraryDialog({
  open,
  onOpenChange,
  selectionMode = "browse",
  ...libraryProps
}: VisualAssetLibraryDialogProps) {
  const isPicker = selectionMode !== "browse";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent
        title={isPicker ? "Select visual assets" : "Visual asset library"}
        description={isPicker ? "Choose existing assets to bring into your current work." : "Browse and organize images from your projects."}
        className="h-[min(88dvh,900px)] w-[min(90vw,1440px)] max-w-none"
        bodyClassName="overflow-hidden p-0"
      >
        <VisualAssetLibrary {...libraryProps} selectionMode={selectionMode} />
      </AppDialogContent>
    </Dialog>
  );
}
