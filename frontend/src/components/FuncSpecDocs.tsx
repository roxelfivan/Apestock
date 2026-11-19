import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { APP_VERSION } from "../version";
import {
  FUNC_SPEC_DEFAULT_PAGE,
  FUNC_SPEC_ORDER,
  FUNC_SPEC_PAGES,
  FUNC_SPEC_PAGES_BY_PART,
  FUNC_SPEC_PARTS,
  funcSpecPageIdFromHref,
  getFuncSpecPageContent,
  getFuncSpecPageMeta,
} from "../docs/funcSpecCatalog";
import { makeSlugger, markdownText } from "../docs/markdown";

interface Props {
  open: boolean;
  onClose: () => void;
  initialPage?: string;
}

export function FuncSpecDocs({ open, onClose, initialPage }: Props) {
  const [pageId, setPageId] = useState(initialPage ?? FUNC_SPEC_DEFAULT_PAGE);
  const [anchor, setAnchor] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setPageId(initialPage ?? FUNC_SPEC_DEFAULT_PAGE);
      setAnchor(null);
    }
  }, [open, initialPage]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!anchor) return;
    const frame = window.requestAnimationFrame(() => {
      const root = scrollerRef.current;
      if (!root) return;
      const target = root.querySelector(`#${CSS.escape(anchor)}`);
      if (target instanceof HTMLElement) target.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [anchor, pageId]);

  const content = useMemo(() => getFuncSpecPageContent(pageId), [pageId]);
  const meta = getFuncSpecPageMeta(pageId) ?? FUNC_SPEC_PAGES[0];
  const slugger = useMemo(() => makeSlugger(), [pageId]);

  const heading = useCallback(
    (Tag: "h1" | "h2" | "h3" | "h4") =>
      ({ children, ...rest }: { children?: ReactNode }) => {
        const id = slugger(markdownText(children));
        return (
          <Tag id={id} {...rest}>
            {children}
          </Tag>
        );
      },
    [slugger],
  );

  const markdownComponents = useMemo<Components>(
    () => ({
      h1: heading("h1"),
      h2: heading("h2"),
      h3: heading("h3"),
      h4: heading("h4"),
      a: ({ href, children, ...rest }) => {
        const target = href ? funcSpecPageIdFromHref(href) : null;
        if (target) {
          const hash = (href ?? "").split("#")[1] ?? "";
          return (
            <a
              {...rest}
              href={href}
              onClick={(event) => {
                event.preventDefault();
                setPageId(target);
                setAnchor(hash || null);
              }}
            >
              {children}
            </a>
          );
        }
        if (href?.startsWith("#")) {
          const hash = href.slice(1);
          return (
            <a
              {...rest}
              href={href}
              onClick={(event) => {
                event.preventDefault();
                setAnchor(hash || null);
              }}
            >
              {children}
            </a>
          );
        }
        return (
          <a {...rest} href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        );
      },
    }),
    [heading],
  );

  if (!open) return null;

  const order = FUNC_SPEC_ORDER[pageId] ?? 0;
  const prevPage = FUNC_SPEC_PAGES[order - 1];
  const nextPage = FUNC_SPEC_PAGES[order + 1];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950"
      role="dialog"
      aria-modal="true"
      aria-label="Apestock Functional Specification"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur sm:px-6">
        <img
          src="/app-icon.png"
          alt=""
          className="h-12 w-auto max-w-none shrink-0 object-contain"
          width={628}
          height={640}
        />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-lg font-semibold text-white">Functional Specification</p>
          <p className="truncate font-mono text-[10px] text-slate-400">
            Developer guide · v{APP_VERSION} · func_spec/
          </p>
        </div>
        <div className="flex-1" />
        <p className="hidden max-w-sm text-right text-xs text-slate-500 lg:block">
          Architecture and contracts. Same pages as{" "}
          <code className="font-mono text-[11px] text-slate-400">func_spec/</code>
        </p>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 text-xl leading-none text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          onClick={onClose}
          title="Close Functional Specification (Esc)"
          aria-label="Close Functional Specification"
        >
          ×
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav
          className="max-h-40 shrink-0 overflow-x-auto border-b border-slate-800 bg-slate-900/50 md:max-h-none md:w-72 md:overflow-y-auto md:border-b-0 md:border-r"
          aria-label="Functional Specification sections"
        >
          <ul className="flex gap-1 px-2 py-2 md:hidden">
            {FUNC_SPEC_PAGES.map((page) => {
              const active = page.id === pageId;
              return (
                <li key={page.id} className="shrink-0">
                  <button
                    type="button"
                    title={page.blurb}
                    aria-current={active ? "page" : undefined}
                    onClick={() => {
                      setPageId(page.id);
                      setAnchor(null);
                    }}
                    className={`w-full whitespace-nowrap border-b-2 px-3 py-2 text-left text-sm ${
                      active
                        ? "border-emerald-400 bg-slate-900 font-semibold text-emerald-300"
                        : "border-transparent text-slate-300"
                    }`}
                  >
                    {page.title}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="hidden p-2 md:block">
            {FUNC_SPEC_PARTS.map((part) => {
              const pages = FUNC_SPEC_PAGES_BY_PART[part.id] ?? [];
              return (
                <section key={part.id} className="mb-1">
                  <h2 className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {part.title}
                  </h2>
                  <ul>
                    {pages.map((page) => {
                      const active = page.id === pageId;
                      return (
                        <li key={page.id}>
                          <button
                            type="button"
                            title={page.blurb}
                            aria-current={active ? "page" : undefined}
                            onClick={() => {
                              setPageId(page.id);
                              setAnchor(null);
                            }}
                            className={`w-full border-l-2 px-3 py-1.5 text-left text-sm ${
                              active
                                ? "border-emerald-400 bg-slate-900 font-semibold text-emerald-300"
                                : "border-transparent text-slate-300 hover:bg-slate-900/70"
                            }`}
                          >
                            {page.title}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </nav>

        <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto">
          <article className="docs-article mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">{meta.title}</p>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content}
            </ReactMarkdown>
            <nav className="mt-10 flex items-stretch gap-2 border-t border-slate-800 pt-4" aria-label="Previous and next page">
              {prevPage ? (
                <button
                  type="button"
                  onClick={() => {
                    setPageId(prevPage.id);
                    setAnchor(null);
                  }}
                  className="min-w-0 flex-1 rounded-xl border border-slate-800 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-900"
                >
                  <span className="block text-[10px] uppercase tracking-wider text-slate-500">← Previous</span>
                  <span className="block truncate">{prevPage.title}</span>
                </button>
              ) : (
                <span className="flex-1" />
              )}
              {nextPage ? (
                <button
                  type="button"
                  onClick={() => {
                    setPageId(nextPage.id);
                    setAnchor(null);
                  }}
                  className="min-w-0 flex-1 rounded-xl border border-slate-800 px-3 py-2 text-right text-sm text-slate-200 hover:bg-slate-900"
                >
                  <span className="block text-[10px] uppercase tracking-wider text-slate-500">Next →</span>
                  <span className="block truncate">{nextPage.title}</span>
                </button>
              ) : (
                <span className="flex-1" />
              )}
            </nav>
          </article>
        </div>
      </div>
    </div>
  );
}

export function openFuncSpecDocs(page?: string): void {
  window.dispatchEvent(new CustomEvent("apestock:open-func-spec", { detail: page }));
}
