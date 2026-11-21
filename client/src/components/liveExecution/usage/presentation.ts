export function formatCacheTokens(value: number | null | undefined, phase: string, status?: string): string {
    if (status === "invalid")
        return "Usage unavailable";
    if (status === "reported" && typeof value === "number" && Number.isSafeInteger(value) && value >= 0)
        return value.toLocaleString();
    if (!["completed", "failed", "cancelled"].includes(phase))
        return "Calculating...";
    return status === undefined ? "Not recorded" : "Not provided";
}
