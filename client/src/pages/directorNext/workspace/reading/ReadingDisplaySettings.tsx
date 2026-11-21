import {useId} from "react";
import {Type} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {
  DEFAULT_READING_DISPLAY,
  READING_FONT_OPTIONS,
  READING_FONT_SIZE_MAX,
  READING_FONT_SIZE_MIN,
  normalizeReadingDisplayPreferences,
  readingTextStyle,
  type ReadingDisplayPreferences,
} from "./displayPreferences";

export function ReadingDisplaySettings({preferences, onChange, previewText}: {
  preferences: ReadingDisplayPreferences;
  onChange: (next: ReadingDisplayPreferences) => void;
  previewText?: string | null;
}) {
  const sizeId = useId();
  const fontId = useId();
  return <Dialog>
    <DialogTrigger asChild><Button variant="ghost" size="sm" className="shrink-0 gap-2"><Type className="h-4 w-4" aria-hidden="true"/>Reading display</Button></DialogTrigger>
    <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Reading display</DialogTitle>
        <DialogDescription>Adjust the text size and font. Changes apply to the manuscript and live preview.</DialogDescription>
      </DialogHeader>
      <div className="space-y-5 py-2">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <label htmlFor={sizeId} className="text-sm font-medium">Font size</label>
            <output htmlFor={sizeId} className="text-sm tabular-nums" aria-live="polite">{preferences.fontSize}px</output>
          </div>
          <input id={sizeId} type="range" min={READING_FONT_SIZE_MIN} max={READING_FONT_SIZE_MAX} step={1} value={preferences.fontSize}
            onChange={event => onChange({...preferences, fontSize: Number(event.target.value)})}
            className="h-6 w-full cursor-pointer accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"/>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>Small</span><span>Large</span></div>
        </div>
        <div>
          <label htmlFor={fontId} className="mb-2 block text-sm font-medium">Font</label>
          <Select value={preferences.font} onValueChange={font => onChange(normalizeReadingDisplayPreferences({...preferences, font}))}>
            <SelectTrigger id={fontId} className="shadow-none hover:shadow-none"><SelectValue/></SelectTrigger>
            <SelectContent>{READING_FONT_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}><span style={{fontFamily: option.family}}>{option.label}</span></SelectItem>)}</SelectContent>
          </Select>
        </div>
        <section aria-label="Reading preview" className="rounded-md bg-muted/40 px-4 py-3">
          <h3 className="mb-2 text-xs text-muted-foreground">Reading preview</h3>
          <p className="max-h-36 overflow-y-auto whitespace-pre-wrap break-words leading-[2.15] tracking-wide" style={readingTextStyle(preferences)}>
            {previewText?.trim().slice(0, 180) || "Morning light fell across the windowsill. He opened the book, and the story continued."}
          </p>
        </section>
        <p className="text-xs leading-5 text-muted-foreground">Your selection is saved in this browser and will be used across chapters and novels.</p>
      </div>
      <DialogFooter className="gap-2">
        <Button variant="ghost" onClick={() => onChange({...DEFAULT_READING_DISPLAY})} className="sm:mr-auto">Reset to default</Button>
        <DialogClose asChild><Button>Done</Button></DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
