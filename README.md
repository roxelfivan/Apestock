# Apestock

Daily (EOD) stock and crypto backtester. Strategies run on a Node.js backend; the React UI configures the run, inspects trades, and charts the result.

Current version: **0.0.1**. See [CHANGELOG.md](CHANGELOG.md) for what changed in each release.

## Stack

- Frontend: React + TypeScript (Vite), Tailwind CSS, Recharts
- Backend: Node.js + TypeScript (Express, `tsx`, `yahoo-finance2`, `technicalindicators`)

## Universe

- US stocks: live top 50 S&P 500 by market cap, top 50 Nasdaq by market cap, and top 50 US ETFs by AUM
- Crypto: live top 50 by market cap (Yahoo `-USD` pairs)
- Ranked lists are fetched from Yahoo (S&P membership from a public constituent file) and cached for 6 hours
- Optional open Yahoo symbol (`allowAnySymbol`)

## Strategies

- **MA_CROSSOVER** / **EMA_CROSSOVER** — short MA crosses long MA
- **RSI** — cross up through oversold; cross down through overbought
- **MACD** — MACD line crosses the signal line
- **BOLLINGER** — close reclaims the lower band; fades the upper band
- **DONCHIAN** — close breaks the prior N-day high/low
- **STOCHASTIC** — %K crosses up through oversold; down through overbought
- **MOMENTUM** — N-day return flips from negative to positive (buy) or the reverse (sell)
- **WILLIAMS_R** — %R crosses up through oversold (e.g. -80); down through overbought (e.g. -20)
- **BUY_HOLD** — one full-capital buy on the first fill

Signals are computed on day **T close**. Orders fill on day **T+1 open**. Extra bars are fetched before the test window so indicators are warm. Sizing is long-only (no shorts). Default sizing spends `tradePercent` of **starting** capital (20%); `% of equity` is optional. Optional commission (bps and $ / share) and slippage (bps of the fill). Each SELL closes the oldest lot (FIFO). Open lots are marked at the last close and tagged `eod` in the blotter.

## Run locally

From the repo root:

```bash
npm install
```

Then use two terminals.

```bash
npm start -w apestock-backend
```

Backend listens on `http://localhost:3001`.

```bash
npm run dev -w frontend
```

Frontend is on `http://localhost:5173` and proxies `/api` to the backend.

```bash
npm test
npm run typecheck
```

## Deploy on Vercel (one project, two services)

[`vercel.json`](vercel.json) defines a **Vercel Services** project:

| Service | Directory | Framework | Public path |
| --- | --- | --- | --- |
| `frontend` | `frontend/` | Vite | `/` (catch-all) |
| `backend` | `backend/` | Express (`src/app.ts`) | `/api/*` |

The browser calls same-origin `/api/backtest`. Vercel rewrites `/api/*` to the Express service.

## API

`POST /api/backtest`

```json
{
  "ticker": "AAPL",
  "assetType": "STOCK",
  "strategy": "MA_CROSSOVER",
  "params": { "shortPeriod": 50, "longPeriod": 200 },
  "startingCapital": 10000,
  "tradePercent": 20,
  "timeframe": "3Y",
  "sizingMode": "fixed_from_start",
  "commissionBps": 0,
  "commissionPerShare": 0,
  "slippageBps": 0,
  "allowAnySymbol": false
}
```

Timeframe is `1Y`, `3Y`, `5Y`, or `CUSTOM` (requires `startDate` and `endDate` as `YYYY-MM-DD`).

The response includes equity, events, a trade blotter, OHLC + indicator series, drawdown, and risk metrics (`version: 2`).

Also:

- `GET /api/health`
- `GET /api/universe?assetType=STOCK|CRYPTO`
- `POST /api/backtest/sweep` — small parameter grid + overfitting warning
- `POST /api/backtest/walk-forward` — expanding-window in-sample pick, out-of-sample test

Missing tickers and data gaps return HTTP **400** with `{ "error": "..." }`.
