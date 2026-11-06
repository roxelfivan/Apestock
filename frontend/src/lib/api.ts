import type {
  ApiError,
  BacktestConfig,
  BacktestResult,
  PriceSyncResult,
  SweepResult,
  UniverseSnapshot,
  WalkForwardResult,
} from "../types";
import { sanitizeUserError } from "./errors";

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
  const raw = await response.text();
  let payload: (T & ApiError) | null = null;
  try {
    payload = raw ? (JSON.parse(raw) as T & ApiError) : null;
  } catch {
    throw new Error(sanitizeUserError(raw, "Request failed."));
  }
  if (!response.ok) {
    throw new Error(sanitizeUserError(payload?.error, "Request failed."));
  }
  if (!payload) throw new Error("Empty response.");
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

export async function syncPrices(ticker: string, assetType: BacktestConfig["assetType"]): Promise<PriceSyncResult> {
  const response = await fetch("/api/prices/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker: ticker.trim().toUpperCase(), assetType }),
  });
  const payload = (await response.json()) as PriceSyncResult & ApiError;
  if (!response.ok) {
    throw new Error(payload.error || "Unable to sync prices.");
  }
  return payload;
}

export async function fetchUniverse(): Promise<UniverseSnapshot> {
  const response = await fetch("/api/universe");
  const raw = await response.text();
  let payload: (UniverseSnapshot & ApiError) | null = null;
  try {
    payload = raw ? (JSON.parse(raw) as UniverseSnapshot & ApiError) : null;
  } catch {
    throw new Error(sanitizeUserError(raw, "Unable to load universe."));
  }
  if (!response.ok || !payload) {
    throw new Error(sanitizeUserError(payload?.error, "Unable to load universe."));
  }
  if (!payload.stock?.groups || !payload.crypto?.groups) {
    throw new Error("Universe response was missing ranked groups.");
  }
  return payload;
}
