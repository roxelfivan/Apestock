# What's new

This page is the in-app changelog. It stays with the version in the header. Older releases are summarized at the bottom; the full developer changelog is [CHANGELOG.md](https://github.com/roxelfivan/Apestock/blob/main/CHANGELOG.md) on GitHub.

## v0.0.7 — Stored prices survive Yahoo limits

**A Blob file is enough to finish a run. Yahoo quota no longer blanks Results.**

- **Help and spec in the app.** `?` opens the user guide; `{ }` opens the Functional Specification. Both match this npm version.
- **Use the price database.** If `price-database/{SYMBOL}.json` already has bars, Run loads them instead of failing on Yahoo's unofficial feed.
- **Show the stored range.** An amber notice names ticker, bar count, and dates when live feeds are limited.
- **Results stay up.** Charts and analysis stay on the Results tab even if the phone cannot write run history.

No migration.

## v0.0.6 — Blob-first prices and a price-database summary

**The shared price folder is checked first. Setup shows what is already stored for the ticker.**

- **Blob before disk.** A covering Vercel Blob object in `price-database/` skips both local files and a download.
- **Price database card.** Path, layer (Blob / local), bar count, date range, updated time, and source for the selected ticker.
- **Production Blob store.** Deployed runs share daily bars across cold starts.

No migration.

## v0.0.5 — Shared price database and denser UI

**Loading a saved run can seed the shared folder. Phones and desktops use a tighter dashboard.**

- **Shared Blob folder** `price-database/{SYMBOL}.json` is written when bars are missing, so later runs skip Yahoo when the window is already stored.
- **History Load** uploads that run's OHLC into the folder, then only fetches a market gap if the shared database is still behind.
- **Denser layout.** Setup / Results panes on small screens, sticky run bar, folded costs and research, extra metrics behind a disclosure, charts before the committee, card blotter on phones.

## v0.0.4 — Click a committee card to drive the run

**Any indicator card can become the strategy you are looking at.**

- **Click a card** to switch the logic picker, equity curve, overlays, drawdown, monthly grid, blotter, and URL to that strategy.
- **Sort the committee** by vote, return, Sharpe, or trade count.
- **One terminal.** `npm run dev` starts backend and frontend together.

A slower in-flight run no longer overwrites a newer click.

## v0.0.3 — Indicator committee and more rules

**Every technical rule votes from its current zone. Fifteen extra strategies. Free price fallbacks when Yahoo is quiet.**

- Committee on each backtest: buy, sell, or **hold**, plus same-window return, Sharpe, win rate, and trade count.
- 25 logics total (WMA, Hull MA, Stoch RSI, PPO, TRIX, CCI, Ultimate, Awesome, ROC, ADX/DMI, Aroon, Supertrend, PSAR, Ichimoku TK, Keltner, and the original set).
- Daily prices fall back across Yahoo library, Yahoo public chart, Stooq, and for crypto Coinbase, Binance.US, and Kraken.

## v0.0.2 — Persistent daily bars and extra oscillators

**Prices stay on disk (or `/tmp` on Vercel) and refresh only through the latest completed session.**

- Stochastic, time-series momentum, and Williams %R.
- US ETFs split into stock, bond, and other top-50 lists.
- Yahoo HTML timeout pages no longer dump into the UI; last bars with a null close are dropped so the chart cannot crash to zero.

## v0.0.1 — First numbered release

**Daily-bar backtester: Node engine, React UI, Vercel Services deploy.**

- MA / EMA / RSI / MACD / Bollinger / Donchian / buy-and-hold.
- Signal on T close, fill on T+1 open, warmup, FIFO lots, optional costs and `% of equity`.
- Sweep and walk-forward research endpoints.
- Ranked universes, deep-linkable query state, CSV export, monthly grid.

---

## Earlier releases

- **v0.0.7** — Stored Blob bars finish a run when Yahoo is limited; Help and spec in-app.
- **v0.0.6** — Blob-first lookup; price-database summary.
- **v0.0.5** — Shared `price-database/`; denser phone/desktop UI.
- **v0.0.4** — Click committee to switch; sort; `npm run dev`.
- **v0.0.3** — Committee, 25 strategies, free feed fallbacks.
- **v0.0.2** — Persistent OHLC, ETF split, extra oscillators.
- **v0.0.1** — First numbered engine and UI.

Full developer notes: [CHANGELOG.md](https://github.com/roxelfivan/Apestock/blob/main/CHANGELOG.md).
