import type { OutlineDocument } from "@ai-novel/shared/types/outline";

export type OutlineNode = OutlineDocument["story"]
  | OutlineDocument["volumes"][number]
  | OutlineDocument["chapters"][number]
  | OutlineDocument["characters"][number]
  | OutlineDocument["payoffs"][number]
  | OutlineDocument["facts"][number];

export const outlineFieldLabels: Record<string, string> = {
  title: "Title",
  name: "Name",
  premise: "Story premise",
  synopsis: "Synopsis",
  theme: "Theme",
  tone: "Tone",
  endingDirection: "Ending direction",
  targetAudience: "Target audience",
  genre: "Genre",
  notes: "Writing notes",
  summary: "Summary",
  promise: "Core promise",
  pressure: "Main pressure",
  protagonistChange: "Protagonist's change",
  climax: "Climax",
  endingHook: "Ending hook",
  purpose: "Chapter purpose",
  conflict: "Main conflict",
  emotionalBeat: "Emotional and informational progression",
  role: "Identity and story role",
  goal: "Goal",
  motivation: "Motivation",
  secret: "Secret",
  arcDirection: "Character arc",
  content: "Content",
  kind: "Type",
  setupDescription: "Foreshadowing setup",
  payoffDescription: "Payoff description",
  category: "Category",
  scope: "Scope",
  immutable: "Immutable",
  planningDepth: "Planning depth",
  volumeNodeId: "Volume",
  parent: "Parent node",
  order: "Order",
  chapterNodeIds: "Included chapters",
  chapterRefs: "Chapter references",
  characterNodeIds: "Related characters",
  payoffNodeIds: "Related foreshadowing",
  appearanceNodeIds: "Planned appearances",
  setupChapterNodeIds: "Planned setup chapters",
  payoffChapterNodeIds: "Planned payoff chapters",
  relatedNodeIds: "Related nodes",
};

export function getOutlineNodes(document: OutlineDocument): OutlineNode[] {
  return [
    document.story,
    ...document.volumes,
    ...document.chapters,
    ...document.characters,
    ...document.payoffs,
    ...document.facts,
  ];
}

export function getOutlineNodeTitle(node: OutlineNode | null | undefined): string {
  if (!node) return "Untitled node";
  return ("title" in node ? node.title : node.name) || "Untitled node";
}

export function findOutlineNode(document: OutlineDocument, nodeId: string): OutlineNode | undefined {
  return getOutlineNodes(document).find(node => node.nodeId === nodeId);
}

export function findOutlineNodeTitle(document: OutlineDocument, nodeId: string): string {
  const node = findOutlineNode(document, nodeId);
  return node ? getOutlineNodeTitle(node) : "(Deleted node)";
}

/** Resolve references against the version being displayed, never the current draft. */
export function formatOutlineValue(value: unknown, field = "", document?: OutlineDocument, titles: Record<string, string> = {}): string {
  if (value === undefined || value === null || value === "") return "Not set";
  if (Array.isArray(value)) {
    if (!value.length) return "Not set";
    return value.map(item => formatOutlineValue(item, field, document, titles)).join(", ");
  }
  if (typeof value === "string") {
    if (/NodeIds?$/.test(field)) return titles[value] ?? (document ? findOutlineNodeTitle(document, value) : "(Deleted node)");
    const labels: Record<string, string> = { rough: "High-level outline", detailed: "Detailed outline", story: "Entire story", volume: "Volume", chapter: "Chapter", character: "Character", payoff: "Foreshadowing", fact: "Fixed fact", other: "Other", hook: "Hook", foreshadowing: "Foreshadowing", promise: "Promise", mystery: "Mystery" };
    return ["planningDepth", "kind", "category", "type"].includes(field) ? labels[value] ?? value : value;
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return Object.entries(value as Record<string, unknown>).map(([key, item]) => `${outlineFieldLabels[key] ?? (key === "type" ? "Type" : key === "nodeId" ? "Node" : key)}: ${formatOutlineValue(item, key === "nodeId" ? "relatedNodeIds" : key, document, titles)}`).join("; ");
  return String(value);
}

/** Only known schema terms / proposal IDs are translated; prose stays untouched. */
export function localizeOutlineText(text: string, operationTitles: Record<string, string> = {}): string {
  let result = text.replace(/\bimmutable\s*=\s*(true|false)\b/g, (_, value: string) => value === "true" ? "Immutable setting" : "Editable setting");
  for (const [id, title] of Object.entries(operationTitles).sort((a, b) => b[0].length - a[0].length)) {
    result = result.replaceAll(id, title);
  }
  return result.replace(/\b[A-Za-z][A-Za-z0-9]*\b/g, word => outlineFieldLabels[word] ?? word)
    .replace(/\bop-[A-Za-z0-9_-]+\b/g, "related change");
}
