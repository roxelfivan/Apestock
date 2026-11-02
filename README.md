# Apestock

MVP web app for daily (EOD) stock and crypto backtesting. Strategies run on a Node.js backend; the React UI only configures the run and charts the result.

## Stack

- Frontend: React (Vite), Tailwind CSS, Recharts
- Backend: Express, `yahoo-finance2`, `technicalindicators`

## Universe

- US stocks: S&P 100 (Yahoo symbols, e.g. `AAPL`, `BRK-B`)
- Crypto: top 50 by market cap (Yahoo `-USD` pairs, e.g. `BTC-USD`)

## Strategies

- **MA_CROSSOVER** — buy when the short SMA crosses above the long SMA; sell on a cross below
- **RSI** — buy when RSI crosses up through the oversold threshold; sell when it crosses down through overbought

Signals are computed on day **T close**. Orders fill on day **T+1 open**. Position sizing is all-in / all-out long only (no shorts).

## Run locally

Use two terminals.

```bash
cd backend
npm install
npm start
```

Backend listens on `http://localhost:3001`.

```bash
cd frontend
npm install
npm run dev
```

Frontend is on `http://localhost:5173` and proxies `/api` to the backend.

## API

`POST /api/backtest`

```json
{
  "ticker": "AAPL",
  "assetType": "STOCK",
  "strategy": "MA_CROSSOVER",
  "params": { "shortPeriod": 50, "longPeriod": 200 },
  "startingCapital": 10000,
  "timeframe": "3Y"
}
```

RSI example params: `{ "rsiPeriod": 14, "oversold": 30, "overbought": 70 }`. Timeframe is `1Y`, `3Y`, or `5Y`.

Missing tickers and data gaps return HTTP **400** with `{ "error": "..." }`.
