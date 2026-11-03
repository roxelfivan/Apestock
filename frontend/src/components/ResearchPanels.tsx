import { formatPct } from "../lib/format";
import type { SweepResult, WalkForwardResult } from "../types";

interface ResearchPanelsProps {
  sweep: SweepResult | null;
  walkForward: WalkForwardResult | null;
  busy: boolean;
  onSweep: () => void;
  onWalkForward: () => void;
}

function paramLabel(params: SweepResult["results"][number]["params"]): string {
  return Object.entries(params)
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${key}=${value}`)
    .join(" · ");
}

export default function ResearchPanels({
  sweep,
  walkForward,
  busy,
  onSweep,
  onWalkForward,
}: ResearchPanelsProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Research</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Sweep and walk-forward</h2>
        <p className="mt-1 text-xs text-slate-500">
          These reuse the current ticker, costs, and window. Best cells are hypotheses.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onSweep}
          className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-100 disabled:text-slate-500"
        >
          {busy ? "Working…" : "Parameter sweep"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onWalkForward}
          className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-100 disabled:text-slate-500"
        >
          Walk-forward
        </button>
      </div>

      {sweep ? (
        <div>
          <p className="text-xs text-amber-300">{sweep.warning}</p>
          <div className="mt-2 overflow-auto">
            <table className="min-w-full text-left text-[11px] text-slate-300">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-1 pr-3">Params</th>
                  <th className="py-1 pr-3">Return</th>
                  <th className="py-1 pr-3">Sharpe</th>
                  <th className="py-1 pr-3">CAGR</th>
                  <th className="py-1">DD</th>
                </tr>
              </thead>
              <tbody>
                {[...sweep.results]
                  .sort((a, b) => b.sharpe - a.sharpe)
                  .map((cell) => (
                    <tr key={paramLabel(cell.params)} className="border-t border-slate-800">
                      <td className="py-1 pr-3">{paramLabel(cell.params)}</td>
                      <td className="py-1 pr-3">{formatPct(cell.totalReturn)}</td>
                      <td className="py-1 pr-3">{cell.sharpe.toFixed(2)}</td>
                      <td className="py-1 pr-3">{formatPct(cell.cagr)}</td>
                      <td className="py-1">{formatPct(cell.maxDrawdown)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {walkForward ? (
        <div>
          <p className="text-xs text-amber-300">{walkForward.warning}</p>
          <ul className="mt-2 space-y-1 text-[11px] text-slate-300">
            {walkForward.folds.map((fold) => (
              <li key={fold.fold}>
                Fold {fold.fold}: IS Sharpe {fold.inSampleSharpe.toFixed(2)} → OOS {formatPct(fold.outOfSampleReturn)} /
                Sharpe {fold.outOfSampleSharpe.toFixed(2)} ({fold.startDate}–{fold.endDate})
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
