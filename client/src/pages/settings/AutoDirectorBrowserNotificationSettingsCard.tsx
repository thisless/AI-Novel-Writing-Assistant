import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  AUTO_DIRECTOR_PAUSE_NOTIFICATION_SETTINGS_EVENT,
  type BrowserNotificationPermissionState,
  getBrowserNotificationPermission,
  isAutoDirectorPauseNotificationEnabled,
  requestBrowserNotificationPermission,
  setAutoDirectorPauseNotificationEnabled,
} from "@/lib/autoDirectorPauseNotifications";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

function formatPermission(permission: BrowserNotificationPermissionState): string {
  switch (permission) {
    case "granted":
      return "Granted";
    case "denied":
      return "Blocked";
    case "default":
      return "Not requested";
    case "unsupported":
      return "Not supported";
  }
}

export function AutoDirectorBrowserNotificationSettingsCard(props: {
  onActionResult: (message: string) => void;
}) {
  const { onActionResult } = props;
  const [enabled, setEnabled] = useState(() => isAutoDirectorPauseNotificationEnabled());
  const [permission, setPermission] = useState<BrowserNotificationPermissionState>(() => getBrowserNotificationPermission());

  const refreshState = () => {
    setEnabled(isAutoDirectorPauseNotificationEnabled());
    setPermission(getBrowserNotificationPermission());
  };

  useEffect(() => {
    const handleSettingsChange = () => refreshState();
    window.addEventListener(AUTO_DIRECTOR_PAUSE_NOTIFICATION_SETTINGS_EVENT, handleSettingsChange);
    window.addEventListener("storage", handleSettingsChange);
    return () => {
      window.removeEventListener(AUTO_DIRECTOR_PAUSE_NOTIFICATION_SETTINGS_EVENT, handleSettingsChange);
      window.removeEventListener("storage", handleSettingsChange);
    };
  }, []);

  const handleEnable = async () => {
    let nextPermission = getBrowserNotificationPermission();
    if (nextPermission === "unsupported") {
      setAutoDirectorPauseNotificationEnabled(false);
      refreshState();
      onActionResult("This browser does not support desktop notifications.");
      return;
    }
    if (nextPermission === "default") {
      nextPermission = await requestBrowserNotificationPermission();
    }
    if (nextPermission !== "granted") {
      setAutoDirectorPauseNotificationEnabled(false);
      refreshState();
      onActionResult("Notifications are not allowed by the browser. Desktop alerts will not be sent when Auto Director pauses.");
      return;
    }
    setAutoDirectorPauseNotificationEnabled(true);
    refreshState();
    onActionResult("Auto Director pause alerts enabled.");
  };

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      setAutoDirectorPauseNotificationEnabled(false);
      refreshState();
      onActionResult("Auto Director pause alerts disabled.");
      return;
    }
    void handleEnable();
  };

  const permissionLabel = formatPermission(permission);
  const canRequestPermission = permission === "default";

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="space-y-1.5">
        <div className="flex min-w-0 items-start gap-3">
          <BellRing className="mt-1 h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 space-y-1.5">
            <CardTitle>Auto Director pause alerts</CardTitle>
            <CardDescription className={AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}>
              Browser notifications will prompt you to return to the follow-up center when Auto Director needs confirmation, needs to resume, or is blocked by validation.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex min-w-0 items-center justify-between gap-4 rounded-md border bg-muted/10 p-3">
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-medium">Desktop notifications</div>
            <div className={`${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText} text-xs text-muted-foreground`}>
              Applies only to this browser on this computer.
            </div>
          </div>
          <Switch
            checked={enabled && permission === "granted"}
            onCheckedChange={handleToggle}
            disabled={permission === "unsupported"}
            aria-label="Enable or disable Auto Director pause alerts"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-3 rounded-md border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-medium">Notification permission: {permissionLabel}</div>
            <div className={`${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText} text-xs text-muted-foreground`}>
              If notifications are blocked, allow this site to send notifications in the browser's address bar permissions.
            </div>
          </div>
          {canRequestPermission ? (
            <Button
              type="button"
              variant="outline"
              className={AUTO_DIRECTOR_MOBILE_CLASSES.fullWidthAction}
              onClick={() => void handleEnable()}
            >
              Allow browser notifications
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
