# Apestock user guide

Apestock is a **daily (end-of-day) stock and crypto backtester**. You pick a ticker and a rule, run it on historical daily bars, and inspect the trades, charts, and an indicator committee.

This guide is for people using the app. It covers every pane and everyday task.

**In the app:** click **?** in the header (or press `Ctrl+/` / `⌘/` or `?`) to open these same pages. Developers: click **`{ }`** (or `Ctrl+Shift+E` / `⌘Shift+E`) for the Functional Specification.

**Applies to:** v0.0.7 (see [What's new](whats-new.md)).

## What you can do

- Backtest ranked US stocks, ETFs, and crypto, or type any Yahoo-style symbol
- Run 25 logics: moving averages, oscillators, channels, plus buy-and-hold
- See equity vs buy-and-hold, drawdown, monthly returns, and a FIFO trade blotter
- Read the **indicator committee**: every technical rule votes buy, sell, or hold from its current zone
- Click a committee card to switch the whole run to that strategy
- Sweep a small parameter grid or run expanding-window walk-forward
- Reload a saved run from this browser (last 12 runs)

## Start here

1. [What's new](whats-new.md) — current release (v0.0.7: stored prices when Yahoo is limited)
2. [Getting started](getting-started.md) — first run
3. [Workspace](workspace.md) — layout, Help, deep links
4. [Setup](setup.md) — ticker, universe, capital, costs, dates
5. [Strategies](strategies.md) — the 25 rules
6. [Results](results.md) — charts, metrics, blotter
7. [Committee](committee.md) — votes, ranking, click-to-switch
8. [Research](research.md) — sweep and walk-forward
9. [History](history.md) — saved runs in this browser
10. [Troubleshooting](troubleshooting.md)

## How Apestock is different

There is **no account**. Setup lives in the URL; run history lives in **this browser**. Closing the tab keeps history; clearing site data does not.

Prices are **daily OHLC**. Signals fire on the **close**; orders fill at the **next session's open**. The engine is long-only (no shorts).
