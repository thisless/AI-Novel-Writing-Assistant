import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BookAnalysis } from "@ai-novel/shared/types/bookAnalysis";
import { BookOpen, Check, GitBranch, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { listBookAnalyses } from "@/api/bookAnalysis";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { AppDialogContent, Dialog } from "@/components/ui/dialog";

export type ReferenceNovelCreateMode = "continuation" | "adaptation";

interface ReferenceNovelStartDialogProps {
  open: boolean;
  fixedAnalysis?: BookAnalysis | null;
  onOpenChange: (open: boolean) => void;
}

export default function ReferenceNovelStartDialog({
  open,
  fixedAnalysis,
  onOpenChange,
}: ReferenceNovelStartDialogProps) {
  const navigate = useNavigate();
  const [targetForm, setTargetForm] = useState<"long_novel" | "short_story">("long_novel");
  const [selectedAnalysisId, setSelectedAnalysisId] = useState(fixedAnalysis?.id ?? "");
  const analysesQuery = useQuery({
    queryKey: queryKeys.bookAnalysis.list("reference-novel-start-succeeded"),
    queryFn: () => listBookAnalyses({ status: "succeeded" }),
    enabled: open && !fixedAnalysis,
  });
  const analyses = useMemo(
    () => fixedAnalysis ? [fixedAnalysis] : (analysesQuery.data?.data ?? []),
    [analysesQuery.data?.data, fixedAnalysis],
  );
  const selectedAnalysis = analyses.find((analysis) => analysis.id === selectedAnalysisId) ?? analyses[0] ?? null;

  useEffect(() => {
    if (open && !analyses.some((analysis) => analysis.id === selectedAnalysisId)) {
      setSelectedAnalysisId(analyses[0]?.id ?? "");
    }
  }, [analyses, open, selectedAnalysisId]);

  const startCreation = (mode: ReferenceNovelCreateMode) => {
    if (!selectedAnalysis || (targetForm === "short_story" && mode === "continuation")) {
      return;
    }
    const params = new URLSearchParams({
      referenceMode: mode,
      bookAnalysisId: selectedAnalysis.id,
      sourceDocumentId: selectedAnalysis.documentId,
      referenceTitle: selectedAnalysis.documentTitle,
    });
    onOpenChange(false);
    if (targetForm === "short_story") params.set("form", "short_story");
    navigate(`${targetForm === "short_story" ? "/create" : "/novels/auto-director"}?${params.toString()}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent
        className="max-w-3xl"
        title="Use a novel as a reference"
        description="Choose a reference novel and writing approach. The system will include analysis findings and style guidance."
      >
        {!fixedAnalysis ? (
          <section>
            <div className="text-sm font-medium text-foreground">Choose a reference novel</div>
            {analysesQuery.isLoading ? (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted/45 px-4 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading available novels…
              </div>
            ) : analyses.length > 0 ? (
              <div className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-xl bg-muted/35 p-2" role="radiogroup" aria-label="Reference novels">
                {analyses.map((analysis) => {
                  const selected = analysis.id === selectedAnalysis?.id;
                  return (
                    <button
                      key={analysis.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`flex w-full items-start justify-between gap-3 rounded-lg px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "bg-background text-foreground ring-1 ring-border" : "text-muted-foreground hover:bg-background/65"}`}
                      onClick={() => setSelectedAnalysisId(analysis.id)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-foreground">{analysis.documentTitle}</span>
                        <span className="mt-1 block truncate text-xs">{analysis.title}</span>
                      </span>
                      {selected ? <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3 rounded-xl bg-muted/45 px-4 py-5 text-sm text-muted-foreground">
                <p>No analyzed reference novels are available yet.</p>
                <Button type="button" variant="ghost" className="mt-2 h-auto p-0 text-primary hover:bg-transparent" onClick={() => navigate("/book-analysis")}>Import and analyze a reference novel</Button>
              </div>
            )}
          </section>
        ) : (
          <div className="rounded-xl bg-muted/40 px-4 py-3">
            <div className="text-xs text-muted-foreground">Reference novel</div>
            <div className="mt-1 font-medium text-foreground">{fixedAnalysis.documentTitle}</div>
          </div>
        )}

        <section className="mt-5" aria-label="Work length">
          <div className="text-sm font-medium">Choose a work length</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant={targetForm === "long_novel" ? "default" : "outline"} aria-pressed={targetForm === "long_novel"} onClick={() => setTargetForm("long_novel")}>Novel</Button>
            <Button type="button" variant={targetForm === "short_story" ? "default" : "outline"} aria-pressed={targetForm === "short_story"} onClick={() => setTargetForm("short_story")}>Short story · 3,000–30,000 words</Button>
          </div>
        </section>
        <section className="mt-5">
          <div className="text-sm font-medium text-foreground">Choose a writing approach</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className="rounded-xl bg-muted/55 p-5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!selectedAnalysis || targetForm === "short_story"}
              onClick={() => startCreation("continuation")}
            >
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              <div className="mt-4 font-semibold text-foreground">Continue the source story</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{targetForm === "short_story" ? "Choose a novel to continue the source story. Short stories can use the source as inspiration for a new story." : "Keep the characters, world rules, timeline, and unresolved threads, and continue from the source story's ending."}</p>
            </button>
            <button
              type="button"
              className="rounded-xl bg-muted/55 p-5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!selectedAnalysis}
              onClick={() => startCreation("adaptation")}
            >
              <GitBranch className="h-5 w-5" aria-hidden="true" />
              <div className="mt-4 font-semibold text-foreground">{targetForm === "short_story" ? "Create a new short story from a reference" : "Create a new novel from a reference"}</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Use the source's structure, pacing, and style as a reference, then create new characters, a new world, and a new plot.</p>
            </button>
          </div>
        </section>
      </AppDialogContent>
    </Dialog>
  );
}
