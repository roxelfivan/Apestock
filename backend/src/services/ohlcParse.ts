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
