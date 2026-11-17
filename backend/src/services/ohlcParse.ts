import type { OhlcBar } from "../types.js";

function toDateString(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string" && value.length >= 10) {
    return value.slice(0, 10);
  }
  return null;
}

function toPositivePrice(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Yahoo often emits today's session with close/adjclose still null; Number(null) is 0. */
export function toOhlcBar(row: { date?: unknown; open?: unknown; high?: unknown; low?: unknown; close?: unknown }): OhlcBar | null {
  const date = toDateString(row.date);
  const open = toPositivePrice(row.open);
  const high = toPositivePrice(row.high);
  const low = toPositivePrice(row.low);
  const close = toPositivePrice(row.close);
  if (!date || open == null || high == null || low == null || close == null) {
    return null;
  }
  return { date, open, high, low, close };
}

export function isCompleteOhlc(bar: OhlcBar): boolean {
  return toOhlcBar(bar) !== null;
}

export function normalizeOhlcBars(bars: OhlcBar[]): { bars: OhlcBar[]; dropped: boolean } {
  const byDate = new Map<string, OhlcBar>();
  let dropped = false;
  for (const row of bars) {
    const bar = toOhlcBar(row);
    if (!bar) {
      dropped = true;
      continue;
    }
    if (bar.date !== row.date) dropped = true;
    byDate.set(bar.date, bar);
  }
  if (byDate.size !== bars.length) dropped = true;
  const next = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  return { bars: next, dropped };
}

export function rangeCovered(bars: OhlcBar[], startDate: string, endDate: string): boolean {
  if (bars.length === 0) return false;
  let first = bars[0]?.date;
  let last = bars[0]?.date;
  for (const bar of bars) {
    if (bar.date < first) first = bar.date;
    if (bar.date > last) last = bar.date;
  }
  return Boolean(first && last && first <= startDate && last >= endDate);
}
