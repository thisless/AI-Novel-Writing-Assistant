import type { DesktopUpdaterSnapshot } from "@/lib/desktop";

export function formatDesktopVersion(version: string): string {
  const trimmed = version.trim();
  if (!trimmed || trimmed === "0.0.0") {
    return "v0.0.0";
  }
  return trimmed.startsWith("v") ? trimmed : `v${trimmed}`;
}

export function getDesktopUpdaterStatusLabel(status: DesktopUpdaterSnapshot["status"]): string {
  switch (status) {
    case "disabled":
      return "Unavailable";
    case "idle":
      return "Not checked";
    case "checking":
      return "Checking";
    case "update-available":
      return "Update available";
    case "downloading":
      return "Downloading";
    case "downloaded":
      return "Ready to install";
    case "not-available":
      return "Up to date";
    case "error":
      return "Check failed";
    default:
      return status;
  }
}

export function getDesktopUpdaterHint(updater: DesktopUpdaterSnapshot): string {
  if (!updater.isSupported) {
    if (updater.isPortable) {
      return "For the portable version, download and replace the app manually. Your writing data will not be affected.";
    }
    if (!updater.isPackaged) {
      return "Development builds do not download installers. You can check for and install updates here in a packaged release.";
    }
    return "This installation cannot connect to the update service right now.";
  }

  switch (updater.status) {
    case "idle":
      return "Check for desktop updates at any time. You can confirm before downloading and restarting to install.";
    case "checking":
      return "Connecting to the update service…";
    case "update-available":
      return `${formatDesktopVersion(updater.availableVersion ?? "New version")} is available. You can keep using the app while it downloads.`;
    case "downloading":
      return "The update is downloading in the background. Keep the app open.";
    case "downloaded":
      return "The update is ready. Restart the app to install it, and save any unsaved work first.";
    case "not-available":
      return "This installation is up to date on its update channel.";
    case "error":
      return "Could not check for updates. Check your network connection and try again.";
    default:
      return "Check the desktop app version status here.";
  }
}

export function getDesktopInstallModeLabel(updater: DesktopUpdaterSnapshot): string {
  if (updater.isPortable) {
    return "Portable";
  }
  if (!updater.isPackaged) {
    return "Development";
  }
  return "Installed";
}

export function getDesktopChannelLabel(channel: string): string {
  return channel === "beta" ? "Beta channel" : channel === "latest" ? "Stable channel" : `${channel} channel`;
}
