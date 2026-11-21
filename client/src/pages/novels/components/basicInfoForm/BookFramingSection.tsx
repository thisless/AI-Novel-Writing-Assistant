import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { BASIC_INFO_FIELD_HINTS, type NovelBasicFormState } from "../../novelBasicInfo.shared";
import { FieldLabel } from "./BasicInfoFormPrimitives";

interface BookFramingSectionProps {
  basicForm: NovelBasicFormState;
  onFormChange: (patch: Partial<NovelBasicFormState>) => void;
  quickFill?: ReactNode;
}

export function BookFramingSection(props: BookFramingSectionProps) {
  const { basicForm, onFormChange, quickFill } = props;
  const controlClassName = "rounded-xl border-0 bg-background/85 ring-1 ring-border/50 transition-colors hover:bg-background focus-visible:ring-primary/30";

  return (
    <div className="space-y-5">
      <div className="flex min-h-16 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Audience and reasons to keep reading</h3>
          <div className="mt-1 text-sm leading-6 text-muted-foreground">
            No need for industry jargon. Describe who might enjoy the book, what they want to see, and what early payoffs they can expect.
          </div>
        </div>
        {quickFill ? <div className="shrink-0">{quickFill}</div> : null}
      </div>

      <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel htmlFor="basic-pen-name" hint={BASIC_INFO_FIELD_HINTS.penName}>
            Author name
          </FieldLabel>
          <Input
            id="basic-pen-name"
            className={controlClassName}
            value={basicForm.penName}
            placeholder="e.g., Night Walker of Mist Harbor. Leave blank to show only the book title on the cover."
            onChange={(event) => onFormChange({ penName: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="basic-target-audience" hint={BASIC_INFO_FIELD_HINTS.targetAudience}>
            Target audience
          </FieldLabel>
          <Input
            id="basic-target-audience"
            className={controlClassName}
            value={basicForm.targetAudience}
            placeholder="e.g., Readers who enjoy high-stakes urban comebacks, tense relationships, and compelling hooks"
            onChange={(event) => onFormChange({ targetAudience: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="basic-commercial-tags" hint={BASIC_INFO_FIELD_HINTS.commercialTagsText}>
            Key commercial tags
          </FieldLabel>
          <Input
            id="basic-commercial-tags"
            className={controlClassName}
            value={basicForm.commercialTagsText}
            placeholder="e.g., Comeback, high-stakes conflict, suspense, workplace intrigue"
            onChange={(event) => onFormChange({ commercialTagsText: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="basic-competing-feel" hint={BASIC_INFO_FIELD_HINTS.competingFeel}>
            Comparable style / familiar reading experience
          </FieldLabel>
          <Input
            id="basic-competing-feel"
            className={controlClassName}
            value={basicForm.competingFeel}
            placeholder="e.g., Workplace pressure grounded in reality, with dry humor and intense relationship dynamics"
            onChange={(event) => onFormChange({ competingFeel: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="basic-book-selling-point" hint={BASIC_INFO_FIELD_HINTS.bookSellingPoint}>
            Core selling point
          </FieldLabel>
          <textarea
            id="basic-book-selling-point"
            rows={3}
            className={`${controlClassName} min-h-[104px] w-full resize-y px-3 py-2.5 text-sm leading-6 outline-none`}
            value={basicForm.bookSellingPoint}
            placeholder="e.g., Each real-world problem the protagonist solves disrupts a wider web of relationships and interests, keeping readers eager for the next reversal."
            onChange={(event) => onFormChange({ bookSellingPoint: event.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="basic-first30-promise" hint={BASIC_INFO_FIELD_HINTS.first30ChapterPromise}>
          First 30-chapter promise
        </FieldLabel>
        <textarea
          id="basic-first30-promise"
          rows={4}
          className={`${controlClassName} min-h-[120px] w-full resize-y px-3 py-2.5 text-sm leading-6 outline-none`}
          value={basicForm.first30ChapterPromise}
          placeholder="e.g., The first 30 chapters should establish the protagonist's position, introduce the main rival, deliver the first major relationship reversal, and promise escalating stakes."
          onChange={(event) => onFormChange({ first30ChapterPromise: event.target.value })}
        />
      </div>
    </div>
  );
}
