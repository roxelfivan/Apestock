import { STRATEGY_LABELS } from "../lib/defaults";
import { formatPct } from "../lib/format";
import { btnSecondary } from "../ui";
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
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Local history</p>
      <h3 className="text-sm font-semibold text-white">Saved on this browser</h3>
      <ul className="mt-3 space-y-2">
        {runs.map((run) => (
          <li
            key={run.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-800 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium text-white">
                {run.config.ticker} · {STRATEGY_LABELS[run.config.strategy]}
              </p>
              <p className="text-xs text-slate-500">
                {formatPct(run.result.totalReturn)} · {run.config.timeframe} · {run.createdAt.slice(0, 16).replace("T", " ")}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => onRestore(run)} className={`${btnSecondary} min-w-20 px-3`}>
                Load
              </button>
              <button
                type="button"
                onClick={() => onCompare(compareId === run.id ? null : run.id)}
                aria-pressed={compareId === run.id}
                className={
                  compareId === run.id
                    ? "inline-flex min-h-11 min-w-24 items-center justify-center rounded-xl bg-emerald-400 px-3 text-sm font-medium text-slate-950"
                    : `${btnSecondary} min-w-24 px-3`
                }
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
