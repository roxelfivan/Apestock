# Committee

After a run, every **technical** strategy (not buy-and-hold) votes on the **same window and the same last bar**.

## What a vote is

A vote is the rule's **current zone**, not a fill:

- Oscillators **buy** only in oversold, **sell** only in overbought, **hold** in the middle (for example RSI 30–70)
- Trend rules **hold** when averages or price sit inside a small deadband
- ADX **holds** when ADX is below 20

The triangle on the price chart is still the strategy **you ran**. The committee does not place those orders.

## Majority and Sharpe-weighted

- **Majority** is an unweighted count of ready members. Ties (including a hold plurality) are **hold**.
- **Sharpe-weighted** ignores hold and weights buy/sell by `max(Sharpe, 0.1)` on the same window.

## Cards

Each card shows vote, latest reading, same-window return, Sharpe, win rate, and trade count. Sort by vote, return, Sharpe, or trades. A rank number sits on the card.

## Click to switch

Click a card to make that rule the active backtest. The form, charts, blotter, and URL update. A slower in-flight request cannot overwrite a newer click.

Use this to scan which zone-based vote actually traded well on the window you already paid to download.
