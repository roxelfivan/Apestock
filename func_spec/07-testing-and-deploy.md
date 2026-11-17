# Testing & deploy

---

## 1. Scripts

Root:

| Script | What |
|---|---|
| `npm run dev` | concurrently backend + frontend |
| `npm run dev:backend` / `dev:frontend` | one process |
| `npm test` | `backend` `node:test` (`*.test.ts` via tsx) |
| `npm run typecheck` | both workspaces `tsc --noEmit` |
| `npm run build` | frontend Vite production build |
| `npm run check:docs` | [`scripts/check-docs.mjs`](../scripts/check-docs.mjs) |

Backend tests cover engine, committee, stance, dates, errors, OHLC parse, price providers/store. There is no frontend unit suite; Help/spec are verified with `check:docs` plus a manual overlay pass.

## 2. Docs check

`check:docs` walks `docs/*.md` and `func_spec/*.md`:

- No stray control characters (so grep does not treat files as binary)
- Relative markdown links resolve
- `#anchors` match GitHub-style slugs (same algorithm as `FuncSpecDocs` `slugify`)

## 3. Vercel

Two services in [`vercel.json`](../vercel.json). Rewrites: `/api/(.*)` → backend, everything else → frontend.

Create a **Blob** store on the project. The platform injects the token. Optional `STOOQ_API_KEY`.

Frontend build must be allowed to read `../docs` and `../func_spec` (Vite `fs.allow` / glob from `frontend/src/docs`). If a future Vite tightens the sandbox, copy or alias those directories rather than duplicating content.

## 4. Threat model (honest)

| Risk | Mitigation |
|---|---|
| User types an arbitrary ticker | Yahoo/crypto venues only; no SSRF to user URLs |
| Huge JSON on `/api/prices/sync` | Express `json` limit 2mb |
| Yahoo HTML in UI | `sanitizeUserError` on the client; providers throw `DataError` |
| Blob token | Server env only; never `VITE_*` |

This is not a multi-tenant product. Run history never leaves the browser unless the user copies a URL (config only) or you inspect `localStorage`.

## 5. Next

- Recipes → [Maintenance guide](08-maintenance-guide.md)
