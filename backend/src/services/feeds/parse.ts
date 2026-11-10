import type { OhlcBar } from "../../types.js";

function toDateString(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string" && value.length >= 10) {
    return value.slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString().slice(0, 10);
  }
  return null;
}

function toPositivePrice(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function toOhlcBar(row: {
  date?: unknown;
  open?: unknown;
  high?: unknown;
  low?: unknown;
  close?: unknown;
}): OhlcBar | null {
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

export function finalizeBars(bars: OhlcBar[], startDate: string, endDate: string): OhlcBar[] {
  const unique: OhlcBar[] = [];
  const seen = new Set<string>();
  for (const bar of bars) {
    if (bar.date < startDate || bar.date > endDate) continue;
    if (seen.has(bar.date)) continue;
    seen.add(bar.date);
    unique.push(bar);
  }
  unique.sort((a, b) => a.date.localeCompare(b.date));
  return unique;
}

export function rangeCovered(bars: OhlcBar[], startDate: string, endDate: string): boolean {
  if (bars.length === 0) return false;
  const first = bars[0]?.date;
  const last = bars[bars.length - 1]?.date;
  return Boolean(first && last && first <= startDate && last >= endDate);
}

export function yahooCryptoToBinance(symbol: string): string | null {
  const match = /^([A-Z]{2,10})-USD$/.exec(symbol.trim().toUpperCase());
  if (!match) return null;
  const base = match[1];
  if (base === "USDT" || base === "USDC" || base === "BUSD") return null;
  return `${base}USDT`;
}

export function stooqSymbol(symbol: string): string {
  return `${symbol.trim().toLowerCase()}.us`;
}

export function parseStooqCsv(text: string, startDate: string, endDate: string): OhlcBar[] {
  const trimmed = text.trim();
  if (!trimmed || /^no data/i.test(trimmed) || /exceeded the daily hits limit/i.test(trimmed)) {
    return [];
  }
  const lines = trimmed.split(/\r?\n/);
  const bars: OhlcBar[] = [];
  for (const line of lines.slice(1)) {
    const [date, open, high, low, close] = line.split(",");
    const bar = toOhlcBar({ date, open, high, low, close });
    if (bar) bars.push(bar);
  }
  return finalizeBars(bars, startDate, endDate);
}

export function parseBinanceKlines(rows: unknown, startDate: string, endDate: string): OhlcBar[] {
  if (!Array.isArray(rows)) return [];
  const bars: OhlcBar[] = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 5) continue;
    const bar = toOhlcBar({
      date: row[0],
      open: row[1],
      high: row[2],
      low: row[3],
      close: row[4],
    });
    if (bar) bars.push(bar);
  }
  return finalizeBars(bars, startDate, endDate);
}

export function parseTiingoPrices(rows: unknown, startDate: string, endDate: string): OhlcBar[] {
  if (!Array.isArray(rows)) return [];
  const bars: OhlcBar[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const item = row as { date?: unknown; open?: unknown; high?: unknown; low?: unknown; close?: unknown };
    const bar = toOhlcBar(item);
    if (bar) bars.push(bar);
  }
  return finalizeBars(bars, startDate, endDate);
}
