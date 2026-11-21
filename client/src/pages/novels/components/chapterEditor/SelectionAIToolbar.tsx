import type { ChapterEditorOperation } from "@ai-novel/shared/types/novel";
import { Button } from "@/components/ui/button";
import { CHAPTER_EDITOR_OPERATION_LABELS } from "./document";

interface Props {
  visible: boolean;
  targetLabel: string;
  disabled?: boolean;
  onRunOperation: (operation: ChapterEditorOperation, instruction?: string) => void;
}
const OPERATIONS: ChapterEditorOperation[] = ["polish", "expand", "compress", "emotion", "conflict"];

export default function SelectionAIToolbar({ visible, targetLabel, disabled, onRunOperation }: Props) {
  if (!visible) return null;
  return <div role="toolbar" aria-label="AI selection edits" className="space-y-3"
    onMouseDown={event => { if ((event.target as HTMLElement).closest("button")) event.preventDefault(); }}>
    <p className="text-xs text-muted-foreground">{targetLabel} · Accepted candidates are inserted into the manuscript.</p>
    <div className="flex flex-wrap gap-2">{OPERATIONS.map(operation => <Button key={operation} size="sm"
      variant={operation === "polish" ? "default" : "outline"} disabled={disabled} onClick={() => onRunOperation(operation)}>
      {operation === "polish" ? "AI polish selection" : CHAPTER_EDITOR_OPERATION_LABELS[operation]}
    </Button>)}</div>
  </div>;
}
