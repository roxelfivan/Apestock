import type { StrategyName, StrategyParams } from "../types";

export const DEFAULT_PARAMS: Record<StrategyName, StrategyParams> = {
  MA_CROSSOVER: { shortPeriod: 50, longPeriod: 200 },
  EMA_CROSSOVER: { shortPeriod: 12, longPeriod: 26 },
  RSI: { rsiPeriod: 14, oversold: 30, overbought: 70 },
  MACD: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  BOLLINGER: { bbPeriod: 20, bbStdDev: 2 },
  DONCHIAN: { donchianPeriod: 20 },
  BUY_HOLD: {},
};

export const STRATEGY_LABELS: Record<StrategyName, string> = {
  MA_CROSSOVER: "SMA crossover",
  EMA_CROSSOVER: "EMA crossover",
  RSI: "RSI mean reversion",
  MACD: "MACD crossover",
  BOLLINGER: "Bollinger bounce",
  DONCHIAN: "Donchian breakout",
  BUY_HOLD: "Buy and hold",
};
