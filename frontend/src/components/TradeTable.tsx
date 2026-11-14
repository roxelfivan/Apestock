import { formatMoney, formatPct } from "../lib/format";
import type { BacktestResult } from "../types";

export default function TradeTable({ result }: { result: BacktestResult }) {
  const trades = result.trades ?? [];
  if (trades.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-400">
        No closed trades in this window.
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Blotter</p>
          <h3 className="text-sm font-semibold text-white">Closed trades</h3>
        </div>
        <p className="max-w-full text-xs text-slate-500">EOD marks the last close, not a T+1 signal fill</p>
      </div>
      <ul className="space-y-2 px-4 pb-4 md:hidden">
        {trades.map((trade, index) => (
          <li
            key={`${trade.entryDate}-${trade.exitDate}-${index}`}
            className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-white">
                {trade.entryDate} → {trade.exitDate}
              </p>
              <p className={`shrink-0 font-semibold ${trade.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {formatMoney(trade.pnl, 2)}
              </p>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {trade.qty} @ {formatMoney(trade.entryPrice, 2)} → {formatMoney(trade.exitPrice, 2)} · {formatPct(trade.pnlPct)} ·{" "}
              {trade.holdDays}d · {trade.reason === "eod" ? "EOD" : "Signal"}
            </p>
          </li>
        ))}
      </ul>
      <div className="hidden max-h-72 overflow-x-auto overflow-y-auto md:block">
        <table className="min-w-full text-left text-xs text-slate-300">
          <thead className="sticky top-0 bg-slate-900 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Entry</th>
              <th className="px-3 py-2">Exit</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">In</th>
              <th className="px-3 py-2">Out</th>
              <th className="px-3 py-2">PnL</th>
              <th className="px-3 py-2">Hold</th>
              <th className="px-3 py-2">Why</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade, index) => (
              <tr key={`${trade.entryDate}-${trade.exitDate}-${index}`} className="border-t border-slate-800">
                <td className="px-3 py-2">{trade.entryDate}</td>
                <td className="px-3 py-2">{trade.exitDate}</td>
                <td className="px-3 py-2">{trade.qty}</td>
                <td className="px-3 py-2">{formatMoney(trade.entryPrice, 2)}</td>
                <td className="px-3 py-2">{formatMoney(trade.exitPrice, 2)}</td>
                <td className={`px-3 py-2 ${trade.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {formatMoney(trade.pnl, 2)} ({formatPct(trade.pnlPct)})
                </td>
                <td className="px-3 py-2">{trade.holdDays}d</td>
                <td className="px-3 py-2">{trade.reason === "eod" ? "EOD" : "Signal"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
