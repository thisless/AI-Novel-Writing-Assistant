import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DIRECTOR_CREATE_LINK,
  MANUAL_CREATE_LINK,
  PRIMARY_CREATE_LABEL,
  REFERENCE_CREATE_LABEL,
  REFERENCE_CREATE_LINK,
  SHORT_STORY_CREATE_LINK,
} from "./novelListViewModel";

export function NovelListEmptyState(props: {
  hasAnyNovel: boolean;
}) {
  return (
    <section className="py-12 text-center">
      <h2 className="text-xl font-semibold tracking-normal">
        {props.hasAnyNovel ? "No novels match these filters" : "No novels yet"}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        {props.hasAnyNovel
          ? "Try changing the filters above or create a new novel."
          : "For your first novel, let Auto Director help plan its direction, characters, world, and chapters."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to={DIRECTOR_CREATE_LINK}>{PRIMARY_CREATE_LABEL}</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to={REFERENCE_CREATE_LINK}>{REFERENCE_CREATE_LABEL}</Link>
        </Button>
        {SHORT_STORY_CREATE_LINK ? (
          <Button asChild variant="outline">
            <Link to={SHORT_STORY_CREATE_LINK}>Write a short story</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link to={MANUAL_CREATE_LINK}>Create a novel manually</Link>
        </Button>
      </div>
    </section>
  );
}
