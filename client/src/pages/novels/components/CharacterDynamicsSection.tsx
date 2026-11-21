import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Character } from "@ai-novel/shared/types/novel";
import AiButton from "@/components/common/AiButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  confirmCharacterCandidate,
  getCharacterCandidates,
  getCharacterDynamicsOverview,
  mergeCharacterCandidate,
  rebuildCharacterDynamics,
  updateCharacterDynamicState,
} from "@/api/novelCharacterDynamics";
import { queryKeys } from "@/api/queryKeys";

type DynamicsView = "overview" | "candidates" | "relations" | "duties";

interface CharacterDynamicsSectionProps {
  novelId: string;
  selectedCharacter?: Character;
  selectedCharacterId: string;
  onSelectedCharacterChange: (id: string) => void;
}

function riskTone(risk: "none" | "info" | "warn" | "high"): string {
  switch (risk) {
    case "high":
      return "border-rose-300/70 bg-rose-50 text-rose-700";
    case "warn":
      return "border-amber-300/70 bg-amber-50 text-amber-700";
    case "info":
      return "border-sky-300/70 bg-sky-50 text-sky-700";
    default:
      return "border-border/70 bg-background text-muted-foreground";
  }
}

export default function CharacterDynamicsSection(props: CharacterDynamicsSectionProps) {
  const { novelId, selectedCharacter, selectedCharacterId, onSelectedCharacterChange } = props;
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<DynamicsView>("overview");
  const [manualState, setManualState] = useState({
    currentState: "",
    currentGoal: "",
    factionLabel: "",
    stanceLabel: "",
    summary: "",
  });

  useEffect(() => {
    setManualState({
      currentState: selectedCharacter?.currentState ?? "",
      currentGoal: selectedCharacter?.currentGoal ?? "",
      factionLabel: "",
      stanceLabel: "",
      summary: "",
    });
  }, [selectedCharacter?.id, selectedCharacter?.currentGoal, selectedCharacter?.currentState]);

  const overviewQuery = useQuery({
    queryKey: queryKeys.novels.characterDynamicsOverview(novelId),
    queryFn: () => getCharacterDynamicsOverview(novelId),
    enabled: Boolean(novelId),
  });

  const candidatesQuery = useQuery({
    queryKey: queryKeys.novels.characterCandidates(novelId),
    queryFn: () => getCharacterCandidates(novelId),
    enabled: Boolean(novelId),
  });

  const overview = overviewQuery.data?.data ?? null;
  const candidates = candidatesQuery.data?.data ?? [];
  const pendingCandidates = useMemo(
    () => candidates.filter((candidate) => candidate.status === "pending"),
    [candidates],
  );
  const assignmentsByCharacterId = useMemo(
    () => new Map((overview?.assignments ?? []).map((assignment) => [assignment.characterId, assignment])),
    [overview?.assignments],
  );
  const selectedOverviewCharacter = useMemo(
    () => overview?.characters.find((item) => item.characterId === selectedCharacterId) ?? null,
    [overview?.characters, selectedCharacterId],
  );

  const invalidateDynamics = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.novels.detail(novelId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.novels.characterRelations(novelId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.novels.characterDynamicsOverview(novelId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.novels.characterCandidates(novelId) }),
    ]);
  };

  const rebuildMutation = useMutation({
    mutationFn: () => rebuildCharacterDynamics(novelId),
    onSuccess: async () => {
      await invalidateDynamics();
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (candidateId: string) => confirmCharacterCandidate(novelId, candidateId),
    onSuccess: async (response) => {
      const characterId = response.data?.characterId ?? "";
      if (characterId) {
        onSelectedCharacterChange(characterId);
      }
      await invalidateDynamics();
    },
  });

  const mergeMutation = useMutation({
    mutationFn: (candidateId: string) => mergeCharacterCandidate(novelId, candidateId, {
      characterId: selectedCharacterId,
    }),
    onSuccess: async () => {
      await invalidateDynamics();
    },
  });

  const manualStateMutation = useMutation({
    mutationFn: () => {
      if (!selectedCharacterId) {
        throw new Error("Select a character first.");
      }
      return updateCharacterDynamicState(novelId, selectedCharacterId, {
        currentState: manualState.currentState.trim() || undefined,
        currentGoal: manualState.currentGoal.trim() || undefined,
        factionLabel: manualState.factionLabel.trim() || undefined,
        stanceLabel: manualState.stanceLabel.trim() || undefined,
        summary: manualState.summary.trim() || undefined,
        decisionNote: manualState.summary.trim() || undefined,
      });
    },
    onSuccess: async () => {
      await invalidateDynamics();
    },
  });

  return (
    <Card className="border-border/70">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <CardTitle>Character dynamics</CardTitle>
            <div className="text-sm text-muted-foreground">
              Track volume responsibilities, absence risks, new character candidates, and relationship stages here instead of keeping them manually.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{overview?.currentVolume?.title ?? "No current volume"}</Badge>
            <Badge variant="outline">{overview?.pendingCandidateCount ?? pendingCandidates.length} candidates to review</Badge>
            <AiButton
              variant="outline"
              size="sm"
              onClick={() => rebuildMutation.mutate()}
              disabled={rebuildMutation.isPending}
            >
              {rebuildMutation.isPending ? "Rebuilding..." : "Refresh character dynamics"}
            </AiButton>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["overview", "candidates", "relations", "duties"] as DynamicsView[]).map((view) => (
            <Button
              key={view}
              type="button"
              size="sm"
              variant={activeView === view ? "default" : "outline"}
              onClick={() => setActiveView(view)}
            >
              {{
                overview: "Overview",
                candidates: "New character candidates",
                relations: "Relationship stages",
                duties: "Volume responsibilities and absence risks",
              }[view]}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {overviewQuery.isLoading ? (
          <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
            Loading character dynamics...
          </div>
        ) : null}

        {activeView === "overview" && overview ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
              {overview.summary}
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              {overview.characters.map((item) => (
                <button
                  key={item.characterId}
                  type="button"
                  onClick={() => onSelectedCharacterChange(item.characterId)}
                  className="rounded-2xl border border-border/70 p-4 text-left transition hover:border-primary/40 hover:bg-muted/20"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.role}</div>
                    </div>
                    <Badge className={riskTone(item.absenceRisk)} variant="outline">
                      {item.absenceRisk === "none" ? "Stable" : `Risk: ${item.absenceRisk}`}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div>Volume responsibility: {item.volumeResponsibility ?? "Unassigned"}</div>
                    <div>Planned chapters: {item.plannedChapterOrders.join(", ") || "Not defined"}</div>
                    <div>Last appearance: {item.lastAppearanceChapterOrder ?? "None"} / Appearances: {item.appearanceCount}</div>
                    {item.factionLabel ? <div>Faction: {item.factionLabel}{item.stanceLabel ? ` | Stance: ${item.stanceLabel}` : ""}</div> : null}
                  </div>
                </button>
              ))}
            </div>

            {selectedCharacter ? (
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <div className="mb-3 text-sm font-medium">Manually update this character's current state</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    placeholder="Current state"
                    value={manualState.currentState}
                    onChange={(event) => setManualState((prev) => ({ ...prev, currentState: event.target.value }))}
                  />
                  <Input
                    placeholder="Current goal"
                    value={manualState.currentGoal}
                    onChange={(event) => setManualState((prev) => ({ ...prev, currentGoal: event.target.value }))}
                  />
                  <Input
                    placeholder="Faction / allegiance"
                    value={manualState.factionLabel}
                    onChange={(event) => setManualState((prev) => ({ ...prev, factionLabel: event.target.value }))}
                  />
                  <Input
                    placeholder="Stance"
                    value={manualState.stanceLabel}
                    onChange={(event) => setManualState((prev) => ({ ...prev, stanceLabel: event.target.value }))}
                  />
                </div>
                <textarea
                  className="mt-3 min-h-[88px] w-full rounded-xl border bg-background p-3 text-sm"
                  placeholder="Explain the reason for this change, its future impact, or anything the planner should keep in mind."
                  value={manualState.summary}
                  onChange={(event) => setManualState((prev) => ({ ...prev, summary: event.target.value }))}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    onClick={() => manualStateMutation.mutate()}
                    disabled={manualStateMutation.isPending || !selectedCharacterId}
                  >
                    {manualStateMutation.isPending ? "Saving..." : "Save character state"}
                  </Button>
                  {selectedOverviewCharacter?.volumeResponsibility ? (
                    <Badge variant="outline">Current volume responsibility: {selectedOverviewCharacter.volumeResponsibility}</Badge>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeView === "candidates" ? (
          pendingCandidates.length > 0 ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {pendingCandidates.map((candidate) => (
                <div key={candidate.id} className="rounded-2xl border border-border/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{candidate.proposedName}</div>
                      <div className="text-xs text-muted-foreground">
                        {candidate.proposedRole || "Role not specified"}{typeof candidate.sourceChapterOrder === "number" ? ` | From Chapter ${candidate.sourceChapterOrder}` : ""}
                      </div>
                    </div>
                    <Badge variant="outline">{typeof candidate.confidence === "number" ? `Confidence ${Math.round(candidate.confidence * 100)}%` : "Needs review"}</Badge>
                  </div>
                  {candidate.summary ? <div className="mt-3 text-sm text-muted-foreground">{candidate.summary}</div> : null}
                  {candidate.evidence.length > 0 ? (
                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                      {candidate.evidence.map((evidence, index) => (
                        <div key={`${candidate.id}-${index}`}>Evidence: {evidence}</div>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => confirmMutation.mutate(candidate.id)}
                      disabled={confirmMutation.isPending}
                    >
                      {confirmMutation.isPending ? "Confirming..." : "Add as new character"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => mergeMutation.mutate(candidate.id)}
                      disabled={mergeMutation.isPending || !selectedCharacterId}
                    >
                      {mergeMutation.isPending ? "Merging..." : selectedCharacterId ? "Merge into selected character" : "Select an existing character first"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
              No new character candidates to review. AI-detected characters will appear here after you draft a few chapters.
            </div>
          )
        ) : null}

        {activeView === "relations" ? (
          overview?.relations?.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {overview.relations.map((relation) => (
                <div key={relation.id} className="rounded-2xl border border-border/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{relation.sourceCharacterName}{" -> "}{relation.targetCharacterName}</div>
                    <Badge variant="outline">{relation.stageLabel}</Badge>
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">{relation.stageSummary}</div>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {relation.volumeTitle ? <div>Volume: {relation.volumeTitle}</div> : null}
                    {typeof relation.chapterOrder === "number" ? <div>Latest chapter: {relation.chapterOrder}</div> : null}
                    {relation.nextTurnPoint ? <div>Next stage trigger: {relation.nextTurnPoint}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
              No relationship stage data yet. It will appear after you apply a cast plan or complete chapters.
            </div>
          )
        ) : null}

        {activeView === "duties" ? (
          overview?.characters?.length ? (
            <div className="space-y-3">
              {overview.characters.map((item) => {
                const assignment = assignmentsByCharacterId.get(item.characterId);
                return (
                  <div key={item.characterId} className="rounded-2xl border border-border/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{assignment?.roleLabel || item.role}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {assignment?.isCore ? <Badge variant="secondary">Core to this volume</Badge> : null}
                        <Badge className={riskTone(item.absenceRisk)} variant="outline">
                          {item.absenceRisk === "none" ? "No absence risk" : `Absent for ${item.absenceSpan} chapters`}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                      <div>Responsibility: {assignment?.responsibility ?? "Unassigned"}</div>
                      <div>Expected appearances: {assignment?.appearanceExpectation ?? "Not defined"}</div>
                      <div>Planned chapters: {assignment?.plannedChapterOrders.join(", ") || "Not defined"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
              No character responsibility projections for this volume yet. Select “Refresh character dynamics” above to initialize them.
            </div>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
