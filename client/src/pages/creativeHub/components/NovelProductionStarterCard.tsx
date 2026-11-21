import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { CreativeHubProductionStatus } from "@ai-novel/shared/types/creativeHub";
import { RefreshCw } from "lucide-react";
import { getNovelDetail, updateNovel } from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import { WorkspaceStateNotice } from "@/components/workspace";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import SelectControl from "@/components/common/SelectControl";

interface NovelProductionStarterCardProps {
  currentNovelTitle?: string | null;
  currentNovelId?: string | null;
  productionStatus?: CreativeHubProductionStatus | null;
  actionDisabled?: boolean;
  onSubmit: (prompt: string) => void | Promise<void>;
  onQuickAction?: (prompt: string) => void;
}

const PRODUCTION_PROMPT_LABELS: Record<string, string> = {
  "第一人称": "First person",
  "第三人称": "Third person",
  "混合视角": "Mixed perspective",
  "慢节奏": "Slow-paced",
  "均衡节奏": "Balanced",
  "快节奏": "Fast-paced",
  "AI 主导": "AI-led",
  "人机协作": "Co-writing",
  "草稿优先": "Draft-first",
  "自动流水线": "Automated pipeline",
  "低": "Low",
  "中": "Medium",
  "高": "High",
};

function ProductionField(props: {
  htmlFor: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={props.htmlFor} className="block text-xs font-medium text-foreground">
        {props.label}
      </label>
      {props.children}
      {props.hint ? <p className="text-xs leading-5 text-muted-foreground">{props.hint}</p> : null}
    </div>
  );
}

function fromNarrativePov(value: "first_person" | "third_person" | "mixed" | null | undefined): string {
  if (value === "first_person") return "第一人称";
  if (value === "third_person") return "第三人称";
  if (value === "mixed") return "混合视角";
  return "";
}

function toNarrativePov(value: string): "first_person" | "third_person" | "mixed" | null {
  if (value === "第一人称") return "first_person";
  if (value === "第三人称") return "third_person";
  if (value === "混合视角") return "mixed";
  return null;
}

function fromPacePreference(value: "slow" | "balanced" | "fast" | null | undefined): string {
  if (value === "slow") return "慢节奏";
  if (value === "balanced") return "均衡节奏";
  if (value === "fast") return "快节奏";
  return "";
}

function toPacePreference(value: string): "slow" | "balanced" | "fast" | null {
  if (value === "慢节奏") return "slow";
  if (value === "均衡节奏") return "balanced";
  if (value === "快节奏") return "fast";
  return null;
}

function fromProjectMode(value: "ai_led" | "co_pilot" | "draft_mode" | "auto_pipeline" | null | undefined): string {
  if (value === "ai_led") return "AI 主导";
  if (value === "co_pilot") return "人机协作";
  if (value === "draft_mode") return "草稿优先";
  if (value === "auto_pipeline") return "自动流水线";
  return "";
}

function toProjectMode(value: string): "ai_led" | "co_pilot" | "draft_mode" | "auto_pipeline" | null {
  if (value === "AI 主导") return "ai_led";
  if (value === "人机协作") return "co_pilot";
  if (value === "草稿优先") return "draft_mode";
  if (value === "自动流水线") return "auto_pipeline";
  return null;
}

function fromLevel(value: "low" | "medium" | "high" | null | undefined): string {
  if (value === "low") return "低";
  if (value === "medium") return "中";
  if (value === "high") return "高";
  return "";
}

function toLevel(value: string): "low" | "medium" | "high" | null {
  if (value === "低") return "low";
  if (value === "中") return "medium";
  if (value === "高") return "high";
  return null;
}

function buildProductionPrompt(input: {
  currentNovelId?: string | null;
  title: string;
  description: string;
  targetChapterCount: number;
  genre: string;
  styleTone: string;
  narrativePov: string;
  pacePreference: string;
  projectMode: string;
  emotionIntensity: string;
  aiFreedom: string;
  defaultChapterLength: number;
  worldType: string;
}) {
  const description = input.description.trim();
  const genre = input.genre.trim();
  const styleTone = input.styleTone.trim();
  const narrativePov = PRODUCTION_PROMPT_LABELS[input.narrativePov.trim()] ?? input.narrativePov.trim();
  const pacePreference = PRODUCTION_PROMPT_LABELS[input.pacePreference.trim()] ?? input.pacePreference.trim();
  const projectMode = PRODUCTION_PROMPT_LABELS[input.projectMode.trim()] ?? input.projectMode.trim();
  const emotionIntensity = PRODUCTION_PROMPT_LABELS[input.emotionIntensity.trim()] ?? input.emotionIntensity.trim();
  const aiFreedom = input.aiFreedom.trim();
  const defaultChapterLength = Math.max(500, Math.min(10000, Math.floor(input.defaultChapterLength || 2500)));
  const worldType = input.worldType.trim();
  const targetChapterCount = Math.max(1, Math.min(200, Math.floor(input.targetChapterCount || 20)));
  if (input.currentNovelId) {
    const segments = [`Continue producing the current novel. Target chapter count: ${targetChapterCount}. `];
    if (description) {
      segments.push(`Additional details: ${description}. `);
    }
    if (genre) {
      segments.push(`Genre preference: ${genre}. `);
    }
    if (styleTone) {
      segments.push(`Style and tone: ${styleTone}. `);
    }
    if (narrativePov) {
      segments.push(`Narrative perspective: ${narrativePov}. `);
    }
    if (pacePreference) {
      segments.push(`Pacing: ${pacePreference}. `);
    }
    if (projectMode) {
      segments.push(`Collaboration mode: ${projectMode}. `);
    }
    if (emotionIntensity) {
      segments.push(`Emotional intensity: ${emotionIntensity}. `);
    }
    if (aiFreedom) {
      segments.push(`AI freedom: ${aiFreedom}. `);
    }
    if (defaultChapterLength) {
      segments.push(`Default chapter length: about ${defaultChapterLength} words. `);
    }
    if (worldType) {
      segments.push(`Preferred world type: ${worldType}. `);
    }
    return segments.join("");
  }
  const title = input.title.trim();
  const segments = [`Create a ${targetChapterCount}-chapter novel titled "${title}" and begin full-book production. `];
  if (description) {
    segments.push(`Synopsis: ${description}. `);
  }
  if (genre) {
    segments.push(`Genre: ${genre}. `);
  }
  if (styleTone) {
    segments.push(`Style and tone: ${styleTone}. `);
  }
  if (narrativePov) {
    segments.push(`Narrative perspective: ${narrativePov}. `);
  }
  if (pacePreference) {
    segments.push(`Pacing: ${pacePreference}. `);
  }
  if (projectMode) {
    segments.push(`Collaboration mode: ${projectMode}. `);
  }
  if (emotionIntensity) {
    segments.push(`Emotional intensity: ${emotionIntensity}. `);
  }
  if (aiFreedom) {
    segments.push(`AI freedom: ${aiFreedom}. `);
  }
  if (defaultChapterLength) {
    segments.push(`Default chapter length: about ${defaultChapterLength} words. `);
  }
  if (worldType) {
    segments.push(`World type: ${worldType}. `);
  }
  return segments.join("");
}

export default function NovelProductionStarterCard({
  currentNovelTitle,
  currentNovelId,
  productionStatus,
  actionDisabled = false,
  onSubmit,
  onQuickAction,
}: NovelProductionStarterCardProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetChapterCount, setTargetChapterCount] = useState(20);
  const [genre, setGenre] = useState("");
  const [styleTone, setStyleTone] = useState("");
  const [narrativePov, setNarrativePov] = useState("");
  const [pacePreference, setPacePreference] = useState("");
  const [projectMode, setProjectMode] = useState("");
  const [emotionIntensity, setEmotionIntensity] = useState("");
  const [aiFreedom, setAiFreedom] = useState("");
  const [defaultChapterLength, setDefaultChapterLength] = useState(2500);
  const [worldType, setWorldType] = useState("");
  const submitInFlightRef = useRef(false);

  const novelDetailQuery = useQuery({
    queryKey: queryKeys.novels.detail(currentNovelId || "none"),
    queryFn: () => getNovelDetail(currentNovelId!),
    enabled: Boolean(currentNovelId),
    retry: false,
  });

  useEffect(() => {
    setTitle("");
    setDescription("");
    setTargetChapterCount(20);
    setGenre("");
    setStyleTone("");
    setNarrativePov("");
    setPacePreference("");
    setProjectMode("");
    setEmotionIntensity("");
    setAiFreedom("");
    setDefaultChapterLength(2500);
    setWorldType("");
  }, [currentNovelId]);

  useEffect(() => {
    if (productionStatus?.targetChapterCount) {
      setTargetChapterCount(productionStatus.targetChapterCount);
    }
  }, [productionStatus?.targetChapterCount]);

  useEffect(() => {
    const novel = novelDetailQuery.data?.data;
    if (!currentNovelId || !novel) {
      return;
    }
    setDescription(novel.description ?? "");
    setGenre(novel.genre?.name ?? "");
    setStyleTone(novel.styleTone ?? "");
    setNarrativePov(fromNarrativePov(novel.narrativePov));
    setPacePreference(fromPacePreference(novel.pacePreference));
    setProjectMode(fromProjectMode(novel.projectMode));
    setEmotionIntensity(fromLevel(novel.emotionIntensity));
    setAiFreedom(fromLevel(novel.aiFreedom));
    setDefaultChapterLength(novel.defaultChapterLength ?? 2500);
  }, [currentNovelId, novelDetailQuery.data]);

  const resolvedTitle = currentNovelTitle?.trim() || "";
  const isContinueMode = Boolean(currentNovelId);
  const detailErrorMessage = novelDetailQuery.error instanceof Error
    ? novelDetailQuery.error.message
    : isContinueMode && novelDetailQuery.isSuccess && !novelDetailQuery.data?.data
      ? "Could not load production settings for the current novel."
      : "";
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (currentNovelId) {
        await updateNovel(currentNovelId, {
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(styleTone.trim() ? { styleTone: styleTone.trim() } : {}),
          ...(toNarrativePov(narrativePov) ? { narrativePov: toNarrativePov(narrativePov) } : {}),
          ...(toPacePreference(pacePreference) ? { pacePreference: toPacePreference(pacePreference) } : {}),
          ...(toProjectMode(projectMode) ? { projectMode: toProjectMode(projectMode) } : {}),
          ...(toLevel(emotionIntensity) ? { emotionIntensity: toLevel(emotionIntensity) } : {}),
          ...(toLevel(aiFreedom) ? { aiFreedom: toLevel(aiFreedom) } : {}),
          ...(defaultChapterLength
            ? { defaultChapterLength: Math.max(500, Math.min(10000, defaultChapterLength)) }
            : {}),
        });
      }
      await onSubmit(buildProductionPrompt({
        currentNovelId,
        title,
        description,
        targetChapterCount,
        genre,
        styleTone,
        narrativePov,
        pacePreference,
        projectMode,
        emotionIntensity,
        aiFreedom,
        defaultChapterLength,
        worldType,
      }));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to start novel production.");
    },
  });
  const formDisabled = actionDisabled
    || novelDetailQuery.isFetching
    || Boolean(detailErrorMessage)
    || submitMutation.isPending;
  const submitDisabled = formDisabled || (!isContinueMode && !title.trim());
  const fieldClassName = "w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 md:text-sm";
  const startProduction = () => {
    if (submitInFlightRef.current) {
      return;
    }
    submitInFlightRef.current = true;
    submitMutation.mutate(undefined, {
      onSettled: () => {
        submitInFlightRef.current = false;
      },
    });
  };

  return (
    <div className="space-y-3" aria-busy={novelDetailQuery.isFetching || submitMutation.isPending}>
      <div className="text-xs font-medium text-muted-foreground">Novel production</div>
      <div className="space-y-3">
        <div className="rounded-md border border-info/25 bg-info/5 px-3 py-2 text-xs text-muted-foreground">
          {isContinueMode
            ? `Production will continue for “${resolvedTitle || "the current novel"}.”`
            : "Global mode is active. You can create a novel and start production here."}
        </div>
        <div className="rounded-md border border-dashed border-border bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
          Review the genre, style, perspective, pacing, chapter length, and AI freedom first. More complete details help keep production on track.
        </div>

        {novelDetailQuery.isFetching ? (
          <WorkspaceStateNotice
            compact
            loading
            tone="info"
            title="Loading novel settings"
            description="Production cannot start until loading is complete, to avoid overwriting the current novel with empty settings."
          />
        ) : detailErrorMessage ? (
          <WorkspaceStateNotice
            compact
            tone="danger"
            title="Failed to load novel settings"
            description={`${detailErrorMessage} Reload the settings before starting production.`}
            action={(
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={novelDetailQuery.isFetching}
                onClick={() => void novelDetailQuery.refetch()}
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                {novelDetailQuery.isFetching ? "Retrying..." : "Reload"}
              </Button>
            )}
          />
        ) : null}

        {!isContinueMode ? (
          <ProductionField
            htmlFor="creative-hub-production-title"
            label="Novel title"
            hint="Required when creating a new novel."
          >
            <input
              id="creative-hub-production-title"
              className={fieldClassName}
              placeholder="For example: The Lantern Keeper of the Long Night"
              value={title}
              disabled={formDisabled}
              required
              onChange={(event) => setTitle(event.target.value)}
            />
          </ProductionField>
        ) : null}

        <ProductionField htmlFor="creative-hub-production-description" label="Summary and core premise">
          <textarea
            id="creative-hub-production-description"
            className={`${fieldClassName} min-h-[88px] resize-y`}
            placeholder="Summarize the protagonist's situation, central conflict, and the experience you want this novel to deliver"
            value={description}
            disabled={formDisabled}
            onChange={(event) => setDescription(event.target.value)}
          />
        </ProductionField>

        <div className="grid gap-2 sm:grid-cols-2">
          <ProductionField htmlFor="creative-hub-production-genre" label="Genre">
            <input
              id="creative-hub-production-genre"
              className={fieldClassName}
              placeholder="For example: Eastern fantasy"
              value={genre}
              disabled={formDisabled}
              onChange={(event) => setGenre(event.target.value)}
            />
          </ProductionField>
          <ProductionField htmlFor="creative-hub-production-style" label="Style and tone">
            <input
              id="creative-hub-production-style"
              className={fieldClassName}
              placeholder="For example: Lighthearted and energetic"
              value={styleTone}
              disabled={formDisabled}
              onChange={(event) => setStyleTone(event.target.value)}
            />
          </ProductionField>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <ProductionField htmlFor="creative-hub-production-pov" label="Narrative perspective">
            <SelectControl
              id="creative-hub-production-pov"
              className={fieldClassName}
              value={narrativePov}
              disabled={formDisabled}
              onChange={(event) => setNarrativePov(event.target.value)}
            >
              <option value="">Let AI decide</option>
              <option value="第一人称">First person</option>
              <option value="第三人称">Third person</option>
              <option value="混合视角">Mixed perspective</option>
            </SelectControl>
          </ProductionField>
          <ProductionField htmlFor="creative-hub-production-pace" label="Pacing">
            <SelectControl
              id="creative-hub-production-pace"
              className={fieldClassName}
              value={pacePreference}
              disabled={formDisabled}
              onChange={(event) => setPacePreference(event.target.value)}
            >
              <option value="">Let AI decide</option>
              <option value="慢节奏">Slow</option>
              <option value="均衡节奏">Balanced</option>
              <option value="快节奏">Fast</option>
            </SelectControl>
          </ProductionField>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <ProductionField htmlFor="creative-hub-production-mode" label="Collaboration mode">
            <SelectControl
              id="creative-hub-production-mode"
              className={fieldClassName}
              value={projectMode}
              disabled={formDisabled}
              onChange={(event) => setProjectMode(event.target.value)}
            >
              <option value="">Use novel default</option>
              <option value="AI 主导">AI-led</option>
              <option value="人机协作">Co-writing</option>
              <option value="草稿优先">Draft-first</option>
              <option value="自动流水线">Automated pipeline</option>
            </SelectControl>
          </ProductionField>
          <ProductionField htmlFor="creative-hub-production-emotion" label="Emotional intensity">
            <SelectControl
              id="creative-hub-production-emotion"
              className={fieldClassName}
              value={emotionIntensity}
              disabled={formDisabled}
              onChange={(event) => setEmotionIntensity(event.target.value)}
            >
              <option value="">Use novel default</option>
              <option value="低">Low</option>
              <option value="中">Medium</option>
              <option value="高">High</option>
            </SelectControl>
          </ProductionField>
          <ProductionField htmlFor="creative-hub-production-freedom" label="AI freedom">
            <SelectControl
              id="creative-hub-production-freedom"
              className={fieldClassName}
              value={aiFreedom}
              disabled={formDisabled}
              onChange={(event) => setAiFreedom(event.target.value)}
            >
              <option value="">Use novel default</option>
              <option value="低">Low</option>
              <option value="中">Medium</option>
              <option value="高">High</option>
            </SelectControl>
          </ProductionField>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <ProductionField htmlFor="creative-hub-production-chapters" label="Target chapter count">
            <input
              id="creative-hub-production-chapters"
              className={fieldClassName}
              type="number"
              min={1}
              max={200}
              value={targetChapterCount}
              disabled={formDisabled}
              onChange={(event) => setTargetChapterCount(Number(event.target.value || 20))}
            />
          </ProductionField>
          <ProductionField htmlFor="creative-hub-production-length" label="Default chapter length (words)">
            <input
              id="creative-hub-production-length"
              className={fieldClassName}
              type="number"
              min={500}
              max={10000}
              value={defaultChapterLength}
              disabled={formDisabled}
              onChange={(event) => setDefaultChapterLength(Number(event.target.value || 2500))}
            />
          </ProductionField>
          <ProductionField htmlFor="creative-hub-production-world" label="World type (optional)">
            <input
              id="creative-hub-production-world"
              className={fieldClassName}
              placeholder="For example: Post-apocalyptic wasteland"
              value={worldType}
              disabled={formDisabled}
              onChange={(event) => setWorldType(event.target.value)}
            />
          </ProductionField>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={submitDisabled}
            onClick={startProduction}
          >
            {submitMutation.isPending ? "Starting..." : isContinueMode ? "Continue novel production" : "Start novel production"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={formDisabled}
            onClick={() => onQuickAction?.("How far along is full-book production?")}
          >
            View progress
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={formDisabled}
            onClick={() => onQuickAction?.("Why hasn't full-book production started?")}
          >
            Review blockers
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={formDisabled}
            onClick={() => onQuickAction?.("Based on the current novel, suggest three options for each production setting: genre, style, perspective, pacing, chapter length, and AI freedom.")}
          >
            Suggest options
          </Button>
        </div>
      </div>
    </div>
  );
}
