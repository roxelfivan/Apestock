import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { APP_VERSION } from "../version";
import {
  HELP_PAGES,
  getHelpPageContent,
  helpPageIdFromHref,
  isHelpPageId,
  type HelpPageId,
} from "../docs/catalog";

interface Props {
  open: boolean;
  onClose: () => void;
  initialPage?: HelpPageId;
}

export function HelpDocs({ open, onClose, initialPage = "home" }: Props) {
  const [pageId, setPageId] = useState<HelpPageId>(initialPage);

  useEffect(() => {
    if (open) setPageId(initialPage);
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

  const content = useMemo(() => getHelpPageContent(pageId), [pageId]);
  const meta = HELP_PAGES.find((page) => page.id === pageId) ?? HELP_PAGES[0];

  const markdownComponents = useMemo<Components>(
    () => ({
      a: ({ href, children, ...rest }) => {
        const target = href ? helpPageIdFromHref(href) : null;
        if (target) {
          return (
            <a
              {...rest}
              href={href}
              onClick={(event) => {
                event.preventDefault();
                setPageId(target);
              }}
            >
              {children}
            </a>
          );
        }
        if (href?.startsWith("#")) {
          return (
            <a {...rest} href={href}>
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
    [],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950"
      role="dialog"
      aria-modal="true"
      aria-label="Apestock help"
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur sm:px-6">
        <img src="/app-icon.png" alt="" className="h-9 w-auto rounded-lg" width={36} height={45} />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-lg font-semibold text-white">Apestock Help</p>
          <p className="font-mono text-[10px] text-slate-400">User guide · v{APP_VERSION}</p>
        </div>
        <div className="flex-1" />
        <p className="hidden max-w-xs text-right text-xs text-slate-500 sm:block">
          Same pages as <code className="font-mono text-[11px] text-slate-400">docs/</code>
        </p>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 text-xl leading-none text-slate-200 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          onClick={onClose}
          title="Close help (Esc)"
          aria-label="Close help"
        >
          ×
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav
          className="max-h-40 shrink-0 overflow-x-auto border-b border-slate-800 bg-slate-900/50 md:max-h-none md:w-56 md:overflow-y-auto md:border-b-0 md:border-r"
          aria-label="Help topics"
        >
          <ul className="flex gap-1 px-2 py-2 md:block md:px-0">
            {HELP_PAGES.map((page) => {
              const active = page.id === pageId;
              return (
                <li key={page.id} className="shrink-0 md:shrink">
                  <button
                    type="button"
                    className={`w-full whitespace-nowrap border-b-2 px-3 py-2 text-left text-sm transition md:whitespace-normal md:border-b-0 md:border-l-2 md:px-4 ${
                      active
                        ? "border-emerald-400 bg-slate-900 font-semibold text-emerald-300"
                        : "border-transparent text-slate-300 hover:bg-slate-900/80"
                    }`}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setPageId(page.id)}
                  >
                    {page.title}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <article className="docs-article mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">{meta.title}</p>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content}
            </ReactMarkdown>
          </article>
        </main>
      </div>
    </div>
  );
}

export function openHelpDocs(page?: HelpPageId): void {
  const detail = page && isHelpPageId(page) ? page : "home";
  window.dispatchEvent(new CustomEvent("apestock:open-help", { detail }));
}
