import type { StrategyName, StrategyParams } from "../types.js";

export const DEFAULT_STRATEGY_PARAMS: Record<StrategyName, StrategyParams> = {
  MA_CROSSOVER: { shortPeriod: 50, longPeriod: 200 },
  EMA_CROSSOVER: { shortPeriod: 12, longPeriod: 26 },
  RSI: { rsiPeriod: 14, oversold: 30, overbought: 70 },
  MACD: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  BOLLINGER: { bbPeriod: 20, bbStdDev: 2 },
  DONCHIAN: { donchianPeriod: 20 },
  STOCHASTIC: { kPeriod: 14, oversold: 20, overbought: 80 },
  MOMENTUM: { lookback: 20 },
  WILLIAMS_R: { wrPeriod: 14, oversold: -80, overbought: -20 },
  BUY_HOLD: {},
};

export const STRATEGY_LABELS: Record<StrategyName, string> = {
  MA_CROSSOVER: "SMA crossover",
  EMA_CROSSOVER: "EMA crossover",
  RSI: "RSI mean reversion",
  MACD: "MACD crossover",
  BOLLINGER: "Bollinger bounce",
  DONCHIAN: "Donchian breakout",
  STOCHASTIC: "Stochastic oscillator",
  MOMENTUM: "Time-series momentum",
  WILLIAMS_R: "Williams %R",
  BUY_HOLD: "Buy and hold",
};

export const COMMITTEE_STRATEGIES: StrategyName[] = [
  "MA_CROSSOVER",
  "EMA_CROSSOVER",
  "RSI",
  "MACD",
  "BOLLINGER",
  "DONCHIAN",
  "STOCHASTIC",
  "MOMENTUM",
  "WILLIAMS_R",
];
