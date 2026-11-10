import type { OhlcBar } from "../../types.js";
import { fetchText } from "./http.js";
import { parseStooqCsv, stooqSymbol } from "./parse.js";

export async function fetchStooqDaily(symbol: string, startDate: string, endDate: string): Promise<OhlcBar[]> {
  const url = new URL("https://stooq.com/q/d/l/");
  url.searchParams.set("s", stooqSymbol(symbol));
  url.searchParams.set("d1", startDate.replace(/-/g, ""));
  url.searchParams.set("d2", endDate.replace(/-/g, ""));
  url.searchParams.set("i", "d");
  if (process.env.STOOQ_API_KEY) {
    url.searchParams.set("apikey", process.env.STOOQ_API_KEY);
  }
  const text = await fetchText(url.toString(), { accept: "text/csv,text/plain" });
  return parseStooqCsv(text, startDate, endDate);
}
