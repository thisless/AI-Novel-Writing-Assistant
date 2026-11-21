import type { ShortStoryReferenceView } from "@ai-novel/shared/types/shortStoryReference";
import { Link } from "react-router-dom";

export function ShortStoryReferenceSummary({ reference, confirmed = true }: { reference: ShortStoryReferenceView; confirmed?: boolean }) {
  return (
    <section className="rounded-xl bg-muted/35 p-4 text-sm leading-6" aria-label="Short story reference">
      <div className="font-medium">Reference novel: <Link className="text-primary underline-offset-4 hover:underline" to={`/book-analysis/${reference.analysisId}`}>{reference.sourceTitle}</Link></div>
      <p className="mt-1 text-xs text-muted-foreground">Document version {reference.documentVersionNumber} · Draw on structure, pacing, and style to create a new story</p>
      <p className="mt-2">{reference.goal}</p>
      {reference.sourceState !== "available" ? <p className="mt-2 text-amber-700 dark:text-amber-400">
        {confirmed
          ? reference.sourceState === "updated" ? "The reference analysis has new content. This story uses the reference captured when you confirmed." : "The reference source is unavailable. This story retains the reference captured when you confirmed."
          : reference.sourceState === "updated" ? "The reference analysis has new content. Reload it and review the direction." : "The reference source is unavailable. Select an available reference novel."}
      </p> : null}
      <details className="mt-3 text-muted-foreground">
        <summary className="cursor-pointer">Review inspirations and originality constraints</summary>
        {[
          ["Structure", reference.structureLessons], ["Pacing", reference.pacingLessons],
          ["Style", reference.styleLessons], ["Ending", reference.endingLessons], ["Originality constraints", reference.originalityConstraints],
        ].map(([label, items]) => <div className="mt-3" key={String(label)}>
          <div className="font-medium text-foreground">{label}</div>
          <ul className="list-disc pl-5">{(items as string[]).map((item, index) => <li key={index}>{item}</li>)}</ul>
        </div>)}
        {reference.endingEvidence === "not_available" ? <p className="mt-2">The selected findings do not include evidence for a complete ending, so a new ending will be created.</p> : null}
      </details>
    </section>
  );
}
