import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_RUNTIME } from "@/lib/constants";
import { useDesktopUpdater } from "@/lib/desktop";
import DesktopUpdatePanel from "./DesktopUpdatePanel";

export default function DesktopUpdateCard() {
  const updater = useDesktopUpdater();

  if (APP_RUNTIME !== "desktop") {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desktop updates</CardTitle>
        <CardDescription>Check update details here, or click the version number at the top of the workspace to open the update panel.</CardDescription>
      </CardHeader>
      <CardContent>
        <DesktopUpdatePanel updater={updater} />
      </CardContent>
    </Card>
  );
}
