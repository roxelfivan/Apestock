# API & UI contracts

> HTTP, query string, and browser storage. Changing these without a migration note is a breaking change.

---

## 1. HTTP

Base: same origin `/api`. JSON bodies. Validation and data errors: **400** `{ "error": "..." }`. Unexpected: **500** from `app.ts`.

| Method | Path | Body / query |
|---|---|---|
| GET | `/api/health` | `{ ok, service: "apestock-backend" }` |
| GET | `/api/universe` | optional `assetType=STOCK\|CRYPTO` |
| GET | `/api/prices/:ticker` | cache summary |
| POST | `/api/prices/sync` | `{ ticker, assetType, bars? }` |
| POST | `/api/backtest` | `BacktestRequest` |
| POST | `/api/backtest/sweep` | same + implied grid |
| POST | `/api/backtest/walk-forward` | same; optional `folds` |

`BacktestRequest` fields: `ticker`, `assetType`, `strategy`, `params`, `startingCapital`, `tradePercent` (default 20), `timeframe` (`1Y\|3Y\|5Y\|CUSTOM`), `startDate`/`endDate` for CUSTOM, `sizingMode`, `commissionBps`, `commissionPerShare`, `slippageBps`, `allowAnySymbol`.

`BacktestResult.version` is **3** (`RESULT_VERSION`). Do not reuse 1–2. Bump this integer when the JSON gains/removes required fields; that is separate from npm **0.0.6**.

## 2. Query string

[`queryState.ts`](../frontend/src/lib/queryState.ts): `ticker`, `assetType`, `strategy`, `capital`, `tradePercent`, `timeframe`, `startDate`, `endDate`, cost fields, `sizingMode`, `allowAny`, plus every param key (e.g. `shortPeriod`). `App` `replaceState`s on each config change. Unknown keys that match strategy params are copied onto `params`.

## 3. localStorage

| Key | Contents |
|---|---|
| `apestock.runs.v1` | Up to 12 `SavedRun` `{ id, createdAt, config, result }` |
| Universe snapshot | Written by `storeUniverse` in `data/universes.ts` (6h freshness) |

Bumping the runs key is a silent drop of old history; document it in What's new.

## 4. UI events for docs

Help and Functional Specification are React state in `App.tsx` plus `window` events so catalogs can open a page without prop-drilling:

- `apestock:open-help` detail: Help page id
- `apestock:open-func-spec` detail: spec page id

`Escape` closes the open overlay. `?` / `Ctrl+/` open Help when the target is not an editable field. `Ctrl+Shift+E` opens the spec.

## 5. Next

- Scripts and Vercel → [Testing & deploy](07-testing-and-deploy.md)
