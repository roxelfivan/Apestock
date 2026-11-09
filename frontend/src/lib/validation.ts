import type { StrategyName, StrategyParams } from "../types";

export function paramsError(strategy: StrategyName, params: StrategyParams): string | null {
  if (strategy === "MA_CROSSOVER" || strategy === "EMA_CROSSOVER" || strategy === "WMA_CROSSOVER") {
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
  if (strategy === "STOCHASTIC") {
    const period = Number(params.kPeriod);
    const oversold = Number(params.oversold);
    const overbought = Number(params.overbought);
    if (!Number.isInteger(period) || period < 2) return "Stochastic %K period must be an integer of at least 2.";
    if (!(oversold > 0 && overbought < 100 && oversold < overbought)) {
      return "Oversold must be below overbought, inside 0–100.";
    }
    return null;
  }
  if (strategy === "MOMENTUM") {
    const lookback = Number(params.lookback);
    if (!Number.isInteger(lookback) || lookback < 2) return "Lookback must be an integer of at least 2.";
    return null;
  }
  if (strategy === "WILLIAMS_R") {
    const period = Number(params.wrPeriod);
    const oversold = Number(params.oversold);
    const overbought = Number(params.overbought);
    if (!Number.isInteger(period) || period < 2) return "Williams %R period must be an integer of at least 2.";
    if (!(oversold > -100 && overbought < 0 && oversold < overbought)) {
      return "Oversold must be below overbought, inside -100–0.";
    }
    return null;
  }
  if (strategy === "HMA") {
    const period = Number(params.hmaPeriod);
    if (!Number.isInteger(period) || period < 2) return "Hull period must be an integer of at least 2.";
    return null;
  }
  if (strategy === "STOCH_RSI") {
    const period = Number(params.stochRsiPeriod);
    const oversold = Number(params.oversold);
    const overbought = Number(params.overbought);
    if (!Number.isInteger(period) || period < 2) return "Stochastic RSI period must be an integer of at least 2.";
    if (!(oversold > 0 && overbought < 100 && oversold < overbought)) {
      return "Oversold must be below overbought, inside 0–100.";
    }
    return null;
  }
  if (strategy === "PPO") {
    const fast = Number(params.fastPeriod);
    const slow = Number(params.slowPeriod);
    const signal = Number(params.signalPeriod);
    if (![fast, slow, signal].every(Number.isInteger)) return "PPO periods must be integers.";
    if (fast < 2 || slow < 3 || signal < 1 || fast >= slow) {
      return "Fast period must be at least 2 and less than the slow period.";
    }
    return null;
  }
  if (strategy === "TRIX") {
    const period = Number(params.trixPeriod);
    const signal = Number(params.trixSignalPeriod);
    if (!Number.isInteger(period) || period < 2) return "TRIX period must be an integer of at least 2.";
    if (!Number.isInteger(signal) || signal < 1) return "TRIX signal period must be an integer of at least 1.";
    return null;
  }
  if (strategy === "CCI") {
    const period = Number(params.cciPeriod);
    const oversold = Number(params.oversold);
    const overbought = Number(params.overbought);
    if (!Number.isInteger(period) || period < 2) return "CCI period must be an integer of at least 2.";
    if (!(oversold < overbought)) return "Oversold must be below overbought.";
    return null;
  }
  if (strategy === "ULTIMATE") {
    const shortP = Number(params.uoShort);
    const mid = Number(params.uoMid);
    const longP = Number(params.uoLong);
    const oversold = Number(params.oversold);
    const overbought = Number(params.overbought);
    if (![shortP, mid, longP].every(Number.isInteger) || shortP < 2 || shortP >= mid || mid >= longP) {
      return "Ultimate oscillator periods must be increasing integers.";
    }
    if (!(oversold > 0 && overbought < 100 && oversold < overbought)) {
      return "Oversold must be below overbought, inside 0–100.";
    }
    return null;
  }
  if (strategy === "AWESOME") {
    const fast = Number(params.aoFast);
    const slow = Number(params.aoSlow);
    if (!Number.isInteger(fast) || !Number.isInteger(slow) || fast < 2 || slow < 3 || fast >= slow) {
      return "Awesome oscillator fast period must be less than the slow period.";
    }
    return null;
  }
  if (strategy === "ROC") {
    const period = Number(params.rocPeriod);
    const signal = Number(params.rocSignalPeriod);
    if (!Number.isInteger(period) || period < 2) return "ROC period must be an integer of at least 2.";
    if (!Number.isInteger(signal) || signal < 1) return "ROC signal period must be an integer of at least 1.";
    return null;
  }
  if (strategy === "ADX") {
    const period = Number(params.adxPeriod);
    if (!Number.isInteger(period) || period < 2) return "ADX period must be an integer of at least 2.";
    return null;
  }
  if (strategy === "AROON") {
    const period = Number(params.aroonPeriod);
    if (!Number.isInteger(period) || period < 2) return "Aroon period must be an integer of at least 2.";
    return null;
  }
  if (strategy === "SUPERTREND" || strategy === "KELTNER") {
    const atrPeriod = Number(params.atrPeriod);
    const mult = Number(params.atrMultiplier);
    if (!Number.isInteger(atrPeriod) || atrPeriod < 2) return "ATR period must be an integer of at least 2.";
    if (!(mult > 0)) return "ATR multiplier must be positive.";
    if (strategy === "KELTNER") {
      const period = Number(params.keltnerPeriod);
      if (!Number.isInteger(period) || period < 2) return "Keltner period must be an integer of at least 2.";
    }
    return null;
  }
  if (strategy === "PSAR") {
    const step = Number(params.psarStep);
    const maxAf = Number(params.psarMax);
    if (!(step > 0 && maxAf > 0 && step < maxAf)) return "SAR step must be positive and below the maximum AF.";
    return null;
  }
  if (strategy === "ICHIMOKU") {
    const tenkan = Number(params.tenkanPeriod);
    const kijun = Number(params.kijunPeriod);
    if (!Number.isInteger(tenkan) || !Number.isInteger(kijun) || tenkan < 2 || kijun < 3 || tenkan >= kijun) {
      return "Tenkan period must be at least 2 and less than the Kijun period.";
    }
    return null;
  }
  return null;
}
