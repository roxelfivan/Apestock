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

## Deploy on Vercel (frontend + API together)

Vercel is not a long-running Node host. This repo is set up as **one Vercel project**:

- **Frontend** — Vite builds to `frontend/dist` and is served as static files
- **Backend** — `POST /api/backtest` and `GET /api/health` are serverless functions in [`api/`](api/) that call the same TypeScript engine as local Express

The UI already calls `/api/backtest` (same origin). Locally Vite proxies that to Express; on Vercel the `/api/*` functions handle it.

### Steps

1. Push this repo to GitHub (already done if you are on the PR branch).
2. In [Vercel](https://vercel.com) → **Add New** → **Project** → import `Apestock`.
3. Leave **Root Directory** as the repository root (do not set it to `frontend`).
4. Framework Preset: **Other** (this repo ships [`vercel.json`](vercel.json)).
5. Node.js version **22.x** (Hobby is fine; a 3Y backtest is typically under 1s).
6. Deploy. No env vars are required (Yahoo Finance is unauthenticated).

[`vercel.json`](vercel.json) installs backend + frontend deps, builds the Vite app, and maps `api/backtest.ts` → `/api/backtest`.

```bash
npm i -g vercel
vercel
```

After deploy, open `https://<your-app>.vercel.app` and run a backtest. Check `https://<your-app>.vercel.app/api/health`.

### What not to do

- Do not create two Vercel projects (one for `frontend`, one for `backend`) unless you also set a public API URL and CORS. The current UI has no `VITE_API_URL`; it expects same-origin `/api`.
- Do not set the Vercel root directory to `frontend/` — the serverless functions would be left out.

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
