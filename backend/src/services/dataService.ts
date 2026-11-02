import YahooFinance from "yahoo-finance2";
import type { AssetType, OhlcBar } from "../types.js";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

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

export class DataError extends Error {
  status = 400;

  constructor(message: string) {
    super(message);
    this.name = "DataError";
  }
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
