import { cardClass, kickerClass } from "../ui";
import type { PriceCacheSummary as PriceCacheSummaryData } from "../types";

interface PriceCacheSummaryProps {
  ticker: string;
  summary: PriceCacheSummaryData | null;
  loading: boolean;
  feedLimited?: boolean;
}

function sourceLabel(source: PriceCacheSummaryData["source"]): string {
  if (!source) return "unknown";
  if (source === "yahoo") return "Yahoo";
  if (source === "stooq") return "Stooq";
  if (source === "coinbase") return "Coinbase";
  if (source === "binance") return "Binance";
  if (source === "kraken") return "Kraken";
  return source;
}

export default function PriceCacheSummary({ ticker, summary, loading, feedLimited }: PriceCacheSummaryProps) {
  const symbol = ticker.trim().toUpperCase() || "—";

  return (
    <section className={cardClass}>
      <p className={kickerClass}>Price database</p>
      <h3 className="mt-1 text-sm font-semibold text-white">{symbol}</h3>
      {loading && !summary ? (
        <p className="mt-2 text-xs text-slate-500">Checking cache…</p>
      ) : !summary || !summary.present ? (
        <p className="mt-2 text-xs text-slate-500">No cached bars for {symbol} yet.</p>
      ) : (
        <dl className="mt-3 space-y-1.5 text-xs text-slate-400">
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
            <dt className="text-slate-500">Path</dt>
            <dd className="break-all font-mono text-[11px] text-slate-300">{summary.path}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
            <dt className="text-slate-500">Layer</dt>
            <dd className="text-slate-300">{summary.layer === "blob" ? "Blob" : "Local"}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
            <dt className="text-slate-500">Range</dt>
            <dd className="text-slate-300">
              {summary.firstBar ?? "—"} → {summary.lastBar ?? "—"}
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
            <dt className="text-slate-500">Bars</dt>
            <dd className="text-slate-300">{summary.barCount.toLocaleString()}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
            <dt className="text-slate-500">Updated</dt>
            <dd className="text-slate-300">
              {summary.updatedAt ? summary.updatedAt.slice(0, 19).replace("T", " ") : "—"}
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
            <dt className="text-slate-500">Source</dt>
            <dd className="text-slate-300">{sourceLabel(summary.source)}</dd>
          </div>
        </dl>
      )}
      {feedLimited && summary?.present ? (
        <p className="mt-3 text-xs text-amber-200">
          Live feeds are limited. Run uses this stored range instead of waiting on Yahoo.
        </p>
      ) : null}
    </section>
  );
}
