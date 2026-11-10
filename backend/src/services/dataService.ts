import { DataError, sanitizeUserError } from "../errors.js";
import { addUtcDays, latestCompleteSession } from "../lib/dates.js";
import type { AssetType, OhlcBar } from "../types.js";
import { type PriceProviderName, providersFor } from "./feeds/index.js";
import { rangeCovered, toOhlcBar } from "./feeds/parse.js";
import { mergeBars, readStoredPrices, writeStoredPrices } from "./priceStore.js";

export { rangeCovered, toOhlcBar } from "./feeds/parse.js";

const inflight = new Map<string, Promise<OhlcBar[]>>();

function cloneBars(bars: OhlcBar[]): OhlcBar[] {
  return bars.map((bar) => ({ ...bar }));
}

function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}

export function isCompleteOhlc(bar: OhlcBar): boolean {
  return toOhlcBar(bar) !== null;
}

export async function downloadHistoricalData(
  symbol: string,
  assetType: AssetType,
  startDate: string,
  endDate: string,
): Promise<{ bars: OhlcBar[]; source: PriceProviderName }> {
  if (startDate > endDate) return { bars: [], source: "yahoo" };

  const errors: string[] = [];
  for (const provider of providersFor(assetType)) {
    try {
      const bars = await provider.fetch(symbol, startDate, endDate);
      if (bars.length > 0) {
        return { bars, source: provider.name };
      }
    } catch (error) {
      errors.push(`${provider.name}: ${sanitizeUserError(error, "request failed")}`);
    }
  }

  const detail = errors.length ? ` (${errors.join("; ")})` : "";
  throw new DataError(`Unable to fetch historical data for ${symbol}.${detail}`);
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
  let source = stored?.source;

  if (!rangeCovered(bars, startDate, endDate)) {
    const first = bars[0]?.date;
    const last = bars[bars.length - 1]?.date;
    const downloads: Array<Promise<{ bars: OhlcBar[]; source: PriceProviderName }>> = [];

    if (bars.length === 0) {
      downloads.push(downloadHistoricalData(symbol, assetType, startDate, endDate));
    } else {
      if (first && first > startDate) {
        downloads.push(downloadHistoricalData(symbol, assetType, startDate, addUtcDays(first, -1)));
      }
      if (last && last < endDate) {
        downloads.push(downloadHistoricalData(symbol, assetType, last, endDate));
      }
    }

    if (downloads.length > 0) {
      const fetched = await Promise.all(downloads);
      const next = mergeBars(bars, ...fetched.map((item) => item.bars));
      if (next.length === 0) {
        throw new DataError(`No historical data returned for ${symbol}.`);
      }
      bars = next;
      source = fetched[fetched.length - 1]?.source ?? source;
      await writeStoredPrices({
        symbol,
        assetType,
        bars,
        updatedAt: new Date().toISOString(),
        source,
      });
    } else if (droppedIncomplete && bars.length > 0) {
      await writeStoredPrices({
        symbol,
        assetType,
        bars,
        updatedAt: new Date().toISOString(),
        source,
      });
    }
  } else if (droppedIncomplete && bars.length > 0) {
    await writeStoredPrices({
      symbol,
      assetType,
      bars,
      updatedAt: new Date().toISOString(),
      source,
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
  source?: PriceProviderName;
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
    source: after?.source,
  };
}

export function priceWindowEnd(assetType: AssetType, requestedEnd: string): string {
  return minDate(requestedEnd, latestCompleteSession(assetType));
}
