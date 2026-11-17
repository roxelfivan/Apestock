# Product overview

> What Apestock is for, who it is for, what it does, and what it deliberately does not do.

---

## 1. The problem

People want a honest daily-bar read on a ticker: did this technical rule make money after realistic fills, and what do the *other* rules say on the same window? Spreadsheets and one-off Python scripts do not share a price database, do not fill T+1 open, and do not show a committee of zones next to the blotter.

## 2. The product

Apestock is a **daily (EOD) stock and crypto backtester**. Strategies run on a Node.js backend. A React UI configures the run, inspects trades, and charts the result.

Central rules:

- Signals on day **T close**; orders fill on day **T+1 open**.
- Long-only, FIFO lots, optional commission and slippage.
- Daily OHLC is stored and reused (Blob first, then local, then a gap download).
- After each run, every technical strategy **votes** from its current zone on the same bars.

## 3. Users

| | |
|---|---|
| **Primary** | Individuals exploring EOD technical rules on liquid US names, ETFs, and major crypto pairs. |
| **Secondary** | Developers maintaining this repository. |
| **Explicitly not** | Live traders, options/futures desks, multi-asset portfolio optimizers, or anyone who needs tick data, shorts, or a brokerage connection. |

## 4. Capability map

### 4.1 Backtest

| Capability | Where it lives |
|---|---|
| Parse request, warmup fetch, engine, metrics | [`backend/src/engine/execute.ts`](../backend/src/engine/execute.ts) |
| Signals (25 strategies) | [`backend/src/engine/signals.ts`](../backend/src/engine/signals.ts) |
| T+1 FIFO engine | [`backend/src/engine/engine.ts`](../backend/src/engine/engine.ts) |
| Risk metrics + monthly grid | [`backend/src/engine/metrics.ts`](../backend/src/engine/metrics.ts) |

### 4.2 Committee and research

| Capability | Where it lives |
|---|---|
| Zone votes + same-window stats | [`backend/src/engine/committee.ts`](../backend/src/engine/committee.ts), [`stance.ts`](../backend/src/engine/stance.ts) |
| Parameter sweep + walk-forward | [`backend/src/engine/research.ts`](../backend/src/engine/research.ts) |
| Click-to-switch + sort | [`frontend/src/components/CommitteeBox.tsx`](../frontend/src/components/CommitteeBox.tsx) |

### 4.3 Data

| Capability | Where it lives |
|---|---|
| Blob → local → download | [`backend/src/services/dataService.ts`](../backend/src/services/dataService.ts) |
| Price files + Blob paths | [`backend/src/services/priceStore.ts`](../backend/src/services/priceStore.ts) |
| Yahoo / Stooq / crypto venues | [`backend/src/services/priceProviders.ts`](../backend/src/services/priceProviders.ts) |
| Ranked universes | [`backend/src/services/universeService.ts`](../backend/src/services/universeService.ts) |

### 4.4 UI

| Capability | Where it lives |
|---|---|
| Setup form + results composition | [`frontend/src/App.tsx`](../frontend/src/App.tsx) |
| Deep-link query | [`frontend/src/lib/queryState.ts`](../frontend/src/lib/queryState.ts) |
| Run history | [`frontend/src/lib/history.ts`](../frontend/src/lib/history.ts) |
| Help / Functional Specification | [`docs/`](../docs), [`func_spec/`](README.md) |

## 5. Design principles

1. **Daily bars only.** No intraday, no adjusted-vs-raw toggle in the UI; feeds are whatever the provider returns as daily OHLC.
2. **Fills are worse than the close.** Slippage is applied on the open; commission is bps plus $/share.
3. **Degrade, do not crash.** Blob/disk write failures are ignored so a backtest can still finish. Yahoo HTML is not shown in the UI.
4. **One request, one result version.** `RESULT_VERSION` is `3` and includes the committee. Do not silently change the JSON shape.
5. **Docs match the npm version.** Help **What's new** and this spec's **Applies to** line track `package.json` `version` (currently **0.0.7**).

## 6. Non-goals

- Live quotes, paper trading, or broker execution
- Short selling, options, leverage, or multi-leg portfolios
- Minute/tick bars, after-hours, or corporate-action specialist handling
- User accounts, cloud sync of run history, or a mobile-native app
- Internationalisation (UI strings are English)

## 7. Version history at a glance

Full changelogs are in [`CHANGELOG.md`](../CHANGELOG.md). User-facing copy is [`docs/whats-new.md`](../docs/whats-new.md). Help and this specification are versioned **with the app**, not as a separate document series.

| Version | What changed |
|---|---|
| v0.0.7 | **Stored prices finish the run.** Blob/local bars are used when Yahoo is limited; amber stored-range notice; Run does not refresh screeners first; Results stay visible if history save hits quota. In-app Help and Functional Specification. |
| v0.0.6 | **Blob-first prices.** Covering `price-database/` skips local files and downloads. Setup **Price database** summary (`GET /api/prices/:ticker`). Production Blob store. |
| v0.0.5 | Shared Blob `price-database/{SYMBOL}.json`; History Load uploads OHLC; denser phone/desktop dashboard. |
| v0.0.4 | Click committee card to drive the run; sort; `npm run dev`; Blob persistence for caches; drop unused `feeds` module; in-flight run race fixed. |
| v0.0.3 | Indicator committee (`version: 3`); 15 more strategies; Yahoo/Stooq/crypto fallbacks; ape home icon. |
| v0.0.2 | Persistent daily bars + `/api/prices/sync`; ETF split; Stochastic / momentum / Williams %R; Vercel `/tmp` writes; null-close drop. |
| v0.0.1 | First numbered release: engine, UI, sweep, walk-forward, universes, Vercel Services (`version: 2` result payload before committee). |

## 8. Next

- How the pieces fit together → [Architecture](02-architecture.md)
- What happens on Run → [Runtime flows](03-runtime-flows.md)
