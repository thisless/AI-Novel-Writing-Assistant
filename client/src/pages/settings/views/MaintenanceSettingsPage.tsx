import SettingsMaintenanceSection from "../components/SettingsMaintenanceSection";
import { SettingsShell } from "../components/SettingsShell";

export default function MaintenanceSettingsPage() {
  return (
    <SettingsShell title="Desktop & Maintenance" description="View updates, imports, and maintenance options for your current environment.">
      <SettingsMaintenanceSection />
    </SettingsShell>
  );
}
