export type MobilePrimaryNavKey = "home" | "novels" | "creation" | "tasks" | "more";

export interface MobileNavItem {
  key: string;
  label: string;
  to: string;
  group: MobilePrimaryNavKey;
}

export interface MobileNavGroup {
  title: string;
  items: MobileNavItem[];
}

export interface MobileRoutePattern {
  key: string;
  pattern: RegExp;
  title: string;
  group: MobilePrimaryNavKey;
}

export const MOBILE_ROUTE_PATTERNS: MobileRoutePattern[] = [
  { key: "home", pattern: /^\/$/, title: "Home", group: "home" },
  { key: "help", pattern: /^\/help\/?$/, title: "Writing guide", group: "more" },
  { key: "novels", pattern: /^\/novels\/?$/, title: "Novels", group: "novels" },
  { key: "novel-create", pattern: /^\/novels\/create\/?$/, title: "Create novel", group: "novels" },
  { key: "novel-preview", pattern: /^\/novels\/[^/]+\/preview\/?$/, title: "Novel preview", group: "novels" },
  { key: "novel-edit", pattern: /^\/novels\/[^/]+\/edit\/?$/, title: "Novel workspace", group: "novels" },
  { key: "chapter-edit", pattern: /^\/novels\/[^/]+\/chapters\/[^/]+\/?$/, title: "Chapter text", group: "novels" },
  { key: "drama", pattern: /^\/drama\/?$/, title: "Drama", group: "creation" },
  { key: "creative-hub", pattern: /^\/creative-hub\/?$/, title: "Creative Hub", group: "creation" },
  { key: "chat-legacy", pattern: /^\/chat-legacy\/?$/, title: "Legacy chat", group: "creation" },
  { key: "book-analysis", pattern: /^\/book-analysis\/?$/, title: "Book analysis", group: "creation" },
  { key: "market-radar", pattern: /^\/market-radar\/?$/, title: "Trending genres", group: "creation" },
  { key: "tasks", pattern: /^\/tasks\/?$/, title: "Tasks", group: "tasks" },
  { key: "auto-director-follow-ups", pattern: /^\/auto-director\/follow-ups\/?$/, title: "Director follow-ups", group: "tasks" },
  { key: "knowledge", pattern: /^\/knowledge\/?$/, title: "Knowledge base", group: "more" },
  { key: "genres", pattern: /^\/genres\/?$/, title: "Genre foundations", group: "more" },
  { key: "story-modes", pattern: /^\/story-modes\/?$/, title: "Story progression modes", group: "more" },
  { key: "titles", pattern: /^\/titles\/?$/, title: "Title workshop", group: "more" },
  { key: "prompt-workbench", pattern: /^\/prompt-workbench\/?$/, title: "Prompt management", group: "more" },
  { key: "settings-models", pattern: /^\/settings\/models\/?$/, title: "Models & providers", group: "more" },
  { key: "model-routes", pattern: /^\/settings\/model-routes\/?$/, title: "Model routing", group: "more" },
  { key: "settings-director", pattern: /^\/settings\/director\/?$/, title: "Auto Director settings", group: "more" },
  { key: "settings-knowledge", pattern: /^\/settings\/knowledge\/?$/, title: "Knowledge & writing style", group: "more" },
  { key: "settings-maintenance", pattern: /^\/settings\/maintenance\/?$/, title: "Desktop & maintenance", group: "more" },
  { key: "settings", pattern: /^\/settings\/?$/, title: "Settings", group: "more" },
  { key: "worlds", pattern: /^\/worlds\/?$/, title: "Worldbuilding library", group: "more" },
  { key: "world-generator", pattern: /^\/worlds\/generator\/?$/, title: "Create world sample", group: "more" },
  { key: "world-workspace", pattern: /^\/worlds\/[^/]+\/workspace\/?$/, title: "World guide", group: "more" },
  { key: "style-engine", pattern: /^\/style-engine\/?$/, title: "Writing style engine", group: "more" },
  { key: "anti-ai-rules", pattern: /^\/anti-ai-rules\/?$/, title: "Anti-AI rules", group: "more" },
  { key: "base-characters", pattern: /^\/base-characters\/?$/, title: "Character library", group: "more" },
];

const primaryNavItems: MobileNavItem[] = [
  { key: "home", label: "Home", to: "/", group: "home" },
  { key: "novels", label: "Novels", to: "/novels", group: "novels" },
  { key: "creation", label: "Create", to: "/creative-hub", group: "creation" },
  { key: "tasks", label: "Tasks", to: "/tasks", group: "more" },
  { key: "more", label: "More", to: "", group: "more" },
];

const moreNavGroups: MobileNavGroup[] = [
  {
    title: "Writing tools",
    items: [
      { key: "help", label: "Writing guide", to: "/help", group: "more" },
      { key: "drama", label: "Drama studio", to: "/drama", group: "creation" },
      { key: "book-analysis", label: "Book analysis", to: "/book-analysis", group: "creation" },
      { key: "market-radar", label: "Trending genres", to: "/market-radar", group: "creation" },
      { key: "chat-legacy", label: "Legacy chat", to: "/chat-legacy", group: "creation" },
    ],
  },
  {
    title: "Libraries",
    items: [
      { key: "knowledge", label: "Knowledge base", to: "/knowledge", group: "more" },
      { key: "genres", label: "Genre foundations", to: "/genres", group: "more" },
      { key: "story-modes", label: "Story progression modes", to: "/story-modes", group: "more" },
      { key: "titles", label: "Title workshop", to: "/titles", group: "more" },
      { key: "style-engine", label: "Writing style engine", to: "/style-engine", group: "more" },
      { key: "anti-ai-rules", label: "Anti-AI rules", to: "/anti-ai-rules", group: "more" },
      { key: "base-characters", label: "Character library", to: "/base-characters", group: "more" },
    ],
  },
  {
    title: "World & system",
    items: [
      { key: "tasks", label: "Activity", to: "/tasks", group: "more" },
      { key: "auto-director-follow-ups", label: "Director follow-ups", to: "/auto-director/follow-ups", group: "more" },
      { key: "worlds", label: "Worldbuilding library", to: "/worlds", group: "more" },
      { key: "world-generator", label: "Create world sample", to: "/worlds/generator", group: "more" },
      { key: "prompt-workbench", label: "Prompt management", to: "/prompt-workbench", group: "more" },
      { key: "settings", label: "Settings", to: "/settings", group: "more" },
    ],
  },
];

export function getMobilePrimaryNavItems(): MobileNavItem[] {
  return primaryNavItems;
}

export function getMobileMoreNavGroups(): MobileNavGroup[] {
  return moreNavGroups;
}

export function getMobileRoutePattern(pathname: string): MobileRoutePattern | undefined {
  return MOBILE_ROUTE_PATTERNS.find((route) => route.pattern.test(pathname));
}

export function getMobilePageTitle(pathname: string): string {
  return getMobileRoutePattern(pathname)?.title ?? "More";
}

export function getMobileNavGroupForPath(pathname: string): MobilePrimaryNavKey {
  return getMobileRoutePattern(pathname)?.group ?? "more";
}

export function getMobileRouteClassName(pathname: string): string {
  return `mobile-route-${getMobileRoutePattern(pathname)?.key ?? "more"}`;
}
