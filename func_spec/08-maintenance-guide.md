# Maintenance guide

> Recipes, conventions, invariants, and the release checklist. Update this when you add a strategy or an HTTP route.

---

## 1. Conventions

- Backend is ESM `.js` specifiers in TypeScript (`from "./engine.js"`).
- Frontend is `verbatimModuleSyntax`; type-only imports use `import type`.
- Dates: UTC `YYYY-MM-DD` only. Do not parse with `new Date("2024-01-01")` in local TZ for session math — use `lib/dates.ts`.
- Comments in code explain *why* (Yahoo null close, runId race), not *what*.

## 2. Where does X live?

| I want to… | Touch | Also check |
|---|---|---|
| Add a strategy | `types.ts` (both), `engine/defaults.ts`, `signals.ts`, `stance.ts` (vote), `frontend/lib/defaults.ts`, form fields in `StrategyForm.tsx` | Committee list excludes BUY_HOLD; add a sweep grid in `research.ts` only if you want one |
| Change fill/sizing | `engine/engine.ts` | Tests in `engine.test.ts`; Help [Setup](../docs/setup.md) |
| Change zone votes | `engine/stance.ts` | `stance.test.ts`; Help [Committee](../docs/committee.md) |
| Change price order | `dataService.ts` / `priceStore.ts` | This chapter + [Prices](05-prices-and-universe.md) |
| Add an HTTP route | `app.ts` + controller | `frontend/src/lib/api.ts` |
| Add a Help page | `docs/*.md` + `HELP_PAGES` | `npm run check:docs` |
| Add a spec page | `func_spec/NN-slug.md` + `FUNC_SPEC_PAGES` | Prefix with the next `NN-` |
| Cut a release | `package.json` ×3, lockfile, CHANGELOG, `docs/whats-new.md`, **Applies to** in `func_spec/README.md`, version table in `01-product-overview.md` | Tag `vX.Y.Z` |

## 3. Common tasks

### 3.1 Add a Help or spec page

| | Help | Functional Specification |
|---|---|---|
| File | `docs/slug.md` | `func_spec/NN-slug.md` |
| Register | `HELP_PAGES` | `FUNC_SPEC_PAGES` (+ `part`) |
| Verify | `npm run dev`, **?** | `npm run dev`, **`{ }`** |

### 3.2 Add a persisted result field

1. Extend `BacktestResult` in **both** `types.ts` files.
2. Set it in `buildResult`.
3. Bump `RESULT_VERSION` if old clients would misread the payload.
4. History already stores the whole result; old `localStorage` rows may lack the field — UI must tolerate that.

## 4. Invariants

| # | Invariant |
|---|---|
| 1 | Signals never fill on the same bar's close |
| 2 | Engine is long-only; SELL without lots is ignored |
| 3 | Committee vote ≠ last signal; `regimeVote` is the source |
| 4 | Covering Blob skips local and download |
| 5 | Blob/disk write errors must not 500 a backtest |
| 6 | `runIdRef` drops stale `executeBacktest` responses |
| 7 | Help **Applies to** / What's new current heading / npm version / spec **Applies to** are the same string |
| 8 | `RESULT_VERSION` (JSON) is not the npm version |

## 5. Release checklist

```bash
npm test
npm run typecheck
npm run check:docs
npm run build
```

Then:

1. Bump `version` in root, `backend/package.json`, `frontend/package.json`, and `package-lock.json`.
2. Add `## [X.Y.Z] - YYYY-MM-DD` at the top of [`CHANGELOG.md`](../CHANGELOG.md) (under Unreleased if used) and fix the compare links.
3. Prepend a section to [`docs/whats-new.md`](../docs/whats-new.md) (user voice, like ApEditor).
4. Set **Applies to** in [`func_spec/README.md`](README.md) and add a row to [Product overview §7](01-product-overview.md#7-version-history-at-a-glance).
5. Tag `vX.Y.Z`.

## 6. Next

- Field-by-field types → [Data types & glossary](09-glossary.md)
- Back to the index → [Functional Specification](README.md)
