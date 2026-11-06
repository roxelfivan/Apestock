import YahooFinance from "yahoo-finance2";
import { DataError, sanitizeUserError } from "../errors.js";

export const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

async function yahooFetch<T>(label: string, work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw new DataError(`${label}: ${sanitizeUserError(error, "Yahoo Finance request failed.")}`);
  }
}

let sessionReady: Promise<void> | null = null;

export async function ensureYahooSession(): Promise<void> {
  if (!sessionReady) {
    sessionReady = yahooFinance
      .quote("AAPL", { fields: ["symbol"] })
      .then(() => undefined)
      .catch((error: unknown) => {
        sessionReady = null;
        throw new DataError(`Yahoo session: ${sanitizeUserError(error, "Yahoo Finance request failed.")}`);
      });
  }
  await sessionReady;
}

export interface ScreenerQuote {
  symbol?: string;
  quoteType?: string;
  marketCap?: number;
  netAssets?: number;
  exchange?: string;
}

interface ScreenerResponse {
  finance?: { result?: Array<{ quotes?: ScreenerQuote[] }> };
}

export async function screenQuotes(body: Record<string, unknown>): Promise<ScreenerQuote[]> {
  await ensureYahooSession();
  const result = (await yahooFetch("Yahoo screener", () => yahooFinance._fetch(
    "https://query2.finance.yahoo.com/v1/finance/screener",
    {},
    {
      fetchOptions: {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    },
    "json",
    true,
  ))) as ScreenerResponse;
  return result.finance?.result?.[0]?.quotes ?? [];
}

export async function predefinedScreener(scrIds: string, count: number): Promise<ScreenerQuote[]> {
  await ensureYahooSession();
  const result = (await yahooFetch("Yahoo predefined screener", () => yahooFinance._fetch(
    "https://query2.finance.yahoo.com/v1/finance/screener/predefined/saved",
    { count: String(count), scrIds },
    {},
    "json",
    true,
  ))) as ScreenerResponse;
  return result.finance?.result?.[0]?.quotes ?? [];
}
