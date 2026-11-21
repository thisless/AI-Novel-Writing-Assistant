import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WritingFormulaBookStyleFlowProps {
  novelId: string;
  novelTitle?: string;
  onOpenAdvanced: () => void;
  onOpenCreate: () => void;
}

export default function WritingFormulaBookStyleFlow(props: WritingFormulaBookStyleFlowProps) {
  const {
    novelId,
    novelTitle,
    onOpenAdvanced,
    onOpenCreate,
  } = props;
  const novelRoute = novelId ? `/novels/${novelId}/edit` : "/novels";

  return (
    <Card className="border-slate-200/80 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <CardHeader>
        <CardTitle>Set a novel's default style in its basic information</CardTitle>
        <div className="text-sm leading-7 text-muted-foreground">
          Use the Style Engine to create, test, and manage style profiles. To choose a novel's default style, return to its basic information and confirm which style to use in later director and prose workflows.
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="space-y-4 rounded-2xl border bg-slate-50/70 p-4">
            <div className="text-sm font-medium text-slate-900">Where to go next</div>
            <div className="rounded-2xl border bg-white p-4 text-sm leading-7 text-slate-700">
              {novelId
                ? `The default style for ${novelTitle ? `“${novelTitle}”` : "this novel"} is set on its basic information page.`
                : "Open a novel's basic information page to choose its default style."}
            </div>
            <div className="rounded-2xl border bg-slate-950 p-4 text-white">
              <div className="text-sm font-medium">What each area does</div>
              <div className="mt-3 space-y-2 text-sm leading-7 text-slate-200">
                <div>Novel page: Choose a default style, request recommendations, compare options, and decide when to use it with Auto Director.</div>
                <div>Style Engine: Manage style profiles, generate samples, reduce AI-like writing, and edit rules.</div>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border bg-white p-4">
            <div className="text-sm font-medium text-slate-900">Next step</div>
            <div className="rounded-2xl border bg-slate-50/70 p-4 text-sm leading-7 text-slate-700">
              Choose this novel's default style on its novel page. If the library does not have a suitable style, return here to create or edit one.
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild type="button">
                <Link to={novelRoute}>Set default style on the novel page</Link>
              </Button>
              <Button type="button" variant="outline" onClick={onOpenAdvanced}>
                Edit current style
              </Button>
              <Button type="button" variant="outline" onClick={onOpenCreate}>
                Create a style profile
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
