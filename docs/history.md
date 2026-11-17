# History

The last **12** successful runs in **this browser** sit at the bottom of Results.

## What is stored

Each row keeps the full setup and the result payload (equity, trades, bars, committee). The key is `apestock.runs.v1` in `localStorage`. Another device, a private window, or clearing site data will not see them.

## Load

**Load** restores the form, charts, and URL from that run. It also POSTs the saved OHLC to `/api/prices/sync` so missing dates can merge into the shared Blob folder. A market gap is fetched only if that folder is still behind.

## Compare

Pick a run to overlay its metrics on the current result. Compare does not change the charts' primary series; it is a second column of numbers.

## What is not stored

Sweep and walk-forward tables are not persisted. Ranked universe lists have their own 6-hour snapshot, separate from History.
