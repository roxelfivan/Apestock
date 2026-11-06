import {
  type UniverseGroup,
  type UniverseSnapshot,
  unique,
  yahooSymbol,
} from "../data/universe.js";
import { predefinedScreener, screenQuotes, type ScreenerQuote } from "./yahooClient.js";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const USER_AGENT = "Apestock/1.0 (https://github.com/roxelfivan/Apestock)";

let cache: { snapshot: UniverseSnapshot; expiresAt: number } | null = null;
let inflight: Promise<UniverseSnapshot> | null = null;

function takeSymbols(quotes: ScreenerQuote[], quoteType: string, limit: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const quote of quotes) {
    if (quote.quoteType && quote.quoteType !== quoteType) continue;
    const symbol = yahooSymbol(quote.symbol ?? "");
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    out.push(symbol);
    if (out.length >= limit) break;
  }
  return out;
}

function equityQuery(extra: Array<Record<string, unknown>> = []) {
  return {
    size: extra.length ? 50 : 200,
    offset: 0,
    sortField: "intradaymarketcap",
    sortType: "DESC",
    quoteType: "EQUITY",
    query: {
      operator: "AND",
      operands: [{ operator: "eq", operands: ["region", "us"] }, ...extra],
    },
  };
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "text/plain,text/csv,text/html" },
  });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.text();
}

function parseSp500Csv(text: string): string[] {
  const lines = text.trim().split(/\r?\n/).slice(1);
  return unique(
    lines
      .map((line) => yahooSymbol(line.split(",")[0] ?? ""))
      .filter((symbol) => /^[A-Z][A-Z0-9-]*$/.test(symbol)),
  );
}

function parseSp500Wikipedia(html: string): string[] {
  const table = html.split('id="constituents"')[1]?.split("</table>")[0] ?? "";
  const found: string[] = [];
  const patterns = [
    /"wt":"([A-Z]{1,5}(?:\.[A-Z])?)"/g,
    /XNYS:([A-Z]{1,5}(?:\.[A-Z])?)/g,
    /XNAS:([A-Z]{1,5}(?:\.[A-Z])?)/g,
    />([A-Z]{1,5}(?:[.\-][A-Z])?)<\/a><\/td>/g,
  ];
  for (const pattern of patterns) {
    for (const match of table.matchAll(pattern)) {
      found.push(yahooSymbol(match[1]));
    }
  }
  return unique(found.filter((symbol) => /^[A-Z][A-Z0-9-]*$/.test(symbol) && symbol.length <= 6));
}

async function loadSp500Members(): Promise<Set<string>> {
  try {
    const csv = await fetchText(
      "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv",
    );
    const symbols = parseSp500Csv(csv);
    if (symbols.length >= 400) return new Set(symbols);
  } catch {
    // Fall through to Wikipedia.
  }
  const html = await fetchText("https://en.wikipedia.org/wiki/List_of_S%26P_500_companies");
  const symbols = parseSp500Wikipedia(html);
  if (symbols.length < 400) {
    throw new Error(`S&P 500 membership list too small (${symbols.length}).`);
  }
  return new Set(symbols);
}

async function loadTopSp50(): Promise<string[]> {
  const [members, quotes] = await Promise.all([loadSp500Members(), screenQuotes(equityQuery())]);
  return takeSymbols(
    quotes.filter((quote) => members.has(yahooSymbol(quote.symbol ?? ""))),
    "EQUITY",
    50,
  );
}

async function loadTopNasdaq50(): Promise<string[]> {
  const quotes = await screenQuotes(
    equityQuery([{ operator: "eq", operands: ["exchange", "NMS"] }]),
  );
  return takeSymbols(quotes, "EQUITY", 50);
}

async function loadTopUsEtfs(): Promise<string[]> {
  const quotes = await screenQuotes({
    size: 50,
    offset: 0,
    sortField: "fundnetassets",
    sortType: "DESC",
    quoteType: "ETF",
    query: {
      operator: "AND",
      operands: [{ operator: "eq", operands: ["region", "us"] }],
    },
  });
  return takeSymbols(quotes, "ETF", 50);
}

function isPublicCryptoSymbol(symbol: string): boolean {
  return /^[A-Z]{2,10}-USD$/.test(symbol) && !/\d/.test(symbol);
}

const WRAPPED_CRYPTO = new Set([
  "STETH-USD",
  "WSTETH-USD",
  "WBTC-USD",
  "WBETH-USD",
  "WETH-USD",
  "WEETH-USD",
  "BTCB-USD",
  "AETHWETH-USD",
  "AETHUSDT-USD",
]);

async function loadTopCrypto(): Promise<string[]> {
  const quotes = await predefinedScreener("all_cryptocurrencies_us", 150);
  return takeSymbols(
    quotes.filter((quote) => {
      const symbol = yahooSymbol(quote.symbol ?? "");
      return isPublicCryptoSymbol(symbol) && !WRAPPED_CRYPTO.has(symbol);
    }),
    "CRYPTOCURRENCY",
    50,
  );
}

function requireCount(label: string, symbols: string[], min = 40): string[] {
  if (symbols.length < min) {
    throw new Error(`${label} returned ${symbols.length} names (need at least ${min}).`);
  }
  return symbols.slice(0, 50);
}

async function downloadSnapshot(): Promise<UniverseSnapshot> {
  const [sp50, nasdaq50, etf50, crypto50] = await Promise.all([
    loadTopSp50(),
    loadTopNasdaq50(),
    loadTopUsEtfs(),
    loadTopCrypto(),
  ]);

  const stockGroups: UniverseGroup[] = [
    { label: "Top 50 S&P", symbols: requireCount("Top 50 S&P", sp50) },
    { label: "Top 50 Nasdaq", symbols: requireCount("Top 50 Nasdaq", nasdaq50) },
    { label: "Top 50 US ETF", symbols: requireCount("Top 50 US ETF", etf50) },
  ];
  const cryptoGroups: UniverseGroup[] = [
    { label: "Top 50 crypto", symbols: requireCount("Top 50 crypto", crypto50) },
  ];

  return {
    fetchedAt: new Date().toISOString(),
    stock: {
      groups: stockGroups,
      symbols: unique(stockGroups.flatMap((group) => group.symbols)),
    },
    crypto: {
      groups: cryptoGroups,
      symbols: unique(cryptoGroups.flatMap((group) => group.symbols)),
    },
  };
}

export async function getUniverseSnapshot(): Promise<UniverseSnapshot> {
  if (cache && Date.now() < cache.expiresAt) return cache.snapshot;
  if (inflight) return inflight;

  inflight = downloadSnapshot()
    .then((snapshot) => {
      cache = { snapshot, expiresAt: Date.now() + CACHE_TTL_MS };
      return snapshot;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
