# Getting started

You need a ticker, a rule, and a date window. Everything else has a default.

## 1. Open the app

Locally: from the repo root run `npm install` then `npm run dev`. The UI is at `http://localhost:5173` and talks to the backend on port 3001 through `/api`.

On Vercel the same UI is at `/` and `/api` is the Express service.

## 2. Pick a market and a symbol

**Stocks** uses ranked US names and ETFs. **Crypto** uses Yahoo `-USD` pairs. Type in the box to filter the live top-50 lists, or tick **any symbol** to try a ticker that is not on the list.

A **Price database** card under the picker shows whether this symbol already has stored daily bars (Blob, local file, or neither).

## 3. Pick a rule

The default is **SMA crossover** (50 / 200). Change the group and the strategy, then the parameter fields. Invalid combinations (short period ≥ long period, and so on) block **Run**.

## 4. Run

Click **Run** (or the sticky button on a phone). Setup switches to Results on small screens. The first run for a symbol may take a few seconds while daily bars download; later runs reuse the price database.

You should see:

- Headline return, Sharpe, max drawdown, and extra metrics behind a disclosure
- Equity vs a full-capital buy-and-hold on the same window
- Price chart with the strategy overlay and T+1 fill triangles
- Drawdown, monthly grid, committee, blotter

## 5. Next

- [Setup](setup.md) — capital, size, costs, custom dates
- [Committee](committee.md) — click another rule without retyping the form
- [History](history.md) — reload a run from this browser
