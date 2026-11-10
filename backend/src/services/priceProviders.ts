import { DataError, isQuotaOrThrottleError } from "../errors.js";
import { addUtcDays } from "../lib/dates.js";
import type { AssetType, OhlcBar } from "../types.js";
import { toOhlcBar } from "./ohlcParse.js";
import { yahooFinance } from "./yahooClient.js";

export type PriceSource = "yahoo" | "stooq" | "coinbase" | "binance" | "kraken";
export type PriceFallbackStep =
  | "yahoo-library"
  | "yahoo-chart"
  | "stooq"
  | "coinbase"
  | "binance"
  | "kraken";

let skipYahooLibrary = false;

export function resetPriceProviderState(): void {
  skipYahooLibrary = false;
}

export function fallbackSteps(assetType: AssetType): PriceFallbackStep[] {
  const steps: PriceFallbackStep[] = ["yahoo-library", "yahoo-chart", "stooq"];
  if (assetType === "CRYPTO") {
    steps.push("coinbase", "binance", "kraken");
  }
  return steps;
}

const FETCH_MS = 15_000;
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function yyyymmdd(iso: string): string {
  return iso.replaceAll("-", "");
}

function unix(iso: string, endOfDay = false): number {
  return Math.floor(Date.parse(`${iso}T${endOfDay ? "23:59:59" : "00:00:00"}.000Z`) / 1000);
}

function sessionDate(unixSeconds: number, timeZone: string): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-CA", { timeZone });
}

export function stooqSymbol(yahooTicker: string, assetType: AssetType): string {
  const symbol = yahooTicker.trim().toLowerCase();
  if (assetType === "CRYPTO") {
    return symbol.endsWith("-usd") ? `${symbol.slice(0, -4)}usd` : `${symbol}usd`;
  }
  return `${symbol.replace(/-/g, ".")}.us`;
}

export function binanceSymbol(yahooTicker: string): string | null {
  const symbol = yahooTicker.trim().toUpperCase();
  if (!symbol.endsWith("-USD")) return null;
  const base = symbol.slice(0, -4);
  if (!base || /[^A-Z0-9]/.test(base)) return null;
  return `${base}USDT`;
}

export function coinbaseProduct(yahooTicker: string): string | null {
  const symbol = yahooTicker.trim().toUpperCase();
  if (!symbol.endsWith("-USD")) return null;
  return symbol;
}

export function krakenPair(yahooTicker: string): string | null {
  const symbol = yahooTicker.trim().toUpperCase();
  if (symbol === "BTC-USD") return "XBTUSD";
  if (!symbol.endsWith("-USD")) return null;
  return `${symbol.slice(0, -4)}USD`;
}

export function parseStooqCsv(csv: string, startDate: string, endDate: string): OhlcBar[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2 || /^no data/i.test(lines[0])) return [];
  const out: OhlcBar[] = [];
  for (const line of lines.slice(1)) {
    const [date, open, high, low, close] = line.split(",");
    const bar = toOhlcBar({ date, open, high, low, close });
    if (!bar || bar.date < startDate || bar.date > endDate) continue;
    out.push(bar);
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

export function parseYahooChartPayload(payload: unknown, startDate: string, endDate: string, timeZone: string): OhlcBar[] {
  const result = (payload as { chart?: { result?: Array<Record<string, unknown>> } })?.chart?.result?.[0];
  if (!result) {
    const description = (payload as { chart?: { error?: { description?: string } } })?.chart?.error?.description;
    throw new DataError(description || "Yahoo chart had no result.");
  }
  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
  const quote = (result.indicators as { quote?: Array<Record<string, unknown[]>> } | undefined)?.quote?.[0];
  const opens = quote?.open ?? [];
  const highs = quote?.high ?? [];
  const lows = quote?.low ?? [];
  const closes = quote?.close ?? [];
  const out: OhlcBar[] = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const ts = Number(timestamps[i]);
    if (!Number.isFinite(ts)) continue;
    const bar = toOhlcBar({
      date: sessionDate(ts, timeZone),
      open: opens[i],
      high: highs[i],
      low: lows[i],
      close: closes[i],
    });
    if (!bar || bar.date < startDate || bar.date > endDate) continue;
    out.push(bar);
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

export function parseCoinbaseCandles(rows: unknown[], startDate: string, endDate: string): OhlcBar[] {
  const out: OhlcBar[] = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 5) continue;
    const time = Number(row[0]);
    const bar = toOhlcBar({
      date: sessionDate(time, "UTC"),
      low: row[1],
      high: row[2],
      open: row[3],
      close: row[4],
    });
    if (!bar || bar.date < startDate || bar.date > endDate) continue;
    out.push(bar);
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

export function parseBinanceKlines(rows: unknown[], startDate: string, endDate: string): OhlcBar[] {
  const out: OhlcBar[] = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 5) continue;
    const openTime = Number(row[0]);
    if (!Number.isFinite(openTime)) continue;
    const bar = toOhlcBar({
      date: new Date(openTime).toISOString().slice(0, 10),
      open: row[1],
      high: row[2],
      low: row[3],
      close: row[4],
    });
    if (!bar || bar.date < startDate || bar.date > endDate) continue;
    out.push(bar);
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

export function parseKrakenOhlc(payload: unknown, startDate: string, endDate: string): OhlcBar[] {
  const body = payload as { error?: string[]; result?: Record<string, unknown> };
  if (body.error && body.error.length > 0) throw new DataError(body.error.join("; "));
  const result = body.result ?? {};
  const pairKey = Object.keys(result).find((key) => key !== "last");
  const rows = pairKey && Array.isArray(result[pairKey]) ? result[pairKey] : [];
  const out: OhlcBar[] = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 5) continue;
    const bar = toOhlcBar({
      date: sessionDate(Number(row[0]), "UTC"),
      open: row[1],
      high: row[2],
      low: row[3],
      close: row[4],
    });
    if (!bar || bar.date < startDate || bar.date > endDate) continue;
    out.push(bar);
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_MS),
    headers: { Accept: "text/csv,application/json,*/*", "User-Agent": BROWSER_UA },
  });
  if (!response.ok) throw new DataError(`HTTP ${response.status} from ${new URL(url).host}`);
  return response.text();
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_MS),
    headers: {
      Accept: "application/json",
      "User-Agent": BROWSER_UA,
    },
  });
  if (!response.ok) throw new DataError(`HTTP ${response.status} from ${new URL(url).host}`);
  return response.json();
}

async function fromYahooLibrary(symbol: string, startDate: string, endDate: string): Promise<OhlcBar[]> {
  const result = await yahooFinance.chart(symbol, {
    period1: startDate,
    period2: addUtcDays(endDate, 1),
    interval: "1d",
    return: "array",
  });
  return (result.quotes ?? [])
    .map(toOhlcBar)
    .filter((bar): bar is OhlcBar => bar !== null)
    .filter((bar) => bar.date >= startDate && bar.date <= endDate);
}

async function fromYahooChart(symbol: string, assetType: AssetType, startDate: string, endDate: string): Promise<OhlcBar[]> {
  const period1 = unix(startDate);
  const period2 = unix(addUtcDays(endDate, 1), true);
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?period1=${period1}&period2=${period2}&interval=1d&events=history`;
  const payload = await fetchJson(url);
  return parseYahooChartPayload(payload, startDate, endDate, assetType === "CRYPTO" ? "UTC" : "America/New_York");
}

async function fromStooq(symbol: string, assetType: AssetType, startDate: string, endDate: string): Promise<OhlcBar[]> {
  const s = stooqSymbol(symbol, assetType);
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(s)}&d1=${yyyymmdd(startDate)}&d2=${yyyymmdd(endDate)}&i=d`;
  const csv = await fetchText(url);
  if (/<!DOCTYPE|<html/i.test(csv)) {
    throw new DataError("Stooq returned an HTML challenge page.");
  }
  return parseStooqCsv(csv, startDate, endDate);
}

async function fromCoinbase(symbol: string, startDate: string, endDate: string): Promise<OhlcBar[]> {
  const product = coinbaseProduct(symbol);
  if (!product) return [];
  const bars: OhlcBar[] = [];
  let cursor = startDate;
  while (cursor <= endDate) {
    const next = addUtcDays(cursor, 280);
    const chunkEnd = next < endDate ? next : endDate;
    const url =
      `https://api.exchange.coinbase.com/products/${encodeURIComponent(product)}/candles` +
      `?granularity=86400&start=${cursor}T00:00:00Z&end=${chunkEnd}T23:59:59Z`;
    const payload = await fetchJson(url);
    if (!Array.isArray(payload) || payload.length === 0) {
      cursor = addUtcDays(chunkEnd, 1);
      continue;
    }
    bars.push(...parseCoinbaseCandles(payload, startDate, endDate));
    cursor = addUtcDays(chunkEnd, 1);
  }
  return bars;
}

async function fromBinanceUs(symbol: string, startDate: string, endDate: string): Promise<OhlcBar[]> {
  const pair = binanceSymbol(symbol);
  if (!pair) return [];
  const startMs = Date.parse(`${startDate}T00:00:00.000Z`);
  const endMs = Date.parse(`${endDate}T23:59:59.000Z`);
  const bars: OhlcBar[] = [];
  let cursor = startMs;
  while (cursor <= endMs) {
    const url =
      `https://api.binance.us/api/v3/klines?symbol=${encodeURIComponent(pair)}` +
      `&interval=1d&limit=1000&startTime=${cursor}&endTime=${endMs}`;
    const payload = await fetchJson(url);
    if (!Array.isArray(payload) || payload.length === 0) break;
    bars.push(...parseBinanceKlines(payload, startDate, endDate));
    const lastOpen = Number(payload[payload.length - 1]?.[0]);
    if (!Number.isFinite(lastOpen) || payload.length < 1000) break;
    cursor = lastOpen + 86_400_000;
    if (cursor <= lastOpen) break;
  }
  return bars;
}

async function fromKraken(symbol: string, startDate: string, endDate: string): Promise<OhlcBar[]> {
  const pair = krakenPair(symbol);
  if (!pair) return [];
  const url = `https://api.kraken.com/0/public/OHLC?pair=${encodeURIComponent(pair)}&interval=1440&since=${unix(startDate)}`;
  const payload = await fetchJson(url);
  return parseKrakenOhlc(payload, startDate, endDate);
}

export async function downloadDailyBars(
  symbol: string,
  assetType: AssetType,
  startDate: string,
  endDate: string,
): Promise<{ bars: OhlcBar[]; source: PriceSource }> {
  if (startDate > endDate) return { bars: [], source: "yahoo" };

  const attempts: Array<{
    step: PriceFallbackStep;
    source: PriceSource;
    run: () => Promise<OhlcBar[]>;
  }> = [
    { step: "yahoo-library", source: "yahoo", run: () => fromYahooLibrary(symbol, startDate, endDate) },
    { step: "yahoo-chart", source: "yahoo", run: () => fromYahooChart(symbol, assetType, startDate, endDate) },
    { step: "stooq", source: "stooq", run: () => fromStooq(symbol, assetType, startDate, endDate) },
  ];
  if (assetType === "CRYPTO") {
    attempts.push(
      { step: "coinbase", source: "coinbase", run: () => fromCoinbase(symbol, startDate, endDate) },
      { step: "binance", source: "binance", run: () => fromBinanceUs(symbol, startDate, endDate) },
      { step: "kraken", source: "kraken", run: () => fromKraken(symbol, startDate, endDate) },
    );
  }

  const failures: string[] = [];
  for (const attempt of attempts) {
    if (attempt.step === "yahoo-library" && skipYahooLibrary) {
      failures.push("yahoo-library: skipped after quota");
      continue;
    }
    try {
      const bars = await attempt.run();
      if (bars.length > 0) return { bars, source: attempt.source };
      failures.push(`${attempt.step}: empty`);
    } catch (error) {
      if (attempt.step === "yahoo-library" && isQuotaOrThrottleError(error)) {
        skipYahooLibrary = true;
      }
      const reason = error instanceof Error ? error.message : "request failed";
      failures.push(`${attempt.step}: ${reason}`);
    }
  }

  throw new DataError(`Unable to fetch historical data for ${symbol} (${failures.join("; ")}).`);
}
