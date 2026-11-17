/**
 * Help / user-guide catalog.
 *
 * Content is loaded from the repo's `docs/*.md` files via Vite's
 * `import.meta.glob(..., { query: '?raw' })` so the in-app Help pages
 * stay in sync with the markdown user guide.
 */

export type HelpPageId =
  | "home"
  | "whats-new"
  | "getting-started"
  | "workspace"
  | "setup"
  | "strategies"
  | "results"
  | "committee"
  | "research"
  | "history"
  | "troubleshooting";

export interface HelpPageMeta {
  id: HelpPageId;
  title: string;
  file: string;
}

/** Sidebar order — mirrors docs/README.md "Start here". */
export const HELP_PAGES: HelpPageMeta[] = [
  { id: "home", title: "User guide", file: "README.md" },
  { id: "whats-new", title: "What's new", file: "whats-new.md" },
  { id: "getting-started", title: "Getting started", file: "getting-started.md" },
  { id: "workspace", title: "Workspace", file: "workspace.md" },
  { id: "setup", title: "Setup", file: "setup.md" },
  { id: "strategies", title: "Strategies", file: "strategies.md" },
  { id: "results", title: "Results", file: "results.md" },
  { id: "committee", title: "Committee", file: "committee.md" },
  { id: "research", title: "Research", file: "research.md" },
  { id: "history", title: "History", file: "history.md" },
  { id: "troubleshooting", title: "Troubleshooting", file: "troubleshooting.md" },
];

const rawByPath = import.meta.glob("../../../docs/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const contentByFile = new Map<string, string>();
for (const [path, content] of Object.entries(rawByPath)) {
  const file = path.split("/").pop();
  if (file) contentByFile.set(file, content);
}

export function getHelpPageContent(id: HelpPageId): string {
  const meta = HELP_PAGES.find((page) => page.id === id);
  if (!meta) return "_Page not found._";
  return contentByFile.get(meta.file) ?? `_Missing docs/${meta.file}._`;
}

export function helpPageIdFromHref(href: string): HelpPageId | null {
  const cleaned = href.replace(/^\.\//, "").split("#")[0]?.trim() ?? "";
  if (!cleaned) return null;
  const file = cleaned.endsWith(".md") ? cleaned : `${cleaned}.md`;
  const page = HELP_PAGES.find((item) => item.file === file);
  return page?.id ?? null;
}

export function isHelpPageId(value: string): value is HelpPageId {
  return HELP_PAGES.some((page) => page.id === value);
}
