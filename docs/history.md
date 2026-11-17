# History

The last **12** successful runs in **this browser** sit at the bottom of Results.

## What is stored

Each row keeps the setup plus a slimmer result (equity, trades, OHLC without indicator columns, committee without last-value maps). The key is `apestock.runs.v1` in `localStorage`. If the browser quota is full, older rows are dropped; a failed save must not clear the charts you just ran. Another device, a private window, or clearing site data will not see them.

## Load

**Load** restores the form, charts, and URL from that run. It also POSTs the saved OHLC to `/api/prices/sync` so missing dates can merge into the shared Blob folder. A market gap is fetched only if that folder is still behind.

## Compare

Pick a run to overlay its metrics on the current result. Compare does not change the charts' primary series; it is a second column of numbers.

## What is not stored

Sweep and walk-forward tables are not persisted. Ranked universe lists have their own 6-hour snapshot, separate from History.
