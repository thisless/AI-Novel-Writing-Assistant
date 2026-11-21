import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DesktopLegacyDataImportCard from "@/components/layout/DesktopLegacyDataImportCard";
import DesktopUpdateCard from "@/components/layout/DesktopUpdateCard";
import { APP_RUNTIME } from "@/lib/constants";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

export default function SettingsMaintenanceSection() {
  if (APP_RUNTIME !== "desktop") {
    return (
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>System maintenance</CardTitle>
          <CardDescription className={AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}>
            You are using the web app. Desktop updates and importing local legacy data are available only in the desktop app.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>System maintenance</CardTitle>
          <CardDescription className={AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}>
            Check for desktop updates or import local legacy data. These actions do not affect your current writing settings.
          </CardDescription>
        </CardHeader>
        <CardContent className={`text-sm text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
          If you do not need maintenance, return to the writing settings above.
        </CardContent>
      </Card>
      <DesktopUpdateCard />
      <DesktopLegacyDataImportCard compact />
    </div>
  );
}
