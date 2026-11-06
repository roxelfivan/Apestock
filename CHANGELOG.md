# Changelog

All notable changes to this project are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

When you cut a release, add a new `## [X.Y.Z] - YYYY-MM-DD` section at the top
(under [Unreleased] if you used that heading) and bump `version` in the root
`package.json`, `backend/package.json`, `frontend/package.json`, and
`package-lock.json`.

## [Unreleased]

### Fixed

- Sweep and walk-forward errors no longer dump Yahoo HTML timeout pages into the UI

### Added

- Stochastic, time-series momentum, and Williams %R strategies
- Gorilla app icon (favicon, Apple touch icon, PWA icons) and header brand mark
- Header badge showing the frontend package version
- Live top-50 S&P, Nasdaq, US ETF, and crypto lists for the asset selector
  (6-hour server cache, last-good snapshot in `localStorage`)

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

[Unreleased]: https://github.com/roxelfivan/Apestock/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/roxelfivan/Apestock/releases/tag/v0.0.1
