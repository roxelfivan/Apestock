# Research

Sweep and walk-forward sit under a disclosure in Setup. They reuse the same ticker, dates, costs, and sizing as **Run**.

## Sweep

A **small** parameter grid for the selected strategy (not every rule has a grid). Each cell is a full backtest on the same bars. The UI flags the best Sharpe / return and shows an **overfitting warning**: treat the winner as a hypothesis.

Typical grids (examples):

- SMA / EMA: short `{10,20,50}` × long `{50,100,200}` when short is below long
- RSI: period 14 × oversold `{20,25,30}` × overbought `{70,75,80}`
- Donchian: 20 / 55 / 100

If the strategy has no grid, the endpoint says so rather than inventing one.

## Walk-forward

Expanding-window in-sample pick, then an out-of-sample test on the next fold. A strong in-sample Sharpe that dies out of sample is the useful result. The response still carries a warning that the grid, fold count, and costs leak assumptions.

## Cost

Both calls refresh prices the same way as Run (Blob → local → gap download) and then run many engines in one request. They can take longer than a single backtest.
