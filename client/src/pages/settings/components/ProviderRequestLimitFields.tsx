import { Input } from "@/components/ui/input";

interface ProviderRequestLimitFieldsProps {
  concurrencyLimit: string;
  requestIntervalMs: string;
  onChange: (value: {
    concurrencyLimit?: string;
    requestIntervalMs?: string;
  }) => void;
}

export default function ProviderRequestLimitFields({
  concurrencyLimit,
  requestIntervalMs,
  onChange,
}: ProviderRequestLimitFieldsProps) {
  return (
    <div className="grid gap-3 rounded-md border bg-muted/20 p-3 sm:grid-cols-2">
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Maximum concurrent requests for the same model</div>
        <Input
          type="number"
          min={0}
          step={1}
          value={concurrencyLimit}
          placeholder="0"
          onChange={(event) => onChange({ concurrencyLimit: event.target.value })}
        />
        <div className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
          0 means unlimited. Requests to the same provider and model that exceed this limit are queued.
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Minimum interval between requests for the same model (ms)</div>
        <Input
          type="number"
          min={0}
          step={100}
          value={requestIntervalMs}
          placeholder="0"
          onChange={(event) => onChange({ requestIntervalMs: event.target.value })}
        />
        <div className="break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
          0 means unlimited. Use this to control how quickly consecutive requests are sent to the same provider and model.
        </div>
      </div>
    </div>
  );
}

export function ProviderRequestLimitSummary({
  concurrencyLimit,
  requestIntervalMs,
}: {
  concurrencyLimit: number;
  requestIntervalMs: number;
}) {
  return (
    <div className="mb-2 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
      Request limits: concurrency {concurrencyLimit || "Unlimited"} · interval {requestIntervalMs ? `${requestIntervalMs} ms` : "Unlimited"}
    </div>
  );
}
