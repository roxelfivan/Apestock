# Results

After a successful run the right column (Results tab on a phone) is the whole story for that ticker, rule, and window.

## Metrics

Headline figures include total return, CAGR, Sharpe, max drawdown, and win rate. Extra ratios (Sortino, Calmar, profit factor, time in market, consecutive losses) sit behind a disclosure. A compare run from History overlays the same metrics.

If you edit Setup after a run, the panel dims until you click **Run** again.

## Equity

The equity curve is the strategy book (cash + marked lots) versus a **full-capital buy-and-hold** on the same first open. Hover a point for date and values. Wheel or pinch zooms. Fill markers sit on the strategy line.

Partial size (the default 20%) will not hug the buy-and-hold dollar scale — that is expected.

## Price

OHLC plus the indicators for **this** strategy. Triangles are T+1 open fills. They are not committee votes.

## Drawdown and months

Drawdown is peak-to-trough on the strategy equity. The monthly grid is calendar-month strategy return.

## Blotter

Each closed lot is a row (or a card on a phone): entry, exit, prices, quantity, P/L, hold days, and reason (`signal` or `eod` for lots still open at the last bar, marked at that close). Export CSV from the table when you need a spreadsheet.

## Empty and error states

No result yet: the metrics card tells you to run. A 400 from a missing ticker or a data gap shows in Setup as a short error, not a stack trace.
