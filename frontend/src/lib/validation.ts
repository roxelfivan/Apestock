import type { StrategyName, StrategyParams } from "../types";

export function paramsError(strategy: StrategyName, params: StrategyParams): string | null {
  if (strategy === "MA_CROSSOVER" || strategy === "EMA_CROSSOVER") {
    const shortPeriod = Number(params.shortPeriod);
    const longPeriod = Number(params.longPeriod);
    if (!Number.isInteger(shortPeriod) || !Number.isInteger(longPeriod)) {
      return "Short and long periods must be integers.";
    }
    if (shortPeriod < 2 || longPeriod < 3 || shortPeriod >= longPeriod) {
      return "Short period must be at least 2 and less than the long period.";
    }
    return null;
  }
  if (strategy === "RSI") {
    const period = Number(params.rsiPeriod);
    const oversold = Number(params.oversold);
    const overbought = Number(params.overbought);
    if (!Number.isInteger(period) || period < 2) return "RSI period must be an integer of at least 2.";
    if (!(oversold > 0 && overbought < 100 && oversold < overbought)) {
      return "Oversold must be below overbought, inside 0–100.";
    }
    return null;
  }
  if (strategy === "MACD") {
    const fast = Number(params.fastPeriod);
    const slow = Number(params.slowPeriod);
    const signal = Number(params.signalPeriod);
    if (![fast, slow, signal].every(Number.isInteger)) return "MACD periods must be integers.";
    if (fast < 2 || slow < 3 || signal < 1 || fast >= slow) {
      return "Fast period must be at least 2 and less than the slow period.";
    }
    return null;
  }
  if (strategy === "BOLLINGER") {
    const period = Number(params.bbPeriod);
    const std = Number(params.bbStdDev);
    if (!Number.isInteger(period) || period < 2) return "Bollinger period must be an integer of at least 2.";
    if (!(std > 0)) return "Bollinger standard deviation must be positive.";
    return null;
  }
  if (strategy === "DONCHIAN") {
    const period = Number(params.donchianPeriod);
    if (!Number.isInteger(period) || period < 2) return "Donchian period must be an integer of at least 2.";
    return null;
  }
  return null;
}
