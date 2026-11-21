interface WorldInjectionHintProps {
  worldInjectionSummary: string | null;
}

export default function WorldInjectionHint({ worldInjectionSummary }: WorldInjectionHintProps) {
  if (!worldInjectionSummary) {
    return (
      <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        No world information is available for this novel. Generation will proceed using the novel's basic details.
      </div>
    );
  }

  return (
    <details className="group rounded-md bg-muted/40 px-3 py-2 text-xs">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium">
        <span>World information used for this generation</span>
        <span className="text-muted-foreground group-open:hidden">Show details</span>
        <span className="hidden text-muted-foreground group-open:inline">Hide details</span>
      </summary>
      <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap border-t pt-3 text-muted-foreground">
        {worldInjectionSummary}
      </pre>
    </details>
  );
}
