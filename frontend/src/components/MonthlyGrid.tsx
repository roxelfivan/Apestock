import { formatPct } from "../lib/format";
import type { BacktestResult } from "../types";

export default function MonthlyGrid({ result }: { result: BacktestResult }) {
  const rows = result.metrics?.monthlyReturns ?? [];
  if (rows.length === 0) return null;
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Calendar</p>
      <h3 className="text-sm font-semibold text-white">Monthly returns</h3>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {rows.map((row) => (
          <div key={row.month} className="rounded-lg border border-slate-800 px-2 py-1.5">
            <p className="text-[10px] text-slate-500">{row.month}</p>
            <p className={`text-xs font-semibold ${row.returnPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {formatPct(row.returnPct)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
