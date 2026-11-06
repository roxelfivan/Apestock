import type {
  ApiError,
  BacktestConfig,
  BacktestResult,
  SweepResult,
  UniverseSnapshot,
  WalkForwardResult,
} from "../types";

export function requestBody(config: BacktestConfig) {
  return {
    ticker: config.ticker.trim().toUpperCase(),
    assetType: config.assetType,
    strategy: config.strategy,
    params: config.params,
    startingCapital: config.startingCapital,
    tradePercent: config.tradePercent,
    timeframe: config.timeframe,
    startDate: config.startDate,
    endDate: config.endDate,
    commissionBps: config.commissionBps,
    commissionPerShare: config.commissionPerShare,
    slippageBps: config.slippageBps,
    sizingMode: config.sizingMode,
    allowAnySymbol: config.allowAnySymbol,
  };
}

async function postJson<T>(url: string, config: BacktestConfig): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody(config)),
  });
  const payload = (await response.json()) as T & ApiError;
  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }
  return payload;
}

export function runBacktest(config: BacktestConfig): Promise<BacktestResult> {
  return postJson("/api/backtest", config);
}

export function runSweep(config: BacktestConfig): Promise<SweepResult> {
  return postJson("/api/backtest/sweep", config);
}

export function runWalkForward(config: BacktestConfig): Promise<WalkForwardResult> {
  return postJson("/api/backtest/walk-forward", config);
}

export async function fetchUniverse(): Promise<UniverseSnapshot> {
  const response = await fetch("/api/universe");
  const payload = (await response.json()) as UniverseSnapshot & ApiError;
  if (!response.ok) {
    throw new Error(payload.error || "Unable to load universe.");
  }
  if (!payload.stock?.groups || !payload.crypto?.groups) {
    throw new Error("Universe response was missing ranked groups.");
  }
  return payload;
}
