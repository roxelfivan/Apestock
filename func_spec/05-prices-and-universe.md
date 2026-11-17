# Prices & universe

> How daily bars and ranked lists are fetched, cached, and shared.

---

## 1. Price lookup order

[`dataService.ts`](../backend/src/services/dataService.ts) `loadCoveredBars`:

1. **Vercel Blob** `price-database/{SYMBOL}.json` (`PRICE_DATABASE_FOLDER` in `durableStore.ts`)
2. **Local files** `data/prices/{SYMBOL}.json`, or `/tmp/...` when `cwd` is serverless (`/var/task`)
3. **In-memory** map for the current process
4. **Download** only the missing prefix/suffix via [`priceProviders.ts`](../backend/src/services/priceProviders.ts)

If Blob already spans `[startDate, endDate]` through the latest completed session, **no local read and no download**.

If Blob only misses a warmup prefix (or a last bar within a few sessions of `endDate`) but still has bars inside the window, **use Blob and skip Yahoo**. A failed suffix download must not discard those bars.

Incomplete OHLC (null/zero close) is stripped before coverage is tested. Dates are normalized to `YYYY-MM-DD` and sorted.

In-flight fetches for the same symbol+range coalesce (`inflight` map).

## 2. Download waterfall

Stocks: Yahoo public chart → Stooq → Yahoo library (`yahoo-finance2`). The unofficial library is last so a quota on it cannot block the other free feeds.

Crypto: the same, then Coinbase, Binance.US, Kraken.

`writeStoredPrices` merges into memory, local (best effort), and Blob (best effort). Write failures must not fail the backtest.

## 3. HTTP surfaces

| Method | Path | Role |
|---|---|---|
| GET | `/api/prices/:ticker` | Summary only: path, layer, count, range, `updatedAt`, source |
| POST | `/api/prices/sync` | Optional `bars` merged first; then gap through `latestCompleteSession` |

History Load sends `bars` from the saved result so production Blob grows without every visitor waiting on Yahoo.

## 4. Universe

[`universeService.ts`](../backend/src/services/universeService.ts) builds:

- US stocks: top 50 S&P 500 + top 50 Nasdaq by market cap (S&P membership from a public constituent file)
- US ETFs: top 50 stock, top 50 bond, top 50 other by AUM
- Crypto: top 50 Yahoo `-USD`

Cached 6 hours on the server (memory, disk/Blob) and in the browser (`frontend/src/data/universes.ts`). `allowAnySymbol` skips membership checks in `authorizeParsedRequest`.

## 5. Next

- Request/response shapes → [API & UI contracts](06-api-and-ui.md)
