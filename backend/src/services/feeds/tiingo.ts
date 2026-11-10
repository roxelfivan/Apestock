import type { OhlcBar } from "../../types.js";
import { fetchJson } from "./http.js";
import { parseTiingoPrices } from "./parse.js";

export function tiingoEnabled(): boolean {
  return Boolean(process.env.TIINGO_API_KEY);
}

export async function fetchTiingoDaily(symbol: string, startDate: string, endDate: string): Promise<OhlcBar[]> {
  const token = process.env.TIINGO_API_KEY;
  if (!token) return [];
  const url = new URL(`https://api.tiingo.com/tiingo/daily/${encodeURIComponent(symbol)}/prices`);
  url.searchParams.set("startDate", startDate);
  url.searchParams.set("endDate", endDate);
  const rows = await fetchJson<unknown>(url.toString(), { authorization: `Token ${token}` });
  return parseTiingoPrices(rows, startDate, endDate);
}
