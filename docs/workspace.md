# Workspace

The shell is a two-column dashboard on a wide screen and two tabs on a phone.

## Header

- Ape icon returns to `/`
- **Apestock** plus the running version (`v0.0.6`)
- **?** opens this Help
- **`{ }`** opens the Functional Specification (developer manual)

On a phone, Help and the spec are full-screen overlays. **Esc** closes them.

## Setup column

Ticker, price-database summary, strategy form, and folded **Research** (sweep / walk-forward). Errors land at the top of this column and take focus so a screen reader finds them.

## Results column

Metrics, charts, committee, blotter, then **History**. If you change a setup field after a run, the results dim and a stale hint appears until you run again.

## Phone bar

A fixed bottom bar holds **Run** on Setup, a one-line summary on Results, and **Setup / Results** tabs. It sits above the home indicator.

## Deep links

The address bar holds the current setup (`ticker`, `strategy`, params, dates, costs). Copy the URL to share a configuration. Clicking a committee card updates the URL to that strategy. History is **not** in the URL; it stays in `localStorage`.

## Keyboard

| Shortcut | Action |
| --- | --- |
| `?` | Open Help (ignored while typing in a field) |
| `Ctrl+/` / `⌘/` | Open Help |
| `Ctrl+Shift+E` / `⌘Shift+E` | Open Functional Specification |
| `Esc` | Close Help or Functional Specification |

## Data that stays here

| What | Where |
| --- | --- |
| Last 12 runs | `localStorage` key `apestock.runs.v1` |
| Ranked universe snapshot | browser storage, reused for 6 hours |
| Daily prices | server: Vercel Blob `price-database/`, then `data/prices/`, then a download |
