import { InvocationHistorySection } from "../models/InvocationHistorySection";
import { WorldGenerationTimeoutSection } from "../models/WorldGenerationTimeoutSection";
import SettingsPage from "../SettingsPage";
import { SettingsShell } from "../components/SettingsShell";

export default function ModelsSettingsPage() {
  return (
    <SettingsShell title="Models & Providers" description="Add and manage the providers and models available for writing.">
      <SettingsPage />
      <WorldGenerationTimeoutSection />
      <InvocationHistorySection />
    </SettingsShell>
  );
}
