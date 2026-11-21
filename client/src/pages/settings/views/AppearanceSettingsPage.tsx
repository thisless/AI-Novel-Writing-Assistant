import { Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsShell } from "../components/SettingsShell";
import { useTheme } from "@/components/theme/ThemeProvider";

const palettes = [
  { value: "ink", label: "Ink", description: "A restrained blue-gray palette for everyday writing." },
  { value: "paper", label: "Warm Paper", description: "A soft off-white palette for reading and chapter editing." },
  { value: "night", label: "Night Voyage", description: "Deep indigo and teal for AI runs and log review." },
] as const;

export default function AppearanceSettingsPage() {
  const { mode, palette, density, setMode, setPalette, setDensity, reset } = useTheme();
  return (
    <SettingsShell title="Appearance & Theme" description="Choose interface colors and display density for long writing sessions.">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Palette className="h-4 w-4" />Interface appearance</CardTitle>
          <CardDescription>Your theme is saved on this device only and does not affect novel content or task status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <label className="block space-y-2 text-sm font-medium">
            <span>Display mode</span>
            <Select value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>Color theme</span>
            <Select value={palette} onValueChange={(value) => setPalette(value as typeof palette)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {palettes.map((item) => <SelectItem key={item.value} value={item.value}>{item.label} · {item.description}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>Interface density</span>
            <Select value={density} onValueChange={(value) => setDensity(value as typeof density)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" />Reset theme to default</Button>
          </div>
        </CardContent>
      </Card>
    </SettingsShell>
  );
}
