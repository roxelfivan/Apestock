# Runtime flows

> End-to-end walks with the files touched. Indices are 0-based on the fetched bar array.

---

## 1. First page load

1. `App.tsx` reads `configFromSearch(window.location.search)` and `readStoredUniverse()`.
2. If the universe snapshot is older than 6 hours, `GET /api/universe` runs once. The ranked lists are also persisted on the server (memory / disk / Blob).
3. Debounced `GET /api/prices/:ticker` fills the Price database card. This is **read-only** and does not download.
4. Prices are **not** synced on every load (that stopped in v0.0.4). Sync happens on Run / research / History load.

## 2. Run

1. `handleSubmit` validates ticker + params; on a phone it switches `pane` to `results`.
2. `executeBacktest` bumps `runIdRef` (the race guard from v0.0.4).
3. `POST /api/prices/sync` with `{ ticker, assetType }` (no `bars`).
4. `POST /api/backtest` with the form body.
5. Backend `parseBacktestRequest` → `authorizeParsedRequest` (stale stored universe is enough unless `allowAnySymbol`) → `fetchHistoricalData` from `fetchStart` (window start minus warmup, including `committeeFetchWarmup()` so every member is ready). Stored Blob/local bars that overlap that window are used even if Yahoo cannot extend them.
6. `computeSignals` on the full fetch; `runEngine` from the first bar in the **test** window; `computeCommittee` on the same bars; `buildResult` with `version: 3`.
7. If `runIdRef` still matches, `App` sets `result`, `stale=false`, `saveRun`.
8. `searchFromConfig` keeps the URL aligned.

## 3. Committee click

1. `CommitteeBox` calls `onSelect(strategy, params)`.
2. `handleCommitteeSelect` keeps current params if the strategy is already selected; otherwise uses the member's default `params`.
3. Clears sweep / walk-forward tables.
4. `executeBacktest` with the patched config. The URL picks up the new `strategy` and param keys.

A slower previous `executeBacktest` returns early when `runIdRef` disagrees.

## 4. History load

1. `restoreRun` copies `run.config` into form state and `run.result` into `result`.
2. `syncPrices(ticker, assetType, barsFromResult)` POSTs optional `bars` so Blob can merge dates before a market gap fetch.
3. Pane switches to results; `stale` is false.

## 5. Sweep / walk-forward

1. Same `refreshPrices` as Run.
2. `POST /api/backtest/sweep` or `/walk-forward`.
3. `research.ts` reuses `parseBacktestRequest` + `buildResult` per cell/fold. Grids are hardcoded per strategy; missing grids throw a validation error rather than a silent empty table.

## 6. Next

- Signal and fill semantics → [Engine](04-engine.md)
- Who wins Blob vs Yahoo → [Prices & universe](05-prices-and-universe.md)
