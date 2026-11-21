import { lazy, Suspense } from "react";
import { AppDialogContent, Dialog } from "@/components/ui/dialog";

const ModelProviderSettings = lazy(() => import("../SettingsPage"));

export function ModelSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent
        title="Models & Providers"
        description="Manage the providers, connection settings, and models used for writing."
        className="max-w-5xl"
        bodyClassName="min-h-[min(32rem,65dvh)] p-4 sm:p-6"
      >
        <Suspense fallback={<div role="status" className="py-8 text-sm text-muted-foreground">Loading model settings…</div>}>
          {open ? <ModelProviderSettings embedded /> : null}
        </Suspense>
      </AppDialogContent>
    </Dialog>
  );
}
