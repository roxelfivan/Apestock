# Engine

> Signals, fills, sizing, committee votes. The parts most likely to be "fixed" incorrectly.

---

## 1. Time

All session dates are `YYYY-MM-DD` interpreted as UTC days (`backend/src/lib/dates.ts`). `latestCompleteSession` is used so today's incomplete Yahoo bar is not treated as EOD.

`warmupBars(strategy, params)` is the lookback needed for that rule. `execute` fetches from `fetchStart = startDate - warmup` (and at least the committee warmup). `runEngine(..., { startIndex })` begins accounting at the first bar with `date >= testStart`. If the bar *before* `startIndex` was a BUY/SELL, that signal is already `pending` for the first test open.

## 2. Signals

[`computeSignals`](../backend/src/engine/signals.ts) returns one `Signal` per bar: `"BUY" | "SELL" | "HOLD"`. Crosses use `crossedUp` / `crossedDown` (strict inequality after equality or the opposite side). BUY_HOLD emits a single BUY on the first eligible bar.

Do not emit fills here. A signal on index `i` is eligible for the open of `i+1`.

## 3. Fills (`runEngine`)

[`engine.ts`](../backend/src/engine/engine.ts):

| Rule | Behaviour |
|---|---|
| Side | Long-only. SELL with no lots is a no-op |
| Fill price | Next bar **open**, plus slippage: buy `open * (1 + bps/1e4)`, sell `open * (1 - bps/1e4)` |
| Commission | `shares * commissionPerShare + notional * commissionBps/1e4`, paid on both sides |
| BUY size | `tradePercent` of **starting capital** or of marked equity (`percent_of_equity`), capped by cash |
| SELL | Close **oldest** lot (FIFO), full lot |
| EOD | Remaining lots marked at last **close**; blotter reason `eod` |
| Benchmark | `startingCapital / firstOpen` shares held the whole test |

`pending` holds the last non-HOLD signal until the next bar's open is processed, then that day's close can set a new pending.

## 4. Committee

[`committee.ts`](../backend/src/engine/committee.ts) runs every `COMMITTEE_STRATEGIES` member (all technical names; not BUY_HOLD) with `DEFAULT_STRATEGY_PARAMS`.

Each member:

1. `computeSignals` + `runEngine` on the **same** test window → return, Sharpe, trades.
2. `regimeVote` in [`stance.ts`](../backend/src/engine/stance.ts) on the last index → `vote` + `voteReason`.

`regimeVote` is **not** the last BUY/SELL. Oscillators hold between thresholds; MAs hold inside a 0.2% deadband; ADX holds below 20; price-vs-MA holds inside 0.3%, and so on.

Majority: highest count among ready members; ties → HOLD.

Sharpe-weighted: skip HOLD; weight BUY/SELL by `max(sharpe, 0.1)`.

## 5. Metrics

[`metrics.ts`](../backend/src/engine/metrics.ts) consumes the equity curve and closed trades. Sharpe uses daily returns vs 0 (no risk-free). Monthly returns are calendar buckets on the strategy equity.

## 6. Next

- Bars into the engine → [Prices & universe](05-prices-and-universe.md)
- JSON field list → [Glossary](09-glossary.md)
