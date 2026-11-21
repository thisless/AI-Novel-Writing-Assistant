import type { BasicTabProps } from "./NovelEditView.types";
import NovelBasicInfoForm from "./NovelBasicInfoForm";
import NovelStyleRecommendationCard from "./NovelStyleRecommendationCard";
import { BookFramingQuickFillButton } from "./basicInfoForm/BookFramingQuickFillButton";
import NovelCreateTitleQuickFill from "./titleWorkshop/NovelCreateTitleQuickFill";
import DirectorTakeoverEntryPanel from "./DirectorTakeoverEntryPanel";
import { NovelCoverCard } from "./cover/NovelCoverCard";
import { DetailDisclosure, SectionBlock } from "./workspaceShell";
import DirectorVersionControl from "@/components/directorVersion/DirectorVersionControl";

export default function BasicInfoTab(props: BasicTabProps) {
  return (
    <div className="space-y-5">
      <SectionBlock title="Director version" description="Choose the workflow for this book. Each version runs and resumes independently."><DirectorVersionControl novelId={props.novelId}/></SectionBlock>
      <DirectorTakeoverEntryPanel
        title="Let AI take over from the current project"
        description="If the basic details are ready, start AI takeover from a selected step and choose whether to continue existing progress or rerun that step."
        entry={props.directorTakeoverEntry}
      />
      <SectionBlock
        title="Book positioning"
        description="Define the intended audience, what will keep them reading, and what the opening must deliver. Future world-building, characters, and chapters will follow these promises."
      >
        <NovelBasicInfoForm
          basicForm={props.basicForm}
          genreOptions={props.genreOptions}
          storyModeOptions={props.storyModeOptions}
          worldOptions={props.worldOptions}
          sourceNovelOptions={props.sourceNovelOptions}
          sourceKnowledgeOptions={props.sourceKnowledgeOptions}
          sourceNovelBookAnalysisOptions={props.sourceNovelBookAnalysisOptions}
          isLoadingSourceNovelBookAnalyses={props.isLoadingSourceNovelBookAnalyses}
          availableBookAnalysisSections={props.availableBookAnalysisSections}
          onFormChange={props.onFormChange}
          onSubmit={props.onSave}
          isSubmitting={props.isSaving}
          submitLabel="Save basic details"
          titleQuickFill={(
            <NovelCreateTitleQuickFill
              basicForm={props.basicForm}
              onApplyTitle={(title) => props.onFormChange({ title })}
            />
          )}
          framingQuickFill={(
            <BookFramingQuickFillButton
              basicForm={props.basicForm}
              genreOptions={props.genreOptions}
              onApplySuggestion={props.onFormChange}
            />
          )}
          coverSection={(
            <NovelCoverCard
              novelId={props.novelId}
              basicForm={props.basicForm}
              genreOptions={props.genreOptions}
              storyModeOptions={props.storyModeOptions}
              worldOptions={props.worldOptions}
              worldSliceView={props.worldSliceView}
            />
          )}
          projectQuickStart={props.projectQuickStart}
        />
      </SectionBlock>

      <DetailDisclosure
        title="Style recommendations"
        description="Choose the narrative voice, prose density, and style references to keep future chapters consistent."
        meta="Style reference"
      >
        <NovelStyleRecommendationCard novelId={props.novelId} />
      </DetailDisclosure>

    </div>
  );
}
