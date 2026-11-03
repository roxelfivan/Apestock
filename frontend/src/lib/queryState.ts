import { DEFAULT_PARAMS } from "./defaults";
import type { AssetType, BacktestConfig, SizingMode, StrategyName, Timeframe } from "../types";

const STRATEGIES = new Set<StrategyName>([
  "MA_CROSSOVER",
  "EMA_CROSSOVER",
  "RSI",
  "MACD",
  "BOLLINGER",
  "DONCHIAN",
  "BUY_HOLD",
]);

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
  if (q.get("shortPeriod")) next.params = { ...next.params, shortPeriod: num(q.get("shortPeriod"), 50) };
  if (q.get("longPeriod")) next.params = { ...next.params, longPeriod: num(q.get("longPeriod"), 200) };
  if (q.get("rsiPeriod")) next.params = { ...next.params, rsiPeriod: num(q.get("rsiPeriod"), 14) };
  if (q.get("oversold")) next.params = { ...next.params, oversold: num(q.get("oversold"), 30) };
  if (q.get("overbought")) next.params = { ...next.params, overbought: num(q.get("overbought"), 70) };
  if (q.get("fastPeriod")) next.params = { ...next.params, fastPeriod: num(q.get("fastPeriod"), 12) };
  if (q.get("slowPeriod")) next.params = { ...next.params, slowPeriod: num(q.get("slowPeriod"), 26) };
  if (q.get("signalPeriod")) next.params = { ...next.params, signalPeriod: num(q.get("signalPeriod"), 9) };
  if (q.get("bbPeriod")) next.params = { ...next.params, bbPeriod: num(q.get("bbPeriod"), 20) };
  if (q.get("bbStdDev")) next.params = { ...next.params, bbStdDev: num(q.get("bbStdDev"), 2) };
  if (q.get("donchianPeriod")) next.params = { ...next.params, donchianPeriod: num(q.get("donchianPeriod"), 20) };
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
