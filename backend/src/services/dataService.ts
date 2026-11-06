import { DataError, sanitizeUserError } from "../errors.js";
import { addUtcDays, latestCompleteSession } from "../lib/dates.js";
import type { AssetType, OhlcBar } from "../types.js";
import { mergeBars, readStoredPrices, writeStoredPrices } from "./priceStore.js";
import { yahooFinance } from "./yahooClient.js";

const inflight = new Map<string, Promise<OhlcBar[]>>();

function toDateString(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string" && value.length >= 10) {
    return value.slice(0, 10);
  }
  return null;
}

function cloneBars(bars: OhlcBar[]): OhlcBar[] {
  return bars.map((bar) => ({ ...bar }));
}

function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}

function isPositivePrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** Yahoo often emits today's session with close/adjclose still null; Number(null) is 0. */
export function toOhlcBar(row: { date?: unknown; open?: unknown; high?: unknown; low?: unknown; close?: unknown }): OhlcBar | null {
  const date = toDateString(row.date);
  if (!date || !isPositivePrice(row.open) || !isPositivePrice(row.high) || !isPositivePrice(row.low) || !isPositivePrice(row.close)) {
    return null;
  }
  return { date, open: row.open, high: row.high, low: row.low, close: row.close };
}

export function isCompleteOhlc(bar: OhlcBar): boolean {
  return toOhlcBar(bar) !== null;
}

async function downloadHistoricalData(symbol: string, startDate: string, endDate: string): Promise<OhlcBar[]> {
  if (startDate > endDate) return [];

  let quotes: Array<{ date?: unknown; open?: unknown; high?: unknown; low?: unknown; close?: unknown }>;
  try {
    const result = await yahooFinance.chart(symbol, {
      period1: startDate,
      period2: addUtcDays(endDate, 1),
      interval: "1d",
      return: "array",
    });
    quotes = result.quotes ?? [];
  } catch (error) {
    const reason = sanitizeUserError(error, "Unknown Yahoo Finance error");
    throw new DataError(`Unable to fetch historical data for ${symbol}: ${reason}`);
  }

  const bars = quotes
    .map(toOhlcBar)
    .filter((bar): bar is OhlcBar => bar !== null)
    .filter((bar) => bar.date >= startDate && bar.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  const unique: OhlcBar[] = [];
  const seen = new Set<string>();
  for (const bar of bars) {
    if (seen.has(bar.date)) continue;
    seen.add(bar.date);
    unique.push(bar);
  }
  return unique;
}

function sliceBars(bars: OhlcBar[], startDate: string, endDate: string): OhlcBar[] {
  return bars.filter((bar) => bar.date >= startDate && bar.date <= endDate);
}

async function loadCoveredBars(
  symbol: string,
  assetType: AssetType,
  startDate: string,
  endDate: string,
): Promise<OhlcBar[]> {
  const stored = await readStoredPrices(symbol);
  const storedBars = stored?.bars ?? [];
  let bars = storedBars.filter(isCompleteOhlc);
  const droppedIncomplete = bars.length !== storedBars.length;
  const first = bars[0]?.date;
  const last = bars[bars.length - 1]?.date;
  const downloads: Array<Promise<OhlcBar[]>> = [];

  if (bars.length === 0) {
    downloads.push(downloadHistoricalData(symbol, startDate, endDate));
  } else {
    if (first && first > startDate) {
      downloads.push(downloadHistoricalData(symbol, startDate, addUtcDays(first, -1)));
    }
    if (last && last < endDate) {
      downloads.push(downloadHistoricalData(symbol, last, endDate));
    }
  }

  if (downloads.length > 0) {
    const fetched = await Promise.all(downloads);
    const next = mergeBars(bars, ...fetched);
    if (next.length === 0) {
      throw new DataError(`No historical data returned for ${symbol}.`);
    }
    bars = next;
    await writeStoredPrices({
      symbol,
      assetType,
      bars,
      updatedAt: new Date().toISOString(),
    });
  } else if (droppedIncomplete && bars.length > 0) {
    await writeStoredPrices({
      symbol,
      assetType,
      bars,
      updatedAt: new Date().toISOString(),
    });
  }

  const window = sliceBars(bars, startDate, endDate);
  if (window.length === 0) {
    throw new DataError(`Data gap: no valid OHLC bars for ${symbol}.`);
  }
  return window;
}

export async function fetchHistoricalData(
  ticker: string,
  assetType: AssetType,
  startDate: string,
  endDate: string,
): Promise<OhlcBar[]> {
  if (!ticker || typeof ticker !== "string") {
    throw new DataError("Missing ticker.");
  }

  const symbol = ticker.trim().toUpperCase();
  if (!symbol) {
    throw new DataError("Missing ticker.");
  }

  const targetEnd = minDate(endDate, latestCompleteSession(assetType));
  const targetStart = startDate > targetEnd ? targetEnd : startDate;
  const key = `${symbol}|${targetStart}|${targetEnd}|1d`;

  const pending = inflight.get(key);
  if (pending) return cloneBars(await pending);

  const request = loadCoveredBars(symbol, assetType, targetStart, targetEnd).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, request);
  return cloneBars(await request);
}

const WARM_HISTORY_DAYS = 365 * 5 + 250;

export interface PriceSyncResult {
  ticker: string;
  assetType: AssetType;
  lastBar: string | null;
  completeThrough: string;
  downloaded: boolean;
  barCount: number;
}

export async function syncSymbolPrices(ticker: string, assetType: AssetType): Promise<PriceSyncResult> {
  const symbol = ticker.trim().toUpperCase();
  const completeThrough = latestCompleteSession(assetType);
  const before = await readStoredPrices(symbol);
  const start = addUtcDays(completeThrough, -WARM_HISTORY_DAYS);
  const bars = await fetchHistoricalData(symbol, assetType, start, completeThrough);
  const after = await readStoredPrices(symbol);
  const lastBar = bars[bars.length - 1]?.date ?? null;
  const downloaded = !before || (before.bars.at(-1)?.date ?? "") < (after?.bars.at(-1)?.date ?? "");
  return {
    ticker: symbol,
    assetType,
    lastBar,
    completeThrough,
    downloaded,
    barCount: bars.length,
  };
}

export function priceWindowEnd(assetType: AssetType, requestedEnd: string): string {
  return minDate(requestedEnd, latestCompleteSession(assetType));
}
