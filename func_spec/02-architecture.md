# Architecture

> Workspaces, process boundaries, and which modules are allowed to import which.

---

## 1. Two services

npm workspaces at the repo root:

| Package | Directory | Runtime |
|---|---|---|
| `apestock` (root) | `.` | Orchestrates `dev`, `test`, `typecheck` |
| `apestock-backend` | `backend/` | Node 22, Express, `tsx` |
| `frontend` | `frontend/` | Vite 8, React 19, Tailwind 4, Recharts |

[`vercel.json`](../vercel.json) maps:

- `frontend` → `/`
- `backend` (`src/app.ts`) → `/api/*`

The browser only calls same-origin `/api`. Vite proxies `/api` to `http://localhost:3001` in development.

## 2. Backend layers

```
app.ts                # cors, json 2mb, routes, 500 handler
  controllers/        # HTTP in/out only
    engine/           # parse, signals, fills, metrics, committee, research
    services/         # prices, universe, Blob/disk, Yahoo client
    data/universe.ts  # static membership helpers used with live lists
    lib/              # dates (UTC), math
```

Rules:

- **Controllers** do not compute signals.
- **Engine** does not read Blob or Yahoo; it receives `OhlcBar[]`.
- **Services** do not import React or frontend types.
- Shared shapes live in [`backend/src/types.ts`](../backend/src/types.ts). The frontend duplicates the consumer-facing subset in [`frontend/src/types.ts`](../frontend/src/types.ts). Keep those two in agreement when you change a payload.

## 3. Frontend layers

```
App.tsx               # state, effects, header, overlays, pane switch
  components/         # presentational + small local state (sort, zoom)
  lib/                # fetch wrappers, URL, history, validation, format
  data/universes.ts   # client snapshot of ranked lists
  docs/               # catalogs that glob markdown at repo root
```

There is **no** Zustand/Redux. `App.tsx` holds the run. Children receive props.

`frontend/src/docs/*.ts` glob `../../../docs/*.md` and `../../../func_spec/*.md`. Vite `server.fs.allow` includes the repo root so those files are readable in dev.

## 4. Dependency direction

```
UI  →  /api  →  controllers  →  execute/research  →  engine
                                      ↓
                                 dataService  →  priceStore / priceProviders
                                      ↓
                                 universeService
```

`technicalindicators` is used from `signals.ts` for some series; custom series live in `indicators.ts`. Do not call Yahoo from the engine.

## 5. Deploy and env

| Name | Role |
|---|---|
| `BLOB_READ_WRITE_TOKEN` (or OIDC + `BLOB_STORE_ID`) | Shared `price-database/` and universe snapshot |
| `STOOQ_API_KEY` | Optional; send if Stooq starts requiring it |
| `PRICE_CACHE_DIR` | Override local price directory |

Without Blob, Vercel still serves the app; each isolate forgets prices on cold start except `/tmp` for that instance.

Node engine on Vercel is **22.x** (root `package.json` `engines`).

## 6. Next

- Sequence of a Run → [Runtime flows](03-runtime-flows.md)
- Fill model → [Engine](04-engine.md)
