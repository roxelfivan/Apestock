import { addUtcDays } from "../../lib/dates.js";
import { yahooFinance } from "../yahooClient.js";
import type { OhlcBar } from "../../types.js";
import { finalizeBars, toOhlcBar } from "./parse.js";

export async function fetchYahooDaily(symbol: string, startDate: string, endDate: string): Promise<OhlcBar[]> {
  const result = await yahooFinance.chart(symbol, {
    period1: startDate,
    period2: addUtcDays(endDate, 1),
    interval: "1d",
    return: "array",
  });
  const quotes = result.quotes ?? [];
  const bars = quotes.map(toOhlcBar).filter((bar): bar is OhlcBar => bar !== null);
  return finalizeBars(bars, startDate, endDate);
}
