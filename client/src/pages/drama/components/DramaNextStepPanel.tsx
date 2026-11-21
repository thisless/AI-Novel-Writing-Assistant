import {
  CheckCircle2,
  Download,
  Layers3,
  ListVideo,
  RefreshCw,
  Sparkles,
  Video,
  Wand2,
} from "lucide-react";
import type { DramaEpisode, DramaProjectDetail, DramaShot, DramaVideoPrompt } from "@/api/drama";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type NextStepKind =
  | "source"
  | "strategy"
  | "outline"
  | "script"
  | "review"
  | "repair"
  | "storyboard"
  | "videoPrompt"
  | "providerTask"
  | "export";

interface NextStep {
  kind: NextStepKind;
  title: string;
  description: string;
  button: string;
  tab: "source" | "strategy" | "episodes" | "visual" | "export";
  icon: "source" | "strategy" | "outline" | "script" | "review" | "repair" | "video" | "export";
  episodeOrder?: number;
  shot?: DramaShot;
  videoPrompt?: DramaVideoPrompt;
}

function firstEpisodeWithoutScript(episodes: DramaEpisode[]): DramaEpisode | undefined {
  return episodes.find((episode) => !episode.content?.trim());
}

function firstEpisodeWithoutReview(episodes: DramaEpisode[]): DramaEpisode | undefined {
  return episodes.find((episode) =>
    Boolean(episode.content?.trim()) && !["reviewed", "needs_repair", "approved"].includes(episode.status)
  );
}

function firstRepairableEpisode(episodes: DramaEpisode[]): DramaEpisode | undefined {
  return episodes.find((episode) => episode.status === "needs_repair");
}

function firstEpisodeWithoutStoryboard(episodes: DramaEpisode[]): DramaEpisode | undefined {
  return episodes.find((episode) => Boolean(episode.content?.trim()) && (episode.storyboards?.length ?? 0) === 0);
}

function firstShotWithoutVideoPrompt(episodes: DramaEpisode[], videoPrompts: DramaVideoPrompt[]): {
  episode: DramaEpisode;
  shot: DramaShot;
} | undefined {
  const promptedShotIds = new Set(videoPrompts.filter(isActiveVideoPrompt).map((prompt) => prompt.shotId).filter(Boolean));
  for (const episode of episodes) {
    for (const storyboard of episode.storyboards ?? []) {
      for (const shot of storyboard.shots ?? []) {
        if (!promptedShotIds.has(shot.id)) {
          return { episode, shot };
        }
      }
    }
  }
  return undefined;
}

function firstPromptWithoutProviderTask(videoPrompts: DramaVideoPrompt[]): DramaVideoPrompt | undefined {
  return videoPrompts.find((prompt) => isActiveVideoPrompt(prompt) && !prompt.providerTaskId);
}

function isActiveVideoPrompt(prompt: DramaVideoPrompt): boolean {
  return prompt.status !== "superseded";
}

function buildNextStep(project: DramaProjectDetail): NextStep {
  const episodes = project.episodes ?? [];
  const videoPrompts = (project.videoPrompts ?? []).filter(isActiveVideoPrompt);
  const repairable = firstRepairableEpisode(episodes);
  const unreviewed = firstEpisodeWithoutReview(episodes);
  const unscripted = firstEpisodeWithoutScript(episodes);
  const unstagedStoryboard = firstEpisodeWithoutStoryboard(episodes);
  const shotWithoutPrompt = firstShotWithoutVideoPrompt(episodes, videoPrompts);
  const promptWithoutTask = firstPromptWithoutProviderTask(videoPrompts);

  if (!project.sourceBundle) {
    return {
      kind: "source",
      title: "Next: Organize source material",
      description: "Turn a novel, idea, or imported text into a synopsis, beats, characters, and key facts for your drama.",
      button: "Organize material",
      tab: "source",
      icon: "source",
    };
  }
  if (!project.strategy) {
    return {
      kind: "strategy",
      title: "Next: Generate a drama strategy",
      description: "Use the source material and genre to define the target audience, main payoff arc, paywall hooks, and adaptation boundaries.",
      button: "Generate strategy",
      tab: "strategy",
      icon: "strategy",
    };
  }
  if (episodes.length === 0) {
    return {
      kind: "outline",
      title: "Next: Outline the first 12 episodes",
      description: "Generate an episode outline to review the hooks, conflicts, and paywall direction.",
      button: "Outline first 12 episodes",
      tab: "episodes",
      icon: "outline",
    };
  }
  if (unscripted) {
    return {
      kind: "script",
      title: `Next: Write the script for episode ${unscripted.order}`,
      description: "Turn this episode's outline into a shootable, dialogue-rich drama script with an opening hook and a cliffhanger ending.",
      button: "Write script",
      tab: "episodes",
      icon: "script",
      episodeOrder: unscripted.order,
    };
  }
  if (repairable) {
    return {
      kind: "repair",
      title: `Next: Fix quality issues in episode ${repairable.order}`,
      description: "This episode has quality recommendations. Apply them before issues carry into storyboards and video prompts.",
      button: "Fix script",
      tab: "episodes",
      icon: "repair",
      episodeOrder: repairable.order,
    };
  }
  if (unreviewed) {
    return {
      kind: "review",
      title: `Next: Review episode ${unreviewed.order}`,
      description: "Check the opening three seconds, information density, paywall hook, runtime, and consistency of facts and characters.",
      button: "Run quality review",
      tab: "episodes",
      icon: "review",
      episodeOrder: unreviewed.order,
    };
  }
  if (unstagedStoryboard) {
    return {
      kind: "storyboard",
      title: `Next: Create a storyboard for episode ${unstagedStoryboard.order}`,
      description: "Break the approved script into shootable shots while preserving character visual anchors and key actions.",
      button: "Create storyboard",
      tab: "visual",
      icon: "video",
      episodeOrder: unstagedStoryboard.order,
    };
  }
  if (shotWithoutPrompt) {
    return {
      kind: "videoPrompt",
      title: `Next: Create video prompts for episode ${shotWithoutPrompt.episode.order}`,
      description: "Turn a storyboard shot into a vertical-video prompt while preserving the characters, actions, and camera language.",
      button: "Create video prompt",
      tab: "visual",
      icon: "video",
      episodeOrder: shotWithoutPrompt.episode.order,
      shot: shotWithoutPrompt.shot,
    };
  }
  if (promptWithoutTask) {
    return {
      kind: "providerTask",
      title: "Next: Create a video generation task",
      description: "Submit the video prompt to the selected provider. You can refresh its status on the storyboard and video page.",
      button: "Create video task",
      tab: "visual",
      icon: "video",
      videoPrompt: promptWithoutTask,
    };
  }
  return {
    kind: "export",
    title: "Next: Export drama materials",
    description: "Export the characters, episodes, scripts, quality results, and production materials for further editing or delivery.",
    button: "Export Markdown",
    tab: "export",
    icon: "export",
  };
}

function StepIcon({ icon }: { icon: NextStep["icon"] }) {
  const className = "h-4 w-4";
  if (icon === "source") return <Layers3 className={className} />;
  if (icon === "strategy") return <Sparkles className={className} />;
  if (icon === "outline") return <ListVideo className={className} />;
  if (icon === "script") return <Wand2 className={className} />;
  if (icon === "review") return <CheckCircle2 className={className} />;
  if (icon === "repair") return <RefreshCw className={className} />;
  if (icon === "video") return <Video className={className} />;
  return <Download className={className} />;
}

export function DramaNextStepPanel(props: {
  project: DramaProjectDetail;
  busy: boolean;
  onSetTab: (tab: NextStep["tab"]) => void;
  onSelectEpisode: (order: number) => void;
  onAssembleSource: () => void;
  onGenerateStrategy: () => void;
  onGenerateOutline: () => void;
  onGenerateScript: (order: number) => void;
  onReviewEpisode: (order: number) => void;
  onRepairEpisode: (order: number) => void;
  onGenerateStoryboard: (order: number) => void;
  onGenerateVideoPrompt: (shot: DramaShot) => void;
  onCreateProviderTask: (prompt: DramaVideoPrompt) => void;
  onExportMarkdown: () => void;
}) {
  const step = buildNextStep(props.project);
  const runStep = () => {
    props.onSetTab(step.tab);
    if (step.episodeOrder) {
      props.onSelectEpisode(step.episodeOrder);
    }
    if (step.kind === "source") props.onAssembleSource();
    if (step.kind === "strategy") props.onGenerateStrategy();
    if (step.kind === "outline") props.onGenerateOutline();
    if (step.kind === "script" && step.episodeOrder) props.onGenerateScript(step.episodeOrder);
    if (step.kind === "review" && step.episodeOrder) props.onReviewEpisode(step.episodeOrder);
    if (step.kind === "repair" && step.episodeOrder) props.onRepairEpisode(step.episodeOrder);
    if (step.kind === "storyboard" && step.episodeOrder) props.onGenerateStoryboard(step.episodeOrder);
    if (step.kind === "videoPrompt" && step.shot) props.onGenerateVideoPrompt(step.shot);
    if (step.kind === "providerTask" && step.videoPrompt) props.onCreateProviderTask(step.videoPrompt);
    if (step.kind === "export") props.onExportMarkdown();
  };

  return (
    <Card className="rounded-lg">
      <CardHeader className="gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">{step.title}</CardTitle>
            <Badge variant="outline">{props.project.targetEpisodes}-episode project</Badge>
          </div>
          <CardDescription>{step.description}</CardDescription>
        </div>
        <Button type="button" disabled={props.busy} onClick={runStep}>
          <StepIcon icon={step.icon} />
          {props.busy ? "Processing…" : step.button}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <span>Source material organized: {props.project.sourceBundle ? "Yes" : "No"}</span>
        <span>Strategy: {props.project.strategy ? "Generated" : "Not generated"}</span>
        <span>Episodes: {props.project.episodes?.length ?? 0}</span>
        <span>Active video prompts: {(props.project.videoPrompts ?? []).filter(isActiveVideoPrompt).length}</span>
      </CardContent>
    </Card>
  );
}
