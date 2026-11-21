import type { ReactNode } from "react";
import { AppDialogContent, Dialog, DialogTrigger } from "@/components/ui/dialog";
import { useDesktopUpdater } from "@/lib/desktop";
import DesktopUpdatePanel from "./DesktopUpdatePanel";

interface DesktopUpdateDialogProps {
  trigger: ReactNode;
}

export default function DesktopUpdateDialog({ trigger }: DesktopUpdateDialogProps) {
  const updater = useDesktopUpdater();

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <AppDialogContent
        className="max-w-2xl"
        title="Version & updates"
        description="Check desktop app status, then confirm to download and install an update."
      >
        <DesktopUpdatePanel updater={updater} />
      </AppDialogContent>
    </Dialog>
  );
}
