import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import type { BookAnalysisSectionKey } from "@ai-novel/shared/types/bookAnalysis";
import type { BookFramingReferenceIntent } from "@ai-novel/shared/types/novelFraming";
import { formatCommercialTagsInput, type NovelBasicFormState } from "../../novelBasicInfo.shared";
import { suggestBookFraming } from "@/api/novelFraming";
import AiButton from "@/components/common/AiButton";
import { toast } from "@/components/ui/toast";
import { useLLMStore } from "@/store/llmStore";

interface GenreOption {
  id: string;
  label: string;
  path: string;
}

interface BookFramingQuickFillButtonProps {
  basicForm: NovelBasicFormState;
  genreOptions: GenreOption[];
  onApplySuggestion: (patch: Partial<NovelBasicFormState>) => void;
  descriptionOverride?: string;
}

function hasExistingFramingContent(basicForm: NovelBasicFormState): boolean {
  return Boolean(
    basicForm.targetAudience.trim()
    || basicForm.commercialTagsText.trim()
    || basicForm.competingFeel.trim()
    || basicForm.bookSellingPoint.trim()
    || basicForm.first30ChapterPromise.trim(),
  );
}

function resolveReferenceBinding(basicForm: NovelBasicFormState): {
  bookAnalysisId?: string;
  referenceIntent?: BookFramingReferenceIntent;
  bookAnalysisSections?: BookAnalysisSectionKey[];
} {
  if (basicForm.writingMode === "continuation" && basicForm.continuationBookAnalysisId.trim()) {
    return {
      bookAnalysisId: basicForm.continuationBookAnalysisId.trim(),
      referenceIntent: "continuation",
      bookAnalysisSections: basicForm.continuationBookAnalysisSections.length > 0
        ? basicForm.continuationBookAnalysisSections
        : undefined,
    };
  }
  if (basicForm.referenceBookAnalysisId.trim()) {
    return {
      bookAnalysisId: basicForm.referenceBookAnalysisId.trim(),
      referenceIntent: "adaptation",
      bookAnalysisSections: basicForm.referenceBookAnalysisSections.length > 0
        ? basicForm.referenceBookAnalysisSections
        : undefined,
    };
  }
  return {};
}

export function BookFramingQuickFillButton(props: BookFramingQuickFillButtonProps) {
  const { basicForm, genreOptions, onApplySuggestion, descriptionOverride } = props;
  const llm = useLLMStore();
  const effectiveDescription = basicForm.description.trim() || descriptionOverride?.trim() || "";
  const referenceBinding = useMemo(() => resolveReferenceBinding(basicForm), [basicForm]);
  const selectedGenreLabel = useMemo(
    () => genreOptions.find((item) => item.id === basicForm.genreId)?.path
      ?? genreOptions.find((item) => item.id === basicForm.genreId)?.label
      ?? "",
    [basicForm.genreId, genreOptions],
  );

  const suggestionMutation = useMutation({
    mutationFn: () => suggestBookFraming({
      title: basicForm.title.trim() || undefined,
      description: effectiveDescription || undefined,
      genreLabel: selectedGenreLabel || undefined,
      styleTone: basicForm.styleTone.trim() || undefined,
      bookAnalysisId: referenceBinding.bookAnalysisId,
      referenceIntent: referenceBinding.referenceIntent,
      bookAnalysisSections: referenceBinding.bookAnalysisSections,
      provider: llm.provider,
      model: llm.model,
      temperature: llm.temperature,
    }),
    onSuccess: (response) => {
      const suggestion = response.data;
      if (!suggestion) {
        toast.error("AI did not return usable audience and selling point suggestions.");
        return;
      }
      onApplySuggestion({
        targetAudience: suggestion.targetAudience,
        commercialTagsText: formatCommercialTagsInput(suggestion.commercialTags),
        competingFeel: suggestion.competingFeel,
        bookSellingPoint: suggestion.bookSellingPoint,
        first30ChapterPromise: suggestion.first30ChapterPromise,
      });
      toast.success(
        referenceBinding.bookAnalysisId
          ? "Filled in audience and selling point suggestions based on the analysis."
          : "Filled in audience and selling point suggestions based on the title and description.",
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to fill in audience and selling points. Try again later.");
    },
  });

  const handleGenerate = () => {
    if (!basicForm.title.trim() && !effectiveDescription && !referenceBinding.bookAnalysisId) {
      toast.error("Enter a title or a short description before asking AI to help.");
      return;
    }
    if (hasExistingFramingContent(basicForm)) {
      const confirmed = window.confirm("AI suggestions will replace the current audience and selling point details. Continue?");
      if (!confirmed) {
        return;
      }
    }
    suggestionMutation.mutate();
  };

  return (
    <AiButton
      type="button"
      variant="outline"
      size="sm"
      onClick={handleGenerate}
      disabled={suggestionMutation.isPending}
    >
      {suggestionMutation.isPending ? "Filling..." : "Fill with AI"}
    </AiButton>
  );
}
