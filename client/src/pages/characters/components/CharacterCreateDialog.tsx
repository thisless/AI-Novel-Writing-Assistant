import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listBookAnalyses } from "@/api/bookAnalysis";
import type { CharacterGenerateConstraints } from "@/api/character";
import { createBaseCharacter, generateBaseCharacter } from "@/api/character";
import { listKnowledgeDocuments } from "@/api/knowledge";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import SelectControl from "@/components/common/SelectControl";

function createDefaultConstraints(): CharacterGenerateConstraints {
  return {
    storyFunction: undefined,
    externalGoal: "",
    internalNeed: "",
    coreFear: "",
    moralBottomLine: "",
    secret: "",
    coreFlaw: "",
    relationshipHooks: "",
    growthStage: undefined,
    toneStyle: "",
  };
}

interface CharacterCreateDialogProps {
  onCreated?: () => void;
}

export function CharacterCreateDialog({ onCreated }: CharacterCreateDialogProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    role: "Protagonist",
    personality: "",
    background: "",
    development: "",
    category: "主角",
  });
  const [aiDescription, setAIDescription] = useState("");
  const [constraints, setConstraints] = useState<CharacterGenerateConstraints>(createDefaultConstraints());
  const [selectedKnowledgeDocumentIds, setSelectedKnowledgeDocumentIds] = useState<string[]>([]);
  const [selectedBookAnalysisIds, setSelectedBookAnalysisIds] = useState<string[]>([]);

  const knowledgeDocumentsQuery = useQuery({
    queryKey: queryKeys.knowledge.documents("character-generator"),
    queryFn: () => listKnowledgeDocuments({ status: "enabled" }),
  });
  const bookAnalysesQuery = useQuery({
    queryKey: queryKeys.bookAnalysis.list("character-generator-succeeded"),
    queryFn: () => listBookAnalyses({ status: "succeeded" }),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createBaseCharacter({
        ...form,
        tags: "",
        appearance: "",
        weaknesses: "",
        interests: "",
        keyEvents: "",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.baseCharacters.all });
      onCreated?.();
      setIsOpen(false);
    },
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      generateBaseCharacter({
        description: aiDescription,
        category: constraints.storyFunction ?? form.category,
        knowledgeDocumentIds: selectedKnowledgeDocumentIds.length > 0 ? selectedKnowledgeDocumentIds : undefined,
        bookAnalysisIds: selectedBookAnalysisIds.length > 0 ? selectedBookAnalysisIds : undefined,
        constraints: Object.values(constraints).some(Boolean) ? constraints : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.baseCharacters.all });
      onCreated?.();
      setAIDescription("");
      setIsOpen(false);
    },
  });

  const knowledgeDocuments = knowledgeDocumentsQuery.data?.data ?? [];
  const bookAnalyses = bookAnalysesQuery.data?.data ?? [];

  const toggleId = (ids: string[], id: string, checked: boolean) =>
    checked ? (ids.includes(id) ? ids : [...ids, id]) : ids.filter((item) => item !== id);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Create Character</Button>
      </DialogTrigger>
      <DialogContent className="w-[96vw] max-h-[90vh] max-w-[1400px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Character</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Character Manually</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 md:grid-cols-2">
              <input
                className="rounded-md border p-2 text-sm"
                placeholder="Character name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
              <input
                className="rounded-md border p-2 text-sm"
                placeholder="Role (protagonist / antagonist / supporting character)"
                value={form.role}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
              />
              <input
                className="rounded-md border p-2 text-sm"
                placeholder="Personality traits"
                value={form.personality}
                onChange={(event) => setForm((prev) => ({ ...prev, personality: event.target.value }))}
              />
              <input
                className="rounded-md border p-2 text-sm"
                placeholder="Background"
                value={form.background}
                onChange={(event) => setForm((prev) => ({ ...prev, background: event.target.value }))}
              />
              <input
                className="rounded-md border p-2 text-sm md:col-span-2"
                placeholder="Character arc"
                value={form.development}
                onChange={(event) => setForm((prev) => ({ ...prev, development: event.target.value }))}
              />
              <Button
                className="md:col-span-2"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !form.name.trim()}
              >
                {createMutation.isPending ? "Creating…" : "Create Character"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generate Character with AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                className="min-h-[120px] w-full rounded-md border p-2 text-sm"
                placeholder="Describe the character, e.g. a calm, rational young swordsman driven by a family vendetta"
                value={aiDescription}
                onChange={(event) => setAIDescription(event.target.value)}
              />

              <div className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">Advanced settings (optional)</div>
                  <Button size="sm" variant="outline" onClick={() => setConstraints(createDefaultConstraints())}>
                    Clear advanced settings
                  </Button>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <div className="text-xs text-muted-foreground">Story role</div>
                    <SelectControl
                      className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                      value={constraints.storyFunction ?? ""}
                      onChange={(event) =>
                        setConstraints((prev) => ({
                          ...prev,
                          storyFunction: (event.target.value || undefined) as CharacterGenerateConstraints["storyFunction"],
                        }))}
                    >
                      <option value="">Unspecified</option>
                      <option value="主角">Protagonist</option>
                      <option value="反派">Antagonist</option>
                      <option value="导师">Mentor</option>
                      <option value="对照组">Foil</option>
                      <option value="配角">Supporting character</option>
                    </SelectControl>
                  </label>

                  <label className="space-y-1 text-sm">
                    <div className="text-xs text-muted-foreground">Growth stage</div>
                    <SelectControl
                      className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                      value={constraints.growthStage ?? ""}
                      onChange={(event) =>
                        setConstraints((prev) => ({
                          ...prev,
                          growthStage: (event.target.value || undefined) as CharacterGenerateConstraints["growthStage"],
                        }))}
                    >
                      <option value="">Unspecified</option>
                      <option value="起点">Starting point</option>
                      <option value="受挫">Setback</option>
                      <option value="转折">Turning point</option>
                      <option value="觉醒">Awakening</option>
                      <option value="收束">Resolution</option>
                    </SelectControl>
                  </label>

                  <input
                    className="rounded-md border p-2 text-sm"
                    placeholder="External goal (what they want to achieve)"
                    value={constraints.externalGoal ?? ""}
                    onChange={(event) => setConstraints((prev) => ({ ...prev, externalGoal: event.target.value }))}
                  />
                  <input
                    className="rounded-md border p-2 text-sm"
                    placeholder="Internal need (what they truly desire)"
                    value={constraints.internalNeed ?? ""}
                    onChange={(event) => setConstraints((prev) => ({ ...prev, internalNeed: event.target.value }))}
                  />
                  <input
                    className="rounded-md border p-2 text-sm"
                    placeholder="Core fear"
                    value={constraints.coreFear ?? ""}
                    onChange={(event) => setConstraints((prev) => ({ ...prev, coreFear: event.target.value }))}
                  />
                  <input
                    className="rounded-md border p-2 text-sm"
                    placeholder="Moral boundaries"
                    value={constraints.moralBottomLine ?? ""}
                    onChange={(event) => setConstraints((prev) => ({ ...prev, moralBottomLine: event.target.value }))}
                  />
                  <input
                    className="rounded-md border p-2 text-sm"
                    placeholder="Secret"
                    value={constraints.secret ?? ""}
                    onChange={(event) => setConstraints((prev) => ({ ...prev, secret: event.target.value }))}
                  />
                  <input
                    className="rounded-md border p-2 text-sm"
                    placeholder="Core flaw"
                    value={constraints.coreFlaw ?? ""}
                    onChange={(event) => setConstraints((prev) => ({ ...prev, coreFlaw: event.target.value }))}
                  />
                  <input
                    className="rounded-md border p-2 text-sm md:col-span-2"
                    placeholder="Relationship hooks (conflicts or entanglements with others)"
                    value={constraints.relationshipHooks ?? ""}
                    onChange={(event) => setConstraints((prev) => ({ ...prev, relationshipHooks: event.target.value }))}
                  />
                  <input
                    className="rounded-md border p-2 text-sm md:col-span-2"
                    placeholder="Voice and tone (e.g. restrained and cool, or sharp and witty)"
                    value={constraints.toneStyle ?? ""}
                    onChange={(event) => setConstraints((prev) => ({ ...prev, toneStyle: event.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-sm font-medium">Reference knowledge (select any)</div>
                  <div className="max-h-48 space-y-2 overflow-auto rounded-md border p-2">
                    {knowledgeDocumentsQuery.isLoading ? (
                      <div className="text-sm text-muted-foreground">Loading…</div>
                    ) : null}
                    {!knowledgeDocumentsQuery.isLoading && knowledgeDocuments.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No knowledge documents available.</div>
                    ) : null}
                    {knowledgeDocuments.map((document) => (
                      <label key={document.id} className="flex items-start gap-2 rounded-md border p-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedKnowledgeDocumentIds.includes(document.id)}
                          onChange={(event) =>
                            setSelectedKnowledgeDocumentIds((prev) => toggleId(prev, document.id, event.target.checked))
                          }
                        />
                        <div className="min-w-0">
                          <div className="font-medium">{document.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {document.fileName} | v{document.activeVersionNumber}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">No knowledge content will be used unless selected.</div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium">Reference book analyses (select any)</div>
                  <div className="max-h-48 space-y-2 overflow-auto rounded-md border p-2">
                    {bookAnalysesQuery.isLoading ? (
                      <div className="text-sm text-muted-foreground">Loading…</div>
                    ) : null}
                    {!bookAnalysesQuery.isLoading && bookAnalyses.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No book analyses available.</div>
                    ) : null}
                    {bookAnalyses.map((analysis) => (
                      <label key={analysis.id} className="flex items-start gap-2 rounded-md border p-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedBookAnalysisIds.includes(analysis.id)}
                          onChange={(event) =>
                            setSelectedBookAnalysisIds((prev) => toggleId(prev, analysis.id, event.target.checked))
                          }
                        />
                        <div className="min-w-0">
                          <div className="font-medium">{analysis.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {analysis.documentTitle} | v{analysis.documentVersionNumber}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">Only completed book analyses are shown.</div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                Selected references: {selectedKnowledgeDocumentIds.length} knowledge documents, {selectedBookAnalysisIds.length} book analyses.
              </div>
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending || !aiDescription.trim()}
              >
                {generateMutation.isPending ? "Generating…" : "Generate and save"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
