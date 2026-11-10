# Apestock

Daily (EOD) stock and crypto backtester. Strategies run on a Node.js backend; the React UI configures the run, inspects trades, and charts the result.

Current version: **0.0.2**. See [CHANGELOG.md](CHANGELOG.md) for what changed in each release.

## Stack

- Frontend: React + TypeScript (Vite), Tailwind CSS, Recharts
- Backend: Node.js + TypeScript (Express, `tsx`, `yahoo-finance2`, `technicalindicators`)

## Universe

- US stocks: live top 50 S&P 500 and Nasdaq by market cap
- US ETFs: live top 50 stock ETFs, top 50 bond ETFs, and top 50 non-stock/non-bond ETFs (commodities, crypto ETFs, allocation) by AUM
- Crypto: live top 50 by market cap (Yahoo `-USD` pairs)
- Ranked lists are fetched from Yahoo (S&P membership from a public constituent file) and cached for 6 hours
- Optional open Yahoo symbol (`allowAnySymbol`)

## Price cache

Daily OHLC is saved per symbol and reused. Locally that is `data/prices/{SYMBOL}.json`; on Vercel/Lambda it uses `/tmp` plus in-memory storage because `/var/task` is read-only. Missing or newer bars are fetched in order from Yahoo's library, Yahoo's public daily chart, then **Stooq**. Crypto also tries **Coinbase**, **Binance.US**, and **Kraken** (no API keys). Yahoo's unofficial client is skipped after a quota or throttle. History is stored through the latest completed session (US cash close + 1 hour; crypto uses the prior UTC day). Opening the app syncs the selected ticker (`POST /api/prices/sync`). Disk write failures are ignored so a backtest still runs. Ranked universe lists still come from Yahoo.

## Strategies

Trend
- **MA_CROSSOVER** / **EMA_CROSSOVER** / **WMA_CROSSOVER** — short MA crosses long MA
- **HMA** — close crosses the Hull moving average
- **SUPERTREND** — ATR trailing stop flips long/short
- **PSAR** — Parabolic SAR flips below (buy) or above (sell) price
- **ICHIMOKU** — Tenkan crosses Kijun
- **ADX** — +DI crosses −DI
- **AROON** — Aroon Up crosses Aroon Down

Oscillators
- **RSI** / **STOCHASTIC** / **STOCH_RSI** / **WILLIAMS_R** / **CCI** / **ULTIMATE** — leave oversold (buy) or overbought (sell)
- **MACD** / **PPO** / **TRIX** / **ROC** — line crosses its signal
- **AWESOME** — median-price oscillator crosses zero
- **MOMENTUM** — N-day return flips from negative to positive (buy) or the reverse (sell)

Channels
- **BOLLINGER** / **KELTNER** — close reclaims the lower band; fades the upper band
- **DONCHIAN** — close breaks the prior N-day high/low

- **BUY_HOLD** — one full-capital buy on the first fill

After a run, the UI shows an **indicator committee**. Each technical rule (not buy-and-hold) votes from its **current zone**: buy or sell only at an extreme or established trend, **hold** in the middle (RSI between 30–70, close inside Bollinger/Keltner, ADX below 20, and so on). That vote is not a fill. Chart triangles are T+1 open fills of the strategy you ran. Majority is an unweighted count; Sharpe-weighted ignores hold and weights the rest by `max(Sharpe, 0.1)`.

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

The response includes equity, events, a trade blotter, OHLC + indicator series, drawdown, risk metrics, and an indicator committee (`version: 3`). The committee runs every technical strategy on the same window. Each member votes **buy**, **sell**, or **hold** from its current zone, and reports how that rule performed.

Also:

- `GET /api/health`
- `GET /api/universe?assetType=STOCK|CRYPTO`
- `POST /api/prices/sync` — `{ "ticker": "AAPL", "assetType": "STOCK" }` incremental EOD refresh
- `POST /api/backtest/sweep` — small parameter grid + overfitting warning
- `POST /api/backtest/walk-forward` — expanding-window in-sample pick, out-of-sample test

Missing tickers and data gaps return HTTP **400** with `{ "error": "..." }`.
