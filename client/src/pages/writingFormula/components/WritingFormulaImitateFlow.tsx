import type { StyleExtractionDraft } from "@ai-novel/shared/types/styleEngine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WritingFormulaImitateFlowProps {
  form: {
    name: string;
    category: string;
    sourceText: string;
  };
  draft: StyleExtractionDraft | null;
  selectedPresetKey: "imitate" | "balanced" | "transfer";
  extractPending: boolean;
  createPending: boolean;
  onFormChange: (patch: Partial<WritingFormulaImitateFlowProps["form"]>) => void;
  onExtract: () => void;
  onPresetChange: (value: "imitate" | "balanced" | "transfer") => void;
  onCreate: () => void;
}

export default function WritingFormulaImitateFlow(props: WritingFormulaImitateFlowProps) {
  const {
    form,
    draft,
    selectedPresetKey,
    extractPending,
    createPending,
    onFormChange,
    onExtract,
    onPresetChange,
    onCreate,
  } = props;

  return (
    <Card className="border-slate-200/80 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <CardHeader>
        <CardTitle>Learn a writing style</CardTitle>
        <div className="text-sm leading-7 text-muted-foreground">
          Provide a clear reference passage. The system will analyze it into actionable style rules, then you can choose to imitate it closely, preserve its structure, or transfer only reusable elements.
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
          <section className="space-y-3 rounded-2xl border bg-slate-50/70 p-4">
            <div className="text-sm font-medium text-slate-900">1. Enter reference text</div>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="rounded-md border bg-white p-2 text-sm"
                placeholder="Style name, for example: Cool, realistic dialogue"
                value={form.name}
                onChange={(event) => onFormChange({ name: event.target.value })}
              />
              <input
                className="rounded-md border bg-white p-2 text-sm"
                placeholder="Category (optional)"
                value={form.category}
                onChange={(event) => onFormChange({ category: event.target.value })}
              />
            </div>
            <textarea
              className="min-h-[280px] w-full rounded-xl border bg-white p-3 text-sm leading-7"
              placeholder="Paste the text you want to learn from. Include at least one complete scene so the system can identify narrative distance, dialogue, and sentence rhythm."
              value={form.sourceText}
              onChange={(event) => onFormChange({ sourceText: event.target.value })}
            />
            <div className="flex justify-end">
              <Button type="button" onClick={onExtract} disabled={!form.name.trim() || !form.sourceText.trim() || extractPending}>
                {extractPending ? "Extracting features..." : "2. Extract features"}
              </Button>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border bg-white p-4">
            <div className="text-sm font-medium text-slate-900">2. Choose how closely to follow the style</div>
            {draft ? (
              <>
                <div className="rounded-xl border bg-slate-50/70 p-3 text-sm leading-7 text-slate-600">
                  {draft.summary}
                </div>
                <div className="grid gap-3">
                  {draft.presets.map((preset) => {
                    const active = preset.key === selectedPresetKey;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        className={`rounded-2xl border px-4 py-4 text-left transition ${active ? "border-slate-950 bg-slate-950 text-white shadow-lg" : "border-slate-200 bg-white hover:border-slate-400"}`}
                        onClick={() => onPresetChange(preset.key)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-base font-semibold">{preset.label}</div>
                          {active ? <Badge variant="secondary" className="bg-white/10 text-white">Current choice</Badge> : null}
                        </div>
                        <div className={`mt-2 text-sm leading-7 ${active ? "text-slate-200" : "text-slate-600"}`}>
                          {preset.summary}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-xl border bg-amber-50/80 p-3 text-xs leading-6 text-amber-900">
                  `imitate` is best for close imitation, `balanced` suits most projects, and `transfer` works well for an entire novel while avoiding high fingerprint risk.
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-sm leading-7 text-muted-foreground">
                Extract features first to see the three retention strategies and their effect on the reading experience.
              </div>
            )}
          </section>
        </div>

        <section className="rounded-2xl border bg-white p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-900">3. Preview the style profile</div>
              <div className="mt-1 text-xs leading-6 text-muted-foreground">
                After saving, the profile editor will open so you can adjust rules, bind a target, or generate a sample.
              </div>
            </div>
            <Button type="button" onClick={onCreate} disabled={!draft || createPending}>
              {createPending ? "Saving style..." : "4. Save style profile"}
            </Button>
          </div>
          {draft ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {draft.features.slice(0, 6).map((feature) => (
                <div key={feature.id} className="rounded-xl border bg-slate-50/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-slate-900">{feature.label}</div>
                    <Badge variant="outline">{feature.group}</Badge>
                  </div>
                  <div className="mt-2 text-xs leading-6 text-slate-600">{feature.description}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              No features to preview yet. Extract features first, then choose how to save the profile.
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
