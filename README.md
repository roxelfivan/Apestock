# Apestock

MVP web app for daily (EOD) stock and crypto backtesting. Strategies run on a Node.js backend; the React UI only configures the run and charts the result.

## Stack

- Frontend: React + TypeScript (Vite), Tailwind CSS, Recharts
- Backend: Node.js + TypeScript (Express, `tsx`, `yahoo-finance2`, `technicalindicators`)

## Universe

- US stocks: S&P 100 (Yahoo symbols, e.g. `AAPL`, `BRK-B`)
- Crypto: top 50 by market cap (Yahoo `-USD` pairs, e.g. `BTC-USD`)

## Strategies

- **MA_CROSSOVER** — buy when the short SMA crosses above the long SMA; sell on a cross below
- **RSI** — buy when RSI crosses up through the oversold threshold; sell when it crosses down through overbought

Signals are computed on day **T close**. Orders fill on day **T+1 open**. Position sizing is all-in / all-out long only (no shorts).

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

## Deploy on Vercel (one project, two services)

[`vercel.json`](vercel.json) defines a **Vercel Services** project:

| Service | Directory | Framework | Public path |
| --- | --- | --- | --- |
| `frontend` | `frontend/` | Vite | `/` (catch-all) |
| `backend` | `backend/` | Express (`src/app.ts`) | `/api/*` |

The browser calls same-origin `/api/backtest`. Vercel rewrites `/api/*` to the Express service (the service still sees `/api/backtest`). There is **no service binding**: the UI is a static SPA, so it cannot use runtime-injected URLs. Bindings are only for server-to-server calls.

### Steps

1. Import [Apestock](https://github.com/roxelfivan/Apestock) in [Vercel](https://vercel.com).
2. Branch: **`main`**. Root Directory: empty (repo root).
3. Node.js **22.x**. No env vars.
4. Do not set a custom Install Command.
5. Deploy.

Locally you can still run two terminals (`npm start -w apestock-backend` and `npm run dev -w frontend`), or run both services with:

```bash
npx vercel dev
```

After deploy: `https://<your-app>.vercel.app` and `https://<your-app>.vercel.app/api/health`.

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
