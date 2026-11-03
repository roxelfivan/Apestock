import type { AssetType } from "../types.js";

export interface UniverseGroup {
  label: string;
  symbols: string[];
}

/** Top 50 S&P 500 names by market cap (Yahoo symbols). Snapshot: late Oct 2026. */
export const SP50: string[] = [
  "NVDA",
  "AAPL",
  "GOOGL",
  "GOOG",
  "MSFT",
  "AMZN",
  "META",
  "AVGO",
  "TSLA",
  "BRK-B",
  "LLY",
  "MU",
  "WMT",
  "JPM",
  "AMD",
  "V",
  "XOM",
  "JNJ",
  "MA",
  "ABBV",
  "PLTR",
  "INTC",
  "COST",
  "CVX",
  "CSCO",
  "KO",
  "PG",
  "UNH",
  "ORCL",
  "MRK",
  "BAC",
  "HD",
  "CAT",
  "PM",
  "GE",
  "AMAT",
  "PANW",
  "MS",
  "LRCX",
  "DELL",
  "NFLX",
  "RTX",
  "GS",
  "TXN",
  "TMO",
  "WFC",
  "CRWD",
  "AMGN",
  "IBM",
  "LIN",
];

/** Top 50 Nasdaq-listed names by market cap (Yahoo symbols). Snapshot: late Oct 2026. */
export const NASDAQ50: string[] = [
  "NVDA",
  "AAPL",
  "GOOGL",
  "GOOG",
  "MSFT",
  "AMZN",
  "SPCX",
  "META",
  "AVGO",
  "TSLA",
  "MU",
  "WMT",
  "AMD",
  "ASML",
  "PLTR",
  "INTC",
  "COST",
  "CSCO",
  "AMAT",
  "PANW",
  "LRCX",
  "NFLX",
  "TXN",
  "CRWD",
  "AMGN",
  "LIN",
  "ARM",
  "SHOP",
  "MRVL",
  "GILD",
  "KLAC",
  "PEP",
  "ADI",
  "QCOM",
  "SNDK",
  "TMUS",
  "ISRG",
  "STX",
  "VRTX",
  "WDC",
  "FTNT",
  "BKNG",
  "ADP",
  "SBUX",
  "PDD",
  "ADBE",
  "ABNB",
  "MAR",
  "INTU",
  "CSX",
];

/** Top 50 US-listed ETFs by AUM (Yahoo symbols). Snapshot: 2 Nov 2026. */
export const US_ETF_TOP50: string[] = [
  "VOO",
  "IVV",
  "SPY",
  "VTI",
  "QQQ",
  "VEA",
  "VUG",
  "VTV",
  "VGT",
  "VWO",
  "BND",
  "SPYM",
  "AGG",
  "IWF",
  "IJH",
  "XLK",
  "VXUS",
  "VIG",
  "IJR",
  "SGOV",
  "QQQM",
  "VO",
  "RSP",
  "SCHD",
  "ITOT",
  "IWM",
  "VYM",
  "IWD",
  "VB",
  "EFA",
  "SMH",
  "SCHX",
  "VT",
  "BNDX",
  "VEU",
  "SCHG",
  "VCIT",
  "IWR",
  "SPYG",
  "VV",
  "XLF",
  "IWB",
  "SOXX",
  "BIL",
  "TLT",
  "MUB",
  "DIA",
  "JEPI",
  "SCHB",
  "BSV",
];

export const CRYPTO_TOP50: string[] = [
  "BTC-USD",
  "ETH-USD",
  "USDT-USD",
  "XRP-USD",
  "BNB-USD",
  "SOL-USD",
  "USDC-USD",
  "DOGE-USD",
  "ADA-USD",
  "TRX-USD",
  "TON-USD",
  "LINK-USD",
  "AVAX-USD",
  "XLM-USD",
  "SUI-USD",
  "SHIB-USD",
  "HBAR-USD",
  "DOT-USD",
  "BCH-USD",
  "LEO-USD",
  "LTC-USD",
  "UNI-USD",
  "PEPE-USD",
  "NEAR-USD",
  "DAI-USD",
  "APT-USD",
  "ICP-USD",
  "AAVE-USD",
  "POL-USD",
  "ETC-USD",
  "RENDER-USD",
  "TAO-USD",
  "ATOM-USD",
  "FIL-USD",
  "ALGO-USD",
  "ARB-USD",
  "OP-USD",
  "FET-USD",
  "INJ-USD",
  "IMX-USD",
  "STX-USD",
  "GRT-USD",
  "THETA-USD",
  "RUNE-USD",
  "MKR-USD",
  "LDO-USD",
  "CRO-USD",
  "VET-USD",
  "KAS-USD",
  "MNT-USD",
];

function unique(symbols: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const symbol of symbols) {
    if (seen.has(symbol)) continue;
    seen.add(symbol);
    out.push(symbol);
  }
  return out;
}

export const STOCK_UNIVERSE: string[] = unique([...SP50, ...NASDAQ50, ...US_ETF_TOP50]);

export function universeFor(assetType: AssetType): string[] {
  return assetType === "CRYPTO" ? CRYPTO_TOP50 : STOCK_UNIVERSE;
}

export const STOCK_GROUPS: UniverseGroup[] = [
  { label: "Top 50 S&P", symbols: SP50 },
  { label: "Top 50 Nasdaq", symbols: NASDAQ50 },
  { label: "Top 50 US ETF", symbols: US_ETF_TOP50 },
];

export const CRYPTO_GROUPS: UniverseGroup[] = [{ label: "Top 50 crypto", symbols: CRYPTO_TOP50 }];

export function universeGroups(assetType: AssetType): UniverseGroup[] {
  return assetType === "CRYPTO" ? CRYPTO_GROUPS : STOCK_GROUPS;
}

export function isValidTicker(ticker: string, assetType: AssetType): boolean {
  const symbol = (ticker || "").trim().toUpperCase();
  return universeFor(assetType).includes(symbol);
}
