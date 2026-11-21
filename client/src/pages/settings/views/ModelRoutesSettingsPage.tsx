import ModelRoutesPage from "../ModelRoutesPage";
import { SettingsShell } from "../components/SettingsShell";

export default function ModelRoutesSettingsPage() {
  return (
    <SettingsShell title="Model Routing" description="Choose models for different writing tasks and configure fallback models for structured output.">
      <ModelRoutesPage />
    </SettingsShell>
  );
}
