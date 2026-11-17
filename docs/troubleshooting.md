# Troubleshooting

## Run fails with a short error about the ticker or dates

HTTP 400 means the engine refused the request: unknown ticker (unless **any symbol** is on), a parameter out of range, or a window with no complete daily bars. Fix the form; the message is the whole story.

## Charts stay empty / "Unable to run backtest"

The backend could not assemble OHLC. Check `/api/health`. Locally both processes must be up (`npm run dev`). On Vercel, a missing Blob store still runs but every cold start re-downloads; create a Blob store on the project.

## Last price looks like zero

Incomplete Yahoo rows (null close) are dropped. If an old cache file still has a `0` close, run again so the store rewrites complete bars only.

## Committee does not match the triangles

Triangles are T+1 fills of the **selected** strategy. Committee votes are **zone** readings on the last bar. A hold vote with a recent fill is normal.

## Clicking a committee card shows the old strategy

Wait for the in-flight run. A newer click wins; a slower older request is discarded. If the URL still disagrees, click the card again.

## Sweep / walk-forward shows a giant HTML page as the error

That was a Yahoo timeout leaking into the UI (fixed in v0.0.2). Current builds sanitize those failures to a short sentence.

## History is gone

It only lives in this browser. Clearing site data, another profile, or Safari ITP can drop `localStorage`.

## Phone: Run is behind the home indicator

The bottom bar pads with `env(safe-area-inset-bottom)`. Add to Home Screen / landscape still uses the same bar.

## Still stuck

The developer manual is **`{ }`** (Functional Specification). File an issue on [GitHub](https://github.com/roxelfivan/Apestock/issues) with the ticker, strategy, dates, and the exact error text.
