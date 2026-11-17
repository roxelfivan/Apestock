import type { ReactNode } from "react";

export function markdownText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(markdownText).join("");
  if (typeof node === "object" && node !== null && "props" in node) {
    return markdownText((node as { props?: { children?: ReactNode } }).props?.children);
  }
  return "";
}

/** GitHub-compatible heading slug; keep in sync with scripts/check-docs.mjs. */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\- ]+/g, "")
    .replace(/\s+/g, "-");
}

export function makeSlugger() {
  const seen = new Map<string, number>();
  return (text: string): string => {
    const base = slugify(text) || "section";
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}-${n}`;
  };
}
