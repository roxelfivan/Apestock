import YahooFinance from "yahoo-finance2";
import type { AssetType, OhlcBar } from "../types.js";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

/** In-process cache only: reuse Yahoo bars for repeat backtests of the same window. */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 256;

interface CacheEntry {
  bars: OhlcBar[];
  expiresAt: number;
}

const priceCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<OhlcBar[]>>();

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

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

function cacheKey(symbol: string, startDate: string, endDate: string): string {
  return `${symbol}|${startDate}|${endDate}|1d`;
}

function readCache(key: string): OhlcBar[] | null {
  const entry = priceCache.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    priceCache.delete(key);
    return null;
  }
  priceCache.delete(key);
  priceCache.set(key, entry);
  return cloneBars(entry.bars);
}

function writeCache(key: string, bars: OhlcBar[]): void {
  while (priceCache.size >= CACHE_MAX_ENTRIES) {
    const oldest = priceCache.keys().next().value;
    if (oldest === undefined) break;
    priceCache.delete(oldest);
  }
  priceCache.set(key, { bars: cloneBars(bars), expiresAt: Date.now() + CACHE_TTL_MS });
}

export class DataError extends Error {
  status = 400;

  constructor(message: string) {
    super(message);
    this.name = "DataError";
  }
}

async function downloadHistoricalData(symbol: string, startDate: string, endDate: string): Promise<OhlcBar[]> {
  let raw: unknown;
  try {
    raw = await yahooFinance.historical(symbol, {
      period1: startDate,
      period2: endDate,
      interval: "1d",
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown Yahoo Finance error";
    throw new DataError(`Unable to fetch historical data for ${symbol}: ${reason}`);
  }

  if (!Array.isArray(raw) || raw.length === 0) {
    throw new DataError(`No historical data returned for ${symbol}.`);
  }

  const bars = (raw as Array<{ date?: unknown; open?: unknown; high?: unknown; low?: unknown; close?: unknown }>)
    .map((row) => {
      const date = toDateString(row.date);
      const open = Number(row.open);
      const high = Number(row.high);
      const low = Number(row.low);
      const close = Number(row.close);
      if (
        !date ||
        !isFiniteNumber(open) ||
        !isFiniteNumber(high) ||
        !isFiniteNumber(low) ||
        !isFiniteNumber(close)
      ) {
        return null;
      }
      return { date, open, high, low, close } satisfies OhlcBar;
    })
    .filter((bar): bar is OhlcBar => bar !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  const unique: OhlcBar[] = [];
  const seen = new Set<string>();
  for (const bar of bars) {
    if (seen.has(bar.date)) continue;
    seen.add(bar.date);
    unique.push(bar);
  }

  if (unique.length === 0) {
    throw new DataError(`Data gap: no valid OHLC bars for ${symbol}.`);
  }

  return unique;
}

export async function fetchHistoricalData(
  ticker: string,
  _assetType: AssetType,
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

  const key = cacheKey(symbol, startDate, endDate);
  const cached = readCache(key);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return cloneBars(await pending);

  const request = downloadHistoricalData(symbol, startDate, endDate)
    .then((bars) => {
      writeCache(key, bars);
      return bars;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, request);
  return cloneBars(await request);
}
