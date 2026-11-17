/**
 * Functional Specification catalog.
 *
 * Content is loaded from `func_spec/*.md` the same way Help loads `docs/*.md`.
 * Pages are grouped into parts for the sidebar.
 */

export interface FuncSpecPartMeta {
  id: string;
  title: string;
  blurb: string;
}

export interface FuncSpecPageMeta {
  id: string;
  title: string;
  file: string;
  part: string;
  blurb: string;
}

export const FUNC_SPEC_PARTS: FuncSpecPartMeta[] = [
  {
    id: "orientation",
    title: "Part I — Orientation",
    blurb: "What the product is, how the system is put together, and the sequence of a run.",
  },
  {
    id: "behaviour",
    title: "Part II — Behaviour",
    blurb: "Fills, committee votes, prices, and ranked universes.",
  },
  {
    id: "reference",
    title: "Part III — Reference",
    blurb: "HTTP and UI contracts, testing, deploy, maintenance, types.",
  },
];

export const FUNC_SPEC_PAGES: FuncSpecPageMeta[] = [
  {
    id: "overview",
    title: "Product overview",
    file: "01-product-overview.md",
    part: "orientation",
    blurb: "Problem, users, capability list, non-goals, and the version table.",
  },
  {
    id: "architecture",
    title: "Architecture",
    file: "02-architecture.md",
    part: "orientation",
    blurb: "Workspaces, layers, deploy, and dependency direction.",
  },
  {
    id: "runtime-flows",
    title: "Runtime flows",
    file: "03-runtime-flows.md",
    part: "orientation",
    blurb: "Page load, Run, committee click, history load, research.",
  },
  {
    id: "engine",
    title: "Engine",
    file: "04-engine.md",
    part: "behaviour",
    blurb: "Signals, T+1 FIFO fills, sizing, zone votes, metrics.",
  },
  {
    id: "prices",
    title: "Prices & universe",
    file: "05-prices-and-universe.md",
    part: "behaviour",
    blurb: "Blob-first bars, download waterfall, ranked lists.",
  },
  {
    id: "contracts",
    title: "API & UI contracts",
    file: "06-api-and-ui.md",
    part: "reference",
    blurb: "HTTP, query string, localStorage, overlay events.",
  },
  {
    id: "testing",
    title: "Testing & deploy",
    file: "07-testing-and-deploy.md",
    part: "reference",
    blurb: "npm scripts, check:docs, Vercel, threat notes.",
  },
  {
    id: "maintenance",
    title: "Maintenance guide",
    file: "08-maintenance-guide.md",
    part: "reference",
    blurb: "Recipes, invariants, and the release checklist.",
  },
  {
    id: "glossary",
    title: "Data types & glossary",
    file: "09-glossary.md",
    part: "reference",
    blurb: "Payload fields and terms, including npm vs result version.",
  },
];

const rawByPath = import.meta.glob("../../../func_spec/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const contentByFile = new Map<string, string>();
for (const [path, content] of Object.entries(rawByPath)) {
  const file = path.split("/").pop();
  if (file) contentByFile.set(file, content);
}

export const FUNC_SPEC_PAGES_BY_PART: Record<string, FuncSpecPageMeta[]> = FUNC_SPEC_PARTS.reduce<
  Record<string, FuncSpecPageMeta[]>
>((acc, part) => {
  acc[part.id] = FUNC_SPEC_PAGES.filter((page) => page.part === part.id);
  return acc;
}, {});

export const FUNC_SPEC_ORDER: Record<string, number> = FUNC_SPEC_PAGES.reduce<Record<string, number>>(
  (acc, page, index) => {
    acc[page.id] = index;
    return acc;
  },
  {},
);

export const FUNC_SPEC_DEFAULT_PAGE = "overview";

export function getFuncSpecPageMeta(id: string): FuncSpecPageMeta | undefined {
  return FUNC_SPEC_PAGES.find((page) => page.id === id);
}

export function getFuncSpecPageContent(id: string): string {
  const meta = getFuncSpecPageMeta(id);
  if (!meta) return "_Page not found._";
  return contentByFile.get(meta.file) ?? `_Missing func_spec/${meta.file}._`;
}

export function funcSpecPageIdFromHref(href: string): string | null {
  const cleaned = href.replace(/^\.\//, "").split("#")[0]?.trim() ?? "";
  if (!cleaned) return null;
  const file = cleaned.endsWith(".md") ? cleaned : `${cleaned}.md`;
  const page = FUNC_SPEC_PAGES.find((item) => item.file === file);
  return page?.id ?? null;
}

export function isFuncSpecPageId(value: string): boolean {
  return FUNC_SPEC_PAGES.some((page) => page.id === value);
}
