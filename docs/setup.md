# Setup

Everything in the left column (or the Setup tab) is the backtest request.

## Universe

| Control | Meaning |
| --- | --- |
| **Stocks** | Live top 50 S&P 500 and Nasdaq by market cap, plus three ETF lists (stock, bond, other) by AUM |
| **Crypto** | Live top 50 by market cap (Yahoo `-USD`) |
| **Any symbol** | Skip the ranked list and send whatever ticker you type (Yahoo-style: `AAPL`, `BTC-USD`) |

Lists refresh from the server about every 6 hours. If the live fetch fails, a cached snapshot is still usable.

## Price database

The card under the ticker is a read-only summary from `GET /api/prices/:ticker`:

- **Layer** — Blob, local file, or empty
- **Bars / range / updated / source** — what is already stored

Run, sweep, and walk-forward still resolve bars in this order: Blob → local → download only the gap. A covering Blob object does not hit disk or the feeds.

## Capital and size

| Field | Default | Notes |
| --- | --- | --- |
| Starting capital | 10,000 | Positive number |
| Trade % | 20 | 1–100. Each BUY spends this fraction |
| Sizing | `% of starting capital` | Or `% of equity` so later entries scale with the book |

There are **no shorts**. A SELL closes the oldest open lot (FIFO). Open lots are marked at the last close and tagged `eod` in the blotter.

## Dates

Timeframe is **1Y**, **3Y**, **5Y**, or **Custom** (`YYYY-MM-DD` start and end). The engine fetches extra bars **before** the window so indicators are warm. The test itself starts on the first session inside the window.

## Costs (folded)

| Field | Unit |
| --- | --- |
| Commission | basis points of notional **and** dollars per share |
| Slippage | basis points of the fill (worse for you on both sides) |

Zero means frictionless fills at the next open.

## Run

**Run** is disabled while a request is in flight, the ticker is invalid, or a parameter fails validation. On a phone the same submit lives on the bottom bar.
