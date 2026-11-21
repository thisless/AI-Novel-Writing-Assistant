import { useState } from "react";
import type { CharacterMindSnapshot } from "@ai-novel/shared/types/characterMind";
import { Brain, ChevronDown, ChevronUp, CircleAlert, Lightbulb, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CharacterMindSceneAnalysisProps {
  className?: string;
  characterName: string;
  mind: CharacterMindSnapshot;
}

export default function CharacterMindSceneAnalysis(props: CharacterMindSceneAnalysisProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <aside className={cn("min-w-0 rounded-3xl border border-border/70 bg-background p-5 shadow-sm xl:sticky xl:top-0", props.className)}>
      <div className="flex items-center gap-2 text-sm font-semibold"><Brain className="h-4 w-4 text-primary" />Character scene analysis</div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">This AI-generated analysis explains how {props.characterName} might respond. It does not change the story canon.</p>

      <section className="mt-5 rounded-2xl border border-primary/15 bg-primary/[0.045] p-4">
        <div className="text-xs font-medium text-primary">How the character sees the situation</div>
        <p className="mt-2 text-sm leading-7 text-foreground">{props.mind.currentInterpretation}</p>
      </section>

      <div className="mt-4 space-y-3">
        <AnalysisItem icon={Lightbulb} title="Focus in conversation" value={props.mind.activePlan || props.mind.privateIntent || "AI has not identified a consistent focus."} />
        <AnalysisItem icon={CircleAlert} title="Possible misinterpretation" value={props.mind.misbeliefs[0] || "No clear misinterpretation."} tone="warning" />
        <AnalysisItem icon={ShieldCheck} title="Response under pressure" value={props.mind.actionTendency || "AI has not identified a consistent response."} />
      </div>

      <Button className="mt-4 w-full justify-between" size="sm" variant="ghost" onClick={() => setIsExpanded((current) => !current)}>
        {isExpanded ? "Hide full analysis" : "View full analysis"}
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      {isExpanded ? <div className="mt-3 space-y-3 border-t border-border/60 pt-4">
        <AnalysisItem title="Current emotions and stance" value={props.mind.emotionalStance || "No consistent assessment yet."} />
        <AnalysisItem title="What could change the decision" value={props.mind.decisionTrigger || "No consistent assessment yet."} />
        <AnalysisItem title="Current beliefs" value={props.mind.beliefs.join("; ") || "No beliefs require special attention."} />
        <AnalysisItem title="Reasoning" value={props.mind.evidence.join("; ") || "No reasoning available."} />
      </div> : null}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
        <Badge variant="outline">Source: {props.mind.sourceType === "artifact_delta" ? "Changes after chapter finalization" : props.mind.sourceType === "bootstrap" ? "Character preparation" : "Manual update"}</Badge>
        {typeof props.mind.confidence === "number" ? <Badge variant="outline">Confidence {Math.round(props.mind.confidence * 100)}%</Badge> : null}
      </div>
    </aside>
  );
}

function AnalysisItem(props: { icon?: typeof Brain; title: string; value: string; tone?: "warning" }) {
  const Icon = props.icon;
  return <section className="rounded-2xl border border-border/70 bg-muted/[0.16] p-3.5"><div className={`flex items-center gap-1.5 text-xs font-medium ${props.tone === "warning" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>{Icon ? <Icon className="h-3.5 w-3.5" /> : null}{props.title}</div><p className="mt-1.5 text-sm leading-6 text-foreground">{props.value}</p></section>;
}
