import { DataError, ValidationError } from "../errors.js";
import { addUtcDays, latestCompleteSession } from "../lib/dates.js";
import type { AssetType, OhlcBar } from "../types.js";
import { isCompleteOhlc, toOhlcBar } from "./ohlcParse.js";
import { downloadDailyBars, type PriceSource } from "./priceProviders.js";
import {
  barsHaveNewDates,
  firstCoveringLayer,
  mergeBars,
  mergeIntoPriceDatabase,
  readBlobPrices,
  readLocalPrices,
  readMemoryPrices,
  readStoredPrices,
  writeStoredPrices,
  type StoredPrices,
} from "./priceStore.js";

const inflight = new Map<string, Promise<OhlcBar[]>>();

function cloneBars(bars: OhlcBar[]): OhlcBar[] {
  return bars.map((bar) => ({ ...bar }));
}

function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}

function sliceBars(bars: OhlcBar[], startDate: string, endDate: string): OhlcBar[] {
  return bars.filter((bar) => bar.date >= startDate && bar.date <= endDate);
}

function completeStored(stored: StoredPrices | null): { stored: StoredPrices | null; dropped: boolean } {
  if (!stored) return { stored: null, dropped: false };
  const bars = stored.bars.filter(isCompleteOhlc);
  if (bars.length === stored.bars.length) return { stored, dropped: false };
  return { stored: { ...stored, bars }, dropped: true };
}

async function loadCoveredBars(
  symbol: string,
  assetType: AssetType,
  startDate: string,
  endDate: string,
): Promise<OhlcBar[]> {
  const blobLayer = completeStored(await readBlobPrices(symbol));
  const fromBlob = blobLayer.stored;
  let droppedIncomplete = blobLayer.dropped;
  let picked = firstCoveringLayer([{ origin: "blob", stored: fromBlob }], startDate, endDate);

  let fromDisk: StoredPrices | null = null;
  if (!picked.covered) {
    const localLayer = completeStored(await readLocalPrices(symbol));
    fromDisk = localLayer.stored;
    droppedIncomplete = droppedIncomplete || localLayer.dropped;
    picked = firstCoveringLayer(
      [
        { origin: "blob", stored: fromBlob },
        { origin: "local", stored: fromDisk },
      ],
      startDate,
      endDate,
    );
  }

  if (!picked.covered) {
    const memoryLayer = completeStored(readMemoryPrices(symbol));
    droppedIncomplete = droppedIncomplete || memoryLayer.dropped;
    picked = firstCoveringLayer(
      [
        { origin: "blob", stored: fromBlob },
        { origin: "local", stored: fromDisk },
        { origin: "memory", stored: memoryLayer.stored },
      ],
      startDate,
      endDate,
    );
  }

  let bars = picked.stored?.bars ?? [];
  let source = picked.stored?.source;

  if (!picked.covered) {
    const first = bars[0]?.date;
    const last = bars[bars.length - 1]?.date;
    const downloads: Array<Promise<{ bars: OhlcBar[]; source: PriceSource }>> = [];

    if (bars.length === 0) {
      downloads.push(downloadDailyBars(symbol, assetType, startDate, endDate));
    } else {
      if (first && first > startDate) {
        downloads.push(downloadDailyBars(symbol, assetType, startDate, addUtcDays(first, -1)));
      }
      if (last && last < endDate) {
        downloads.push(downloadDailyBars(symbol, assetType, last, endDate));
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
    } else if (bars.length > 0 && droppedIncomplete) {
      await writeStoredPrices({
        symbol,
        assetType,
        bars,
        updatedAt: new Date().toISOString(),
        source,
      });
    }
  } else if (bars.length > 0 && (droppedIncomplete || barsHaveNewDates(fromBlob?.bars, bars))) {
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
  uploaded: boolean;
  barCount: number;
  source?: PriceSource | "cache";
}

const MAX_INGEST_BARS = 4_000;

export async function ingestSymbolPrices(
  ticker: string,
  assetType: AssetType,
  rawBars: unknown,
): Promise<{ uploaded: boolean; barCount: number }> {
  const symbol = ticker.trim().toUpperCase();
  if (!Array.isArray(rawBars)) {
    throw new ValidationError("bars must be an array of daily OHLC rows.");
  }
  if (rawBars.length > MAX_INGEST_BARS) {
    throw new ValidationError(`bars cannot exceed ${MAX_INGEST_BARS} rows.`);
  }
  const bars = rawBars
    .map((row) => toOhlcBar(row as { date?: unknown; open?: unknown; high?: unknown; low?: unknown; close?: unknown }))
    .filter((bar): bar is OhlcBar => bar !== null);
  if (bars.length === 0) return { uploaded: false, barCount: 0 };
  const result = await mergeIntoPriceDatabase({
    symbol,
    assetType,
    bars,
    updatedAt: new Date().toISOString(),
  });
  return { uploaded: result.uploaded, barCount: result.stored.bars.length };
}

export async function syncSymbolPrices(
  ticker: string,
  assetType: AssetType,
  rawBars?: unknown,
): Promise<PriceSyncResult> {
  const symbol = ticker.trim().toUpperCase();
  const completeThrough = latestCompleteSession(assetType);
  const ingested = rawBars == null ? { uploaded: false, barCount: 0 } : await ingestSymbolPrices(symbol, assetType, rawBars);
  const before = await readStoredPrices(symbol);
  const start = addUtcDays(completeThrough, -WARM_HISTORY_DAYS);
  const bars = await fetchHistoricalData(symbol, assetType, start, completeThrough);
  const after = await readStoredPrices(symbol);
  const lastBar = bars[bars.length - 1]?.date ?? after?.bars.at(-1)?.date ?? null;
  const downloaded = !before || (before.bars.at(-1)?.date ?? "") < (after?.bars.at(-1)?.date ?? "");
  return {
    ticker: symbol,
    assetType,
    lastBar,
    completeThrough,
    downloaded,
    uploaded: ingested.uploaded,
    barCount: after?.bars.length ?? bars.length,
    source: downloaded ? after?.source : "cache",
  };
}
