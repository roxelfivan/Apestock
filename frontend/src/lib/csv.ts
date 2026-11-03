import type { BacktestResult } from "../types";

function rowsToCsv(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((key) => escape(row[key] ?? "")).join(","))].join("\n");
}

export function downloadCsv(filename: string, rows: Array<Record<string, string | number>>): void {
  const blob = new Blob([rowsToCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportBacktestCsv(result: BacktestResult): void {
  const ticker = result.ticker ?? "backtest";
  downloadCsv(
    `${ticker}-equity.csv`,
    result.equityCurve.map((point) => ({
      date: point.date,
      portfolioValue: point.portfolioValue,
      benchmarkValue: point.benchmarkValue,
    })),
  );
  if ((result.events ?? []).length > 0) {
    downloadCsv(
      `${ticker}-events.csv`,
      result.events.map((event) => ({
        date: event.date,
        side: event.side,
        reason: event.reason ?? "signal",
      })),
    );
  }
  if ((result.trades ?? []).length > 0) {
    downloadCsv(
      `${ticker}-trades.csv`,
      result.trades!.map((trade) => ({
        entryDate: trade.entryDate,
        exitDate: trade.exitDate,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        qty: trade.qty,
        pnl: trade.pnl,
        pnlPct: trade.pnlPct,
        holdDays: trade.holdDays,
        reason: trade.reason,
      })),
    );
  }
}
