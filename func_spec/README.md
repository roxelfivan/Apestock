# Apestock — Functional Specification

> The developer-facing manual for this repository. It describes **what Apestock does, how it is built, and the contracts you must respect when you change it.**

**Applies to:** `v0.0.7` · package version **0.0.7**
**Audience:** engineers new to the repo, and anyone returning to it after a few months.

---

## About this document

This is *not* the user guide. The user guide lives in [`docs/`](../docs) and is what an end user reads; it ships inside the app behind the **?** button. This document is the engineering counterpart:

| | User guide | Functional Specification |
|---|---|---|
| Lives in | `docs/` | `func_spec/` |
| In-app button | **?** | **`{ }`** (next to **?**) |
| Hotkey | `⌘/Ctrl + /` or `?` | `⌘/Ctrl + Shift + E` |
| Catalog | `frontend/src/docs/catalog.ts` | `frontend/src/docs/funcSpecCatalog.ts` |
| Viewer | `frontend/src/components/HelpDocs.tsx` | `frontend/src/components/FuncSpecDocs.tsx` |
| Answers | "How do I do X?" | "Where does X live and what must I not break?" |

Both sets of markdown files are loaded into the frontend bundle with `import.meta.glob(..., { query: '?raw' })`, so **editing a file and reloading the app is enough** — there is no separate build step for docs.

### How to read it

- **New to the repo?** Read [Part I](02-architecture.md) end to end, then skim [Maintenance](08-maintenance-guide.md).
- **Adding a feature?** Start at the "Where does X live?" table in [Maintenance](08-maintenance-guide.md#2-where-does-x-live).
- **Debugging prices or a fill?** [Runtime flows](03-runtime-flows.md) then [Prices & universe](05-prices-and-universe.md) or [Engine](04-engine.md).
- **Looking up a type?** [Data types & glossary](09-glossary.md).

### Conventions used here

- `file.ts` / `Component.tsx` — a real file, path relative to the repo root (or to `frontend/src/` / `backend/src/` where obvious).
- `symbolName` — a real exported or module-local identifier.
- `"literal"` — a string that exists verbatim in the source.
- Numbers such as `20` or `RESULT_VERSION = 3` are the real constants, not paraphrases.
- Tables are exhaustive unless they say "notable" or "key".

### Keeping this document honest

This spec describes the code as it is. When you change behaviour:

1. Update the affected chapter(s) in `func_spec/` in the same PR.
2. Update [`docs/whats-new.md`](../docs/whats-new.md) if a user can see the change.
3. Bump `version` in the root, `backend/`, and `frontend/` `package.json` files together with [CHANGELOG.md](../CHANGELOG.md) when you cut a release.
4. Keep **Applies to** on this page equal to `package.json` `version`.

---

## Table of contents

### Part I — Orientation

1. [Product overview](01-product-overview.md) — problem, users, capability list, non-goals, version table.
2. [Architecture](02-architecture.md) — workspaces, module map, deploy.
3. [Runtime flows](03-runtime-flows.md) — run, committee click, history load, sweep.

### Part II — Behaviour

4. [Engine](04-engine.md) — signals, T+1 fills, FIFO, committee votes.
5. [Prices & universe](05-prices-and-universe.md) — Blob / local / download, ranked lists.

### Part III — Reference

6. [API & UI contracts](06-api-and-ui.md) — HTTP, query string, localStorage.
7. [Testing & deploy](07-testing-and-deploy.md) — npm scripts, Vercel, Blob.
8. [Maintenance guide](08-maintenance-guide.md) — recipes, invariants, release checklist.
9. [Data types & glossary](09-glossary.md) — payloads and terms.

---

## Quick orientation: 60 seconds

1. **`backend/src/engine/` is the only place fills happen.** `runEngine` in [`engine.ts`](../backend/src/engine/engine.ts) is long-only, T+1 open, FIFO. See [Engine](04-engine.md).
2. **Daily bars resolve Blob → local → download.** [`dataService.ts`](../backend/src/services/dataService.ts). A covering Blob object skips disk and the feeds. See [Prices & universe](05-prices-and-universe.md).
3. **The React app is a form plus charts.** No global store. Config is the URL; history is `localStorage`. See [API & UI](06-api-and-ui.md).
4. **Committee votes are zones, not fills.** [`stance.ts`](../backend/src/engine/stance.ts) `regimeVote`. Chart triangles come from the selected strategy's `events`.
5. **Result payload `version` is 3** (`RESULT_VERSION` in [`execute.ts`](../backend/src/engine/execute.ts)), independent of the npm package version **0.0.7**.

## Repository shape

```
Apestock/
├── docs/                     # User guide → in-app Help (?)
├── func_spec/                # This document → in-app Functional Specification ({ })
├── frontend/                 # Vite + React + Tailwind
│   └── src/
│       ├── components/       # Charts, form, committee, history
│       ├── docs/             # Help + Func Spec catalogs
│       ├── lib/              # API client, URL, localStorage, validation
│       └── App.tsx           # Composition, hotkeys, overlays
├── backend/                  # Express + tsx
│   └── src/
│       ├── engine/           # Signals, fills, metrics, committee, research
│       ├── services/         # Prices, universe, Blob/disk
│       ├── controllers/      # HTTP handlers
│       └── app.ts            # Routes
├── vercel.json               # Two services: frontend `/`, backend `/api/*`
└── CHANGELOG.md              # Keep a Changelog (npm versions)
```

## Build and verify

```bash
npm install
npm run dev          # backend :3001 + frontend :5173
npm test             # backend node:test
npm run typecheck
npm run check:docs   # markdown links in docs/ and func_spec/
```
