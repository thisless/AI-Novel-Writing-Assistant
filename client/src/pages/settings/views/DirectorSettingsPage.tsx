import { useState } from "react";
import AutoDirectorSettingsSection from "../AutoDirectorSettingsSection";
import SettingsActionResult from "../SettingsActionResult";
import { SettingsShell } from "../components/SettingsShell";

export default function DirectorSettingsPage() {
  const [message, setMessage] = useState("");
  return (
    <SettingsShell title="Auto Director" description="Configure issue handling, automatic confirmations, and writing reminders. Each book keeps the execution rules that were set when it started.">
      <AutoDirectorSettingsSection onActionResult={setMessage} collapseAdvanced />
      <SettingsActionResult message={message} />
    </SettingsShell>
  );
}
