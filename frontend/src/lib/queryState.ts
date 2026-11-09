import { ALL_STRATEGIES, DEFAULT_PARAMS } from "./defaults";
import type { AssetType, BacktestConfig, SizingMode, StrategyName, Timeframe } from "../types";

const STRATEGIES = new Set<StrategyName>(ALL_STRATEGIES);

function num(value: string | null, fallback: number): number {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function configFromSearch(search: string): Partial<BacktestConfig> {
  const q = new URLSearchParams(search);
  const strategy = q.get("strategy") as StrategyName | null;
  const next: Partial<BacktestConfig> = {};
  if (q.get("ticker")) next.ticker = q.get("ticker")!.toUpperCase();
  if (q.get("assetType") === "STOCK" || q.get("assetType") === "CRYPTO") {
    next.assetType = q.get("assetType") as AssetType;
  }
  if (strategy && STRATEGIES.has(strategy)) {
    next.strategy = strategy;
    next.params = { ...DEFAULT_PARAMS[strategy] };
  }
  const reserved = new Set([
    "ticker",
    "assetType",
    "strategy",
    "capital",
    "tradePercent",
    "timeframe",
    "startDate",
    "endDate",
    "commissionBps",
    "commissionPerShare",
    "slippageBps",
    "sizingMode",
    "allowAny",
  ]);
  if (next.strategy) {
    for (const [key, value] of q.entries()) {
      if (reserved.has(key) || value === "") continue;
      next.params = { ...next.params, [key]: num(value, 0) };
    }
  }
  if (q.get("capital")) next.startingCapital = num(q.get("capital"), 10_000);
  if (q.get("tradePercent")) next.tradePercent = num(q.get("tradePercent"), 20);
  if (["1Y", "3Y", "5Y", "CUSTOM"].includes(q.get("timeframe") ?? "")) {
    next.timeframe = q.get("timeframe") as Timeframe;
  }
  if (q.get("startDate")) next.startDate = q.get("startDate")!;
  if (q.get("endDate")) next.endDate = q.get("endDate")!;
  if (q.get("commissionBps")) next.commissionBps = num(q.get("commissionBps"), 0);
  if (q.get("commissionPerShare")) next.commissionPerShare = num(q.get("commissionPerShare"), 0);
  if (q.get("slippageBps")) next.slippageBps = num(q.get("slippageBps"), 0);
  if (q.get("sizingMode") === "percent_of_equity" || q.get("sizingMode") === "fixed_from_start") {
    next.sizingMode = q.get("sizingMode") as SizingMode;
  }
  if (q.get("allowAny") === "1") next.allowAnySymbol = true;
  return next;
}

export function searchFromConfig(config: BacktestConfig): string {
  const q = new URLSearchParams();
  q.set("ticker", config.ticker);
  q.set("assetType", config.assetType);
  q.set("strategy", config.strategy);
  for (const [key, value] of Object.entries(config.params)) {
    if (value != null) q.set(key, String(value));
  }
  q.set("capital", String(config.startingCapital));
  q.set("tradePercent", String(config.tradePercent));
  q.set("timeframe", config.timeframe);
  if (config.timeframe === "CUSTOM") {
    q.set("startDate", config.startDate);
    q.set("endDate", config.endDate);
  }
  if (config.commissionBps) q.set("commissionBps", String(config.commissionBps));
  if (config.commissionPerShare) q.set("commissionPerShare", String(config.commissionPerShare));
  if (config.slippageBps) q.set("slippageBps", String(config.slippageBps));
  if (config.sizingMode !== "fixed_from_start") q.set("sizingMode", config.sizingMode);
  if (config.allowAnySymbol) q.set("allowAny", "1");
  return `?${q.toString()}`;
}
