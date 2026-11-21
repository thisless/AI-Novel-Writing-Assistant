import { Badge } from "@/components/ui/badge";

interface BookAnalysisDiagnosisTipBannerProps {
  documentTitle: string;
}

export default function BookAnalysisDiagnosisTipBanner({ documentTitle }: BookAnalysisDiagnosisTipBannerProps) {
  return (
    <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">Diagnostic mode</Badge>
        <span className="font-medium">{documentTitle}</span>
      </div>
      <div className="mt-2 leading-6 text-muted-foreground">
        Use the book-analysis framework to review your draft, focusing on clarity of pacing, characters, themes, foreshadowing, and commercial appeal. The findings are for revision guidance and won’t change your original manuscript.
      </div>
    </div>
  );
}
