# Changelog

All notable changes to this project are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

When you cut a release, add a new `## [X.Y.Z] - YYYY-MM-DD` section at the top
(under [Unreleased] if you used that heading) and bump `version` in the root
`package.json`, `backend/package.json`, `frontend/package.json`, and
`package-lock.json`.

## [Unreleased]

### Removed

- Unused parallel price-feed module (`backend/src/services/feeds`) left over from the
  quota-cut work; daily bars still come from `priceProviders.ts`

### Changed

- Price and universe caches persist on Vercel Blob when `BLOB_READ_WRITE_TOKEN`
  is set, so cold starts reuse completed daily bars instead of re-hitting feeds
- The UI no longer syncs prices or refreshes the universe on every page load;
  ranked lists reuse a 6-hour local snapshot, and prices sync on Run / research

## [0.0.3] - 2026-11-10

Indicator committee, a larger strategy set, zone-based Hold votes, and free
price fallbacks when Yahoo hits a quota.

### Added

- Indicator committee on each backtest: every technical rule votes buy, sell,
  or hold from its current zone, with the same-window return, Sharpe, win rate,
  and trade count next to the vote
- 15 more technical strategies (25 logics total): WMA, Hull MA, Stochastic RSI,
  PPO, TRIX, CCI, Ultimate oscillator, Awesome oscillator, ROC, ADX/DMI, Aroon,
  Supertrend, Parabolic SAR, Ichimoku TK cross, and Keltner channels
- Daily prices fall back across free sources: Yahoo library, Yahoo public chart,
  Stooq, and for crypto Coinbase, Binance.US, and Kraken
- Ape icon in the header links to the Apestock home page (`/`)

## [0.0.2] - 2026-11-06

Daily-bar persistence, live ETF split, extra strategies, and Yahoo last-bar cleanup.

### Added

- Stochastic, time-series momentum, and Williams %R strategies
- Persist daily OHLC per symbol and refresh only through the latest completed
  session (`POST /api/prices/sync` on app open)
- Split US ETFs into top 50 stock, top 50 bond, and top 50 other (non-stock /
  non-bond) lists

### Fixed

- Sweep and walk-forward errors no longer dump Yahoo HTML timeout pages into the UI
- Price writes on Vercel/Lambda go to `/tmp` plus memory so `/var/task` ENOENT
  does not fail a backtest
- Drop Yahoo daily bars whose close is still `null` (or already cached as `0`)
  so the last plotted price cannot crash to zero

## [0.0.1] - 2026-11-06

First numbered release of Apestock: a daily (EOD) stock and crypto backtester
with a Node.js engine and a React UI.

### Added

- Daily backtest engine with long-only strategies: MA/EMA crossover, RSI, MACD,
  Bollinger, Donchian, and buy-and-hold
- Signal on day T close, fill on day T+1 open, indicator warmup before the
  test window, and FIFO lot accounting (partial size via `tradePercent`)
- Optional commission (bps and $ / share), slippage (bps), and sizing as a
  percent of starting capital or of equity
- Trade blotter, OHLC + indicator series, equity and drawdown charts, and
  risk metrics (`version: 2` result payload)
- Parameter sweep and expanding-window walk-forward research endpoints
- Stock universe: top 50 S&P 500, top 50 Nasdaq, top 50 US ETFs by AUM;
  crypto: top 50 by market cap (Yahoo `-USD`); optional open Yahoo symbol
- React UI: strategy form with validation, asset combobox, run history,
  deep-linkable query state, CSV export, monthly return grid
- Equity chart fill markers, hover tooltip, and wheel/pinch zoom
- `POST /api/backtest`, `POST /api/backtest/sweep`,
  `POST /api/backtest/walk-forward`, `GET /api/universe`, `GET /api/health`
- In-memory Yahoo daily-bar cache (6 hours) with request coalescing
- npm workspaces, TypeScript throughout, and Vercel Services deploy
  (Vite frontend at `/`, Express backend at `/api/*`)

### Fixed

- Yahoo `historical()` failures on mixed-null OHLC rows by fetching via
  `chart()` and dropping incomplete days
- Equity chart axis/overlay scale so a partial-size strategy is not flattened
  against full-capital buy-and-hold dollars
- Hover tooltip restoring date, strategy return, and benchmark from the
  hovered point

[Unreleased]: https://github.com/roxelfivan/Apestock/compare/v0.0.3...HEAD
[0.0.3]: https://github.com/roxelfivan/Apestock/releases/tag/v0.0.3
[0.0.2]: https://github.com/roxelfivan/Apestock/releases/tag/v0.0.2
[0.0.1]: https://github.com/roxelfivan/Apestock/releases/tag/v0.0.1
