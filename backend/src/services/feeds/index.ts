import type { AssetType, OhlcBar } from "../../types.js";
import { fetchBinanceDaily } from "./binance.js";
import { fetchStooqDaily } from "./stooq.js";
import { fetchTiingoDaily, tiingoEnabled } from "./tiingo.js";
import { fetchYahooDaily } from "./yahooHistory.js";

export type PriceProviderName = "binance" | "stooq" | "tiingo" | "yahoo";

export interface PriceProvider {
  name: PriceProviderName;
  fetch: (symbol: string, startDate: string, endDate: string) => Promise<OhlcBar[]>;
}

export function providersFor(assetType: AssetType): PriceProvider[] {
  if (assetType === "CRYPTO") {
    return [
      { name: "binance", fetch: fetchBinanceDaily },
      { name: "yahoo", fetch: fetchYahooDaily },
    ];
  }
  const stock: PriceProvider[] = [{ name: "stooq", fetch: fetchStooqDaily }];
  if (tiingoEnabled()) {
    stock.push({ name: "tiingo", fetch: fetchTiingoDaily });
  }
  stock.push({ name: "yahoo", fetch: fetchYahooDaily });
  return stock;
}
