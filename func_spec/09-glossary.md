# Data types & glossary

> Shapes that cross the HTTP boundary, plus terms used in Help and this spec. Source of truth: [`backend/src/types.ts`](../backend/src/types.ts).

---

## 1. Enumerations

| Name | Values |
|---|---|
| `AssetType` | `STOCK`, `CRYPTO` |
| `StrategyName` | 25 literals in `ALL_STRATEGIES` |
| `Timeframe` | `1Y`, `3Y`, `5Y`, `CUSTOM` |
| `Signal` / `CommitteeVote` | `BUY`, `SELL`, `HOLD` |
| `SizingMode` | `fixed_from_start`, `percent_of_equity` |
| `TradeReason` | `signal`, `eod` |

## 2. `OhlcBar`

`date` (ISO day), `open`, `high`, `low`, `close`. No volume in the engine. `IndicatorBar` adds `indicators: Record<string, number | null>`.

## 3. `BacktestResult` (version 3)

Notable fields: `version`, `ticker`, `strategy`, `params`, capital/size/costs, `timeframe`, `startDate`/`endDate`/`testStartDate`, `missingSessions`, `fillModel`, `equityCurve`, `events`, `trades`, `bars`, `drawdown`, `metrics`, `committee`, optional `dataNotice`, `finalValue`.

`committee`: `asOf`, `majority`, `weighted`, vote counts, `members[]` (`strategy`, `label`, `params`, `selected`, `ready`, `vote`, `latestSignal`, `lastAction`, `lastActionDate`, `voteReason`, `lastValues`, return / drawdown / Sharpe / winRate / totalTrades).

## 4. Research

`SweepResult`: cells with params + metrics, plus a warning string.

`WalkForwardResult`: folds with in-sample pick and out-of-sample metrics, plus a warning string.

## 5. UI-only

`BacktestConfig` — form state / URL / history (mirrors the request).

`SavedRun` — `{ id, createdAt, config, result }`.

`PriceCacheSummary` — GET prices response for the Setup card.

## 6. Terms

| Term | Meaning |
|---|---|
| **Help** | User guide in `docs/`, overlay **?** |
| **Functional Specification** | This manual in `func_spec/`, overlay **`{ }`** |
| **npm version** | `package.json` `version` (0.0.6), shown in the header |
| **Result version** | `BacktestResult.version` (3) |
| **Zone vote** | `regimeVote` output; not a fill |
| **Price database** | Shared Blob folder `price-database/` plus local JSON |
| **Warmup** | Bars fetched before `testStartDate` so indicators exist |
| **T+1 open** | Fill model: signal on T close, trade on next session open |

## 7. Next

- Index → [Functional Specification](README.md)
- User changelog → [What's new](../docs/whats-new.md)
