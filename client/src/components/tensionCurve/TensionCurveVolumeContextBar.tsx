import { Badge } from "@/components/ui/badge";

export interface TensionCurveVolumeContext {
  roleLabel?: string | null;
  coreReward?: string | null;
  escalationFocus?: string | null;
  planningMode?: "hard" | "soft" | null;
}

interface TensionCurveVolumeContextBarProps {
  volume?: TensionCurveVolumeContext | null;
}

function contextText(value: string | null | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

export function TensionCurveVolumeContextBar({ volume }: TensionCurveVolumeContextBarProps) {
  return (
    <div className="grid gap-3 rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm lg:grid-cols-[auto_1fr_1fr_1fr] lg:items-start">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={volume?.planningMode === "hard" ? "secondary" : "outline"}>
          {volume?.planningMode === "hard" ? "Fixed plan" : "Volume framing"}
        </Badge>
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">Volume function</div>
        <div className="mt-1 line-clamp-2 text-foreground">{contextText(volume?.roleLabel, "Use the volume title and chapter direction as a guide.")}</div>
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">Reader payoff</div>
        <div className="mt-1 line-clamp-2 text-foreground">{contextText(volume?.coreReward, "Preserve the volume's central payoff when adjusting the curve.")}</div>
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">Escalation focus</div>
        <div className="mt-1 line-clamp-2 text-foreground">{contextText(volume?.escalationFocus, "Make the peaks serve the volume's most important developments.")}</div>
      </div>
    </div>
  );
}
