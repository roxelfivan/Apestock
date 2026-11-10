import { addUtcDays } from "../../lib/dates.js";
import type { OhlcBar } from "../../types.js";
import { fetchJson } from "./http.js";
import { finalizeBars, parseBinanceKlines, yahooCryptoToBinance } from "./parse.js";

const DAY_MS = 86_400_000;
const KLINE_HOSTS = [
  "https://api.binance.com",
  "https://data-api.binance.vision",
  "https://api.binance.us",
];

export async function fetchBinanceDaily(symbol: string, startDate: string, endDate: string): Promise<OhlcBar[]> {
  const pair = yahooCryptoToBinance(symbol);
  if (!pair) return [];

  const bars: OhlcBar[] = [];
  let startMs = Date.parse(`${startDate}T00:00:00.000Z`);
  const endMs = Date.parse(`${addUtcDays(endDate, 1)}T00:00:00.000Z`) - 1;
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs > endMs) return [];

  let hostIndex = 0;
  while (startMs < endMs) {
    const url = new URL(`${KLINE_HOSTS[hostIndex]}/api/v3/klines`);
    url.searchParams.set("symbol", pair);
    url.searchParams.set("interval", "1d");
    url.searchParams.set("startTime", String(startMs));
    url.searchParams.set("endTime", String(endMs));
    url.searchParams.set("limit", "1000");
    let rows: unknown;
    try {
      rows = await fetchJson<unknown>(url.toString());
    } catch (error) {
      if (hostIndex < KLINE_HOSTS.length - 1) {
        hostIndex += 1;
        continue;
      }
      throw error;
    }
    if (!Array.isArray(rows)) {
      if (hostIndex < KLINE_HOSTS.length - 1) {
        hostIndex += 1;
        continue;
      }
      return [];
    }
    const chunk = parseBinanceKlines(rows, startDate, endDate);
    if (chunk.length === 0) break;
    bars.push(...chunk);
    if (!Array.isArray(rows) || rows.length < 1000) break;
    const lastOpen = Number((rows[rows.length - 1] as unknown[])[0]);
    if (!Number.isFinite(lastOpen)) break;
    startMs = lastOpen + DAY_MS;
  }

  return finalizeBars(bars, startDate, endDate);
}
