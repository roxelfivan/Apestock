import { STRATEGY_LABELS } from "../lib/defaults";
import { formatPct } from "../lib/format";
import type { SavedRun } from "../types";

interface RunHistoryProps {
  runs: SavedRun[];
  compareId: string | null;
  onCompare: (id: string | null) => void;
  onRestore: (run: SavedRun) => void;
}

export default function RunHistory({ runs, compareId, onCompare, onRestore }: RunHistoryProps) {
  if (runs.length === 0) return null;
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Local history</p>
      <h3 className="text-sm font-semibold text-white">Saved on this browser</h3>
      <ul className="mt-3 space-y-2">
        {runs.map((run) => (
          <li key={run.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 px-3 py-2 text-xs">
            <div>
              <p className="font-medium text-white">
                {run.config.ticker} · {STRATEGY_LABELS[run.config.strategy]}
              </p>
              <p className="text-slate-500">
                {formatPct(run.result.totalReturn)} · {run.config.timeframe} · {run.createdAt.slice(0, 16).replace("T", " ")}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onRestore(run)}
                className="rounded-lg border border-slate-700 px-2 py-1 text-slate-200"
              >
                Load
              </button>
              <button
                type="button"
                onClick={() => onCompare(compareId === run.id ? null : run.id)}
                className={`rounded-lg px-2 py-1 ${
                  compareId === run.id ? "bg-emerald-400 text-slate-950" : "border border-slate-700 text-slate-200"
                }`}
              >
                {compareId === run.id ? "Comparing" : "Compare"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
