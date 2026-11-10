import { BollingerBands, EMA, MACD, RSI, SMA } from "technicalindicators";
import { ValidationError } from "../errors.js";
import type { OhlcBar, Signal, StrategyName, StrategyParams } from "../types.js";
import {
  atrSeries,
  emaSeries,
  hmaSeries,
  midpoint,
  rollingHighLow,
  smaSeries,
  wilderSmooth,
  wmaSeries,
} from "./indicators.js";

export function padIndicator(values: number[], length: number): Array<number | null> {
  const offset = length - values.length;
  const padded: Array<number | null> = Array(length).fill(null);
  for (let i = 0; i < values.length; i += 1) {
    padded[offset + i] = values[i];
  }
  return padded;
}

function requireInt(value: unknown, label: string, min: number): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min) {
    throw new ValidationError(`${label} must be an integer of at least ${min}.`);
  }
  return number;
}

function requireNumber(value: unknown, label: string): number {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new ValidationError(`${label} must be a number.`);
  }
  return number;
}

function rollingExtreme(values: number[], period: number, kind: "max" | "min"): Array<number | null> {
  const out: Array<number | null> = Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i += 1) {
    let extreme = values[i - period + 1];
    for (let j = i - period + 2; j <= i; j += 1) {
      extreme = kind === "max" ? Math.max(extreme, values[j]) : Math.min(extreme, values[j]);
    }
    out[i] = extreme;
  }
  return out;
}

function crossedUp(prevA: number, prevB: number, a: number, b: number): boolean {
  return prevA <= prevB && a > b;
}

function crossedDown(prevA: number, prevB: number, a: number, b: number): boolean {
  return prevA >= prevB && a < b;
}

export function warmupBars(strategy: StrategyName, params: StrategyParams): number {
  switch (strategy) {
    case "MA_CROSSOVER":
    case "EMA_CROSSOVER":
    case "WMA_CROSSOVER":
      return requireInt(params.longPeriod, "longPeriod", 3) + 1;
    case "HMA":
      return requireInt(params.hmaPeriod ?? 16, "hmaPeriod", 2) + 4;
    case "RSI":
      return requireInt(params.rsiPeriod, "rsiPeriod", 2) + 2;
    case "MACD":
    case "PPO":
      return requireInt(params.slowPeriod ?? 26, "slowPeriod", 3) + requireInt(params.signalPeriod ?? 9, "signalPeriod", 1) + 1;
    case "BOLLINGER":
      return requireInt(params.bbPeriod ?? 20, "bbPeriod", 2) + 2;
    case "DONCHIAN":
      return requireInt(params.donchianPeriod ?? 20, "donchianPeriod", 2) + 1;
    case "STOCHASTIC":
      return requireInt(params.kPeriod ?? 14, "kPeriod", 2) + 1;
    case "STOCH_RSI":
      return requireInt(params.stochRsiPeriod ?? 14, "stochRsiPeriod", 2) * 2 + 2;
    case "MOMENTUM":
      return requireInt(params.lookback ?? 20, "lookback", 2) + 2;
    case "ROC":
      return requireInt(params.rocPeriod ?? 12, "rocPeriod", 2) + requireInt(params.rocSignalPeriod ?? 9, "rocSignalPeriod", 1) + 1;
    case "WILLIAMS_R":
      return requireInt(params.wrPeriod ?? 14, "wrPeriod", 2) + 1;
    case "CCI":
      return requireInt(params.cciPeriod ?? 20, "cciPeriod", 2) + 2;
    case "ADX":
      return requireInt(params.adxPeriod ?? 14, "adxPeriod", 2) * 2 + 2;
    case "AROON":
      return requireInt(params.aroonPeriod ?? 25, "aroonPeriod", 2) + 1;
    case "SUPERTREND":
      return requireInt(params.atrPeriod ?? 10, "atrPeriod", 2) + 3;
    case "PSAR":
      return 5;
    case "ICHIMOKU":
      return requireInt(params.kijunPeriod ?? 26, "kijunPeriod", 2) + 1;
    case "KELTNER":
      return Math.max(
        requireInt(params.keltnerPeriod ?? 20, "keltnerPeriod", 2),
        requireInt(params.atrPeriod ?? 10, "atrPeriod", 2),
      ) + 2;
    case "TRIX":
      return requireInt(params.trixPeriod ?? 15, "trixPeriod", 2) * 3 + requireInt(params.trixSignalPeriod ?? 9, "trixSignalPeriod", 1) + 1;
    case "ULTIMATE":
      return requireInt(params.uoLong ?? 28, "uoLong", 3) + 2;
    case "AWESOME":
      return requireInt(params.aoSlow ?? 34, "aoSlow", 3) + 2;
    case "BUY_HOLD":
      return 2;
    default:
      throw new ValidationError("Unsupported strategy.");
  }
}

export function computeSignals(
  bars: OhlcBar[],
  strategy: StrategyName,
  params: StrategyParams,
): { signals: Signal[]; minBars: number; series: Record<string, Array<number | null>> } {
  const closes = bars.map((bar) => bar.close);
  const highs = bars.map((bar) => bar.high);
  const lows = bars.map((bar) => bar.low);
  const signals: Signal[] = Array(bars.length).fill("HOLD");

  if (strategy === "MA_CROSSOVER" || strategy === "EMA_CROSSOVER") {
    const shortPeriod = requireInt(params.shortPeriod, "shortPeriod", 2);
    const longPeriod = requireInt(params.longPeriod, "longPeriod", 3);
    if (shortPeriod >= longPeriod) {
      throw new ValidationError("shortPeriod must be less than longPeriod.");
    }
    const calc = strategy === "EMA_CROSSOVER" ? EMA.calculate : SMA.calculate;
    const shortMa = padIndicator(calc({ period: shortPeriod, values: closes }), bars.length);
    const longMa = padIndicator(calc({ period: longPeriod, values: closes }), bars.length);
    for (let i = 1; i < bars.length; i += 1) {
      const prevShort = shortMa[i - 1];
      const prevLong = longMa[i - 1];
      const short = shortMa[i];
      const long = longMa[i];
      if ([prevShort, prevLong, short, long].some((value) => value == null)) continue;
      if (prevShort! <= prevLong! && short! > long!) signals[i] = "BUY";
      else if (prevShort! >= prevLong! && short! < long!) signals[i] = "SELL";
    }
    return {
      signals,
      minBars: longPeriod + 1,
      series: { shortMa, longMa },
    };
  }

  if (strategy === "RSI") {
    const rsiPeriod = requireInt(params.rsiPeriod, "rsiPeriod", 2);
    const oversold = requireNumber(params.oversold, "oversold");
    const overbought = requireNumber(params.overbought, "overbought");
    if (oversold <= 0 || overbought >= 100 || oversold >= overbought) {
      throw new ValidationError("oversold must be below overbought, within 0–100.");
    }
    const rsi = padIndicator(RSI.calculate({ period: rsiPeriod, values: closes }), bars.length);
    for (let i = 1; i < bars.length; i += 1) {
      const prev = rsi[i - 1];
      const current = rsi[i];
      if (prev == null || current == null) continue;
      if (prev <= oversold && current > oversold) signals[i] = "BUY";
      else if (prev >= overbought && current < overbought) signals[i] = "SELL";
    }
    return { signals, minBars: rsiPeriod + 2, series: { rsi } };
  }

  if (strategy === "MACD") {
    const fastPeriod = requireInt(params.fastPeriod ?? 12, "fastPeriod", 2);
    const slowPeriod = requireInt(params.slowPeriod ?? 26, "slowPeriod", 3);
    const signalPeriod = requireInt(params.signalPeriod ?? 9, "signalPeriod", 1);
    if (fastPeriod >= slowPeriod) {
      throw new ValidationError("fastPeriod must be less than slowPeriod.");
    }
    const raw = MACD.calculate({
      values: closes,
      fastPeriod,
      slowPeriod,
      signalPeriod,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });
    const macd = padIndicator(
      raw.map((row) => Number(row.MACD)),
      bars.length,
    );
    const signalLine = padIndicator(
      raw.map((row) => Number(row.signal)),
      bars.length,
    );
    for (let i = 1; i < bars.length; i += 1) {
      const prevMacd = macd[i - 1];
      const prevSignal = signalLine[i - 1];
      const currentMacd = macd[i];
      const currentSignal = signalLine[i];
      if ([prevMacd, prevSignal, currentMacd, currentSignal].some((value) => value == null || !Number.isFinite(value))) {
        continue;
      }
      if (prevMacd! <= prevSignal! && currentMacd! > currentSignal!) signals[i] = "BUY";
      else if (prevMacd! >= prevSignal! && currentMacd! < currentSignal!) signals[i] = "SELL";
    }
    return { signals, minBars: slowPeriod + signalPeriod + 1, series: { macd, signal: signalLine } };
  }

  if (strategy === "BOLLINGER") {
    const bbPeriod = requireInt(params.bbPeriod ?? 20, "bbPeriod", 2);
    const bbStdDev = requireNumber(params.bbStdDev ?? 2, "bbStdDev");
    if (bbStdDev <= 0) throw new ValidationError("bbStdDev must be positive.");
    const raw = BollingerBands.calculate({ period: bbPeriod, values: closes, stdDev: bbStdDev });
    const lower = padIndicator(
      raw.map((row) => Number(row.lower)),
      bars.length,
    );
    const middle = padIndicator(
      raw.map((row) => Number(row.middle)),
      bars.length,
    );
    const upper = padIndicator(
      raw.map((row) => Number(row.upper)),
      bars.length,
    );
    for (let i = 1; i < bars.length; i += 1) {
      const prevClose = closes[i - 1];
      const close = closes[i];
      const prevLower = lower[i - 1];
      const prevUpper = upper[i - 1];
      const currentLower = lower[i];
      const currentUpper = upper[i];
      if ([prevLower, prevUpper, currentLower, currentUpper].some((value) => value == null)) continue;
      if (prevClose <= prevLower! && close > currentLower!) signals[i] = "BUY";
      else if (prevClose >= prevUpper! && close < currentUpper!) signals[i] = "SELL";
    }
    return { signals, minBars: bbPeriod + 2, series: { bbLower: lower, bbMiddle: middle, bbUpper: upper } };
  }

  if (strategy === "DONCHIAN") {
    const period = requireInt(params.donchianPeriod ?? 20, "donchianPeriod", 2);
    const priorHigh = rollingExtreme(highs, period, "max");
    const priorLow = rollingExtreme(lows, period, "min");
    const channelHigh: Array<number | null> = Array(bars.length).fill(null);
    const channelLow: Array<number | null> = Array(bars.length).fill(null);
    for (let i = period; i < bars.length; i += 1) {
      channelHigh[i] = priorHigh[i - 1];
      channelLow[i] = priorLow[i - 1];
      if (channelHigh[i] == null || channelLow[i] == null) continue;
      if (closes[i] > channelHigh[i]!) signals[i] = "BUY";
      else if (closes[i] < channelLow[i]!) signals[i] = "SELL";
    }
    return { signals, minBars: period + 1, series: { donchianHigh: channelHigh, donchianLow: channelLow } };
  }

  if (strategy === "STOCHASTIC") {
    const kPeriod = requireInt(params.kPeriod ?? 14, "kPeriod", 2);
    const oversold = requireNumber(params.oversold ?? 20, "oversold");
    const overbought = requireNumber(params.overbought ?? 80, "overbought");
    if (oversold <= 0 || overbought >= 100 || oversold >= overbought) {
      throw new ValidationError("oversold must be below overbought, within 0–100.");
    }
    const percentK: Array<number | null> = Array(bars.length).fill(null);
    for (let i = kPeriod - 1; i < bars.length; i += 1) {
      let lowest = lows[i];
      let highest = highs[i];
      for (let j = i - kPeriod + 1; j < i; j += 1) {
        lowest = Math.min(lowest, lows[j]);
        highest = Math.max(highest, highs[j]);
      }
      const range = highest - lowest;
      percentK[i] = range === 0 ? 50 : ((closes[i] - lowest) / range) * 100;
    }
    for (let i = 1; i < bars.length; i += 1) {
      const prev = percentK[i - 1];
      const current = percentK[i];
      if (prev == null || current == null) continue;
      if (prev <= oversold && current > oversold) signals[i] = "BUY";
      else if (prev >= overbought && current < overbought) signals[i] = "SELL";
    }
    return { signals, minBars: kPeriod + 1, series: { stochK: percentK } };
  }

  if (strategy === "MOMENTUM") {
    const lookback = requireInt(params.lookback ?? 20, "lookback", 2);
    const momentum: Array<number | null> = Array(bars.length).fill(null);
    for (let i = lookback; i < bars.length; i += 1) {
      const base = closes[i - lookback];
      momentum[i] = base > 0 ? closes[i] / base - 1 : null;
    }
    for (let i = lookback + 1; i < bars.length; i += 1) {
      const prev = momentum[i - 1];
      const current = momentum[i];
      if (prev == null || current == null) continue;
      if (prev <= 0 && current > 0) signals[i] = "BUY";
      else if (prev >= 0 && current < 0) signals[i] = "SELL";
    }
    return { signals, minBars: lookback + 2, series: { momentum } };
  }

  if (strategy === "WILLIAMS_R") {
    const wrPeriod = requireInt(params.wrPeriod ?? 14, "wrPeriod", 2);
    const oversold = requireNumber(params.oversold ?? -80, "oversold");
    const overbought = requireNumber(params.overbought ?? -20, "overbought");
    if (oversold >= overbought || oversold <= -100 || overbought >= 0) {
      throw new ValidationError("Williams %R oversold must be below overbought, inside -100–0.");
    }
    const williams: Array<number | null> = Array(bars.length).fill(null);
    for (let i = wrPeriod - 1; i < bars.length; i += 1) {
      let lowest = lows[i];
      let highest = highs[i];
      for (let j = i - wrPeriod + 1; j < i; j += 1) {
        lowest = Math.min(lowest, lows[j]);
        highest = Math.max(highest, highs[j]);
      }
      const range = highest - lowest;
      williams[i] = range === 0 ? -50 : ((highest - closes[i]) / range) * -100;
    }
    for (let i = 1; i < bars.length; i += 1) {
      const prev = williams[i - 1];
      const current = williams[i];
      if (prev == null || current == null) continue;
      if (prev <= oversold && current > oversold) signals[i] = "BUY";
      else if (prev >= overbought && current < overbought) signals[i] = "SELL";
    }
    return { signals, minBars: wrPeriod + 1, series: { williamsR: williams } };
  }

  if (strategy === "WMA_CROSSOVER") {
    const shortPeriod = requireInt(params.shortPeriod, "shortPeriod", 2);
    const longPeriod = requireInt(params.longPeriod, "longPeriod", 3);
    if (shortPeriod >= longPeriod) throw new ValidationError("shortPeriod must be less than longPeriod.");
    const shortMa = wmaSeries(closes, shortPeriod);
    const longMa = wmaSeries(closes, longPeriod);
    for (let i = 1; i < bars.length; i += 1) {
      const prevShort = shortMa[i - 1];
      const prevLong = longMa[i - 1];
      const short = shortMa[i];
      const long = longMa[i];
      if ([prevShort, prevLong, short, long].some((value) => value == null)) continue;
      if (crossedUp(prevShort!, prevLong!, short!, long!)) signals[i] = "BUY";
      else if (crossedDown(prevShort!, prevLong!, short!, long!)) signals[i] = "SELL";
    }
    return { signals, minBars: longPeriod + 1, series: { shortMa, longMa } };
  }

  if (strategy === "HMA") {
    const hmaPeriod = requireInt(params.hmaPeriod ?? 16, "hmaPeriod", 2);
    const hma = hmaSeries(closes, hmaPeriod);
    for (let i = 1; i < bars.length; i += 1) {
      const prevH = hma[i - 1];
      const currH = hma[i];
      if (prevH == null || currH == null) continue;
      if (crossedUp(closes[i - 1], prevH, closes[i], currH)) signals[i] = "BUY";
      else if (crossedDown(closes[i - 1], prevH, closes[i], currH)) signals[i] = "SELL";
    }
    return { signals, minBars: hmaPeriod + 4, series: { hma } };
  }

  if (strategy === "STOCH_RSI") {
    const period = requireInt(params.stochRsiPeriod ?? 14, "stochRsiPeriod", 2);
    const oversold = requireNumber(params.oversold ?? 20, "oversold");
    const overbought = requireNumber(params.overbought ?? 80, "overbought");
    if (oversold <= 0 || overbought >= 100 || oversold >= overbought) {
      throw new ValidationError("oversold must be below overbought, within 0–100.");
    }
    const rsi = padIndicator(RSI.calculate({ period, values: closes }), bars.length);
    const stochRsi: Array<number | null> = Array(bars.length).fill(null);
    for (let i = 0; i < bars.length; i += 1) {
      if (rsi[i] == null || i < period - 1) continue;
      let min = rsi[i]!;
      let max = rsi[i]!;
      let ok = true;
      for (let j = i - period + 1; j <= i; j += 1) {
        if (rsi[j] == null) {
          ok = false;
          break;
        }
        min = Math.min(min, rsi[j]!);
        max = Math.max(max, rsi[j]!);
      }
      if (!ok) continue;
      stochRsi[i] = max === min ? 50 : ((rsi[i]! - min) / (max - min)) * 100;
    }
    for (let i = 1; i < bars.length; i += 1) {
      const prev = stochRsi[i - 1];
      const current = stochRsi[i];
      if (prev == null || current == null) continue;
      if (prev <= oversold && current > oversold) signals[i] = "BUY";
      else if (prev >= overbought && current < overbought) signals[i] = "SELL";
    }
    return { signals, minBars: period * 2 + 2, series: { stochRsi } };
  }

  if (strategy === "PPO") {
    const fastPeriod = requireInt(params.fastPeriod ?? 12, "fastPeriod", 2);
    const slowPeriod = requireInt(params.slowPeriod ?? 26, "slowPeriod", 3);
    const signalPeriod = requireInt(params.signalPeriod ?? 9, "signalPeriod", 1);
    if (fastPeriod >= slowPeriod) throw new ValidationError("fastPeriod must be less than slowPeriod.");
    const fast = emaSeries(closes, fastPeriod);
    const slow = emaSeries(closes, slowPeriod);
    const ppo: Array<number | null> = closes.map((_, i) =>
      fast[i] == null || slow[i] == null || slow[i] === 0 ? null : (100 * (fast[i]! - slow[i]!)) / slow[i]!,
    );
    const signalLine = emaSeries(
      ppo.map((value) => value ?? 0),
      signalPeriod,
    );
    for (let i = 1; i < bars.length; i += 1) {
      if (ppo[i] == null || ppo[i - 1] == null || i < slowPeriod + signalPeriod) continue;
      if (crossedUp(ppo[i - 1]!, signalLine[i - 1]!, ppo[i]!, signalLine[i]!)) signals[i] = "BUY";
      else if (crossedDown(ppo[i - 1]!, signalLine[i - 1]!, ppo[i]!, signalLine[i]!)) signals[i] = "SELL";
    }
    return { signals, minBars: slowPeriod + signalPeriod + 1, series: { ppo, signal: signalLine } };
  }

  if (strategy === "TRIX") {
    const trixPeriod = requireInt(params.trixPeriod ?? 15, "trixPeriod", 2);
    const trixSignalPeriod = requireInt(params.trixSignalPeriod ?? 9, "trixSignalPeriod", 1);
    const e1 = emaSeries(closes, trixPeriod);
    const e2 = emaSeries(
      e1.map((value) => value ?? 0),
      trixPeriod,
    );
    const e3 = emaSeries(
      e2.map((value) => value ?? 0),
      trixPeriod,
    );
    const trix: Array<number | null> = Array(bars.length).fill(null);
    for (let i = 1; i < bars.length; i += 1) {
      if (e3[i] == null || e3[i - 1] == null || e3[i - 1] === 0) continue;
      trix[i] = 100 * (e3[i]! / e3[i - 1]! - 1);
    }
    const signalLine = emaSeries(
      trix.map((value) => value ?? 0),
      trixSignalPeriod,
    );
    const minBars = trixPeriod * 3 + trixSignalPeriod + 1;
    for (let i = 1; i < bars.length; i += 1) {
      if (trix[i] == null || trix[i - 1] == null || i < minBars) continue;
      if (crossedUp(trix[i - 1]!, signalLine[i - 1]!, trix[i]!, signalLine[i]!)) signals[i] = "BUY";
      else if (crossedDown(trix[i - 1]!, signalLine[i - 1]!, trix[i]!, signalLine[i]!)) signals[i] = "SELL";
    }
    return { signals, minBars, series: { trix, signal: signalLine } };
  }

  if (strategy === "CCI") {
    const cciPeriod = requireInt(params.cciPeriod ?? 20, "cciPeriod", 2);
    const oversold = requireNumber(params.oversold ?? -100, "oversold");
    const overbought = requireNumber(params.overbought ?? 100, "overbought");
    if (oversold >= overbought) throw new ValidationError("oversold must be below overbought.");
    const typical = bars.map((bar) => (bar.high + bar.low + bar.close) / 3);
    const smaTp = smaSeries(typical, cciPeriod);
    const cci: Array<number | null> = Array(bars.length).fill(null);
    for (let i = cciPeriod - 1; i < bars.length; i += 1) {
      const mean = smaTp[i];
      if (mean == null) continue;
      let dev = 0;
      for (let j = i - cciPeriod + 1; j <= i; j += 1) dev += Math.abs(typical[j] - mean);
      const md = dev / cciPeriod;
      cci[i] = md === 0 ? 0 : (typical[i] - mean) / (0.015 * md);
    }
    for (let i = 1; i < bars.length; i += 1) {
      const prev = cci[i - 1];
      const current = cci[i];
      if (prev == null || current == null) continue;
      if (prev <= oversold && current > oversold) signals[i] = "BUY";
      else if (prev >= overbought && current < overbought) signals[i] = "SELL";
    }
    return { signals, minBars: cciPeriod + 2, series: { cci } };
  }

  if (strategy === "ULTIMATE") {
    const uoShort = requireInt(params.uoShort ?? 7, "uoShort", 2);
    const uoMid = requireInt(params.uoMid ?? 14, "uoMid", 3);
    const uoLong = requireInt(params.uoLong ?? 28, "uoLong", 4);
    const oversold = requireNumber(params.oversold ?? 30, "oversold");
    const overbought = requireNumber(params.overbought ?? 70, "overbought");
    if (uoShort >= uoMid || uoMid >= uoLong) throw new ValidationError("Ultimate oscillator periods must increase.");
    if (oversold <= 0 || overbought >= 100 || oversold >= overbought) {
      throw new ValidationError("oversold must be below overbought, within 0–100.");
    }
    const bp: number[] = Array(bars.length).fill(0);
    const tr: number[] = Array(bars.length).fill(0);
    for (let i = 1; i < bars.length; i += 1) {
      const prevClose = closes[i - 1];
      bp[i] = closes[i] - Math.min(lows[i], prevClose);
      tr[i] = Math.max(highs[i], prevClose) - Math.min(lows[i], prevClose);
    }
    const uo: Array<number | null> = Array(bars.length).fill(null);
    const avg = (end: number, period: number) => {
      let bpSum = 0;
      let trSum = 0;
      for (let j = end - period + 1; j <= end; j += 1) {
        bpSum += bp[j];
        trSum += tr[j];
      }
      return trSum === 0 ? 0 : bpSum / trSum;
    };
    for (let i = uoLong; i < bars.length; i += 1) {
      uo[i] = 100 * ((4 * avg(i, uoShort) + 2 * avg(i, uoMid) + avg(i, uoLong)) / 7);
    }
    for (let i = 1; i < bars.length; i += 1) {
      const prev = uo[i - 1];
      const current = uo[i];
      if (prev == null || current == null) continue;
      if (prev <= oversold && current > oversold) signals[i] = "BUY";
      else if (prev >= overbought && current < overbought) signals[i] = "SELL";
    }
    return { signals, minBars: uoLong + 2, series: { uo } };
  }

  if (strategy === "AWESOME") {
    const aoFast = requireInt(params.aoFast ?? 5, "aoFast", 2);
    const aoSlow = requireInt(params.aoSlow ?? 34, "aoSlow", 3);
    if (aoFast >= aoSlow) throw new ValidationError("aoFast must be less than aoSlow.");
    const median = bars.map((bar) => midpoint(bar.high, bar.low));
    const fast = smaSeries(median, aoFast);
    const slow = smaSeries(median, aoSlow);
    const ao: Array<number | null> = median.map((_, i) =>
      fast[i] == null || slow[i] == null ? null : fast[i]! - slow[i]!,
    );
    for (let i = 1; i < bars.length; i += 1) {
      const prev = ao[i - 1];
      const current = ao[i];
      if (prev == null || current == null) continue;
      if (prev <= 0 && current > 0) signals[i] = "BUY";
      else if (prev >= 0 && current < 0) signals[i] = "SELL";
    }
    return { signals, minBars: aoSlow + 2, series: { ao } };
  }

  if (strategy === "ROC") {
    const rocPeriod = requireInt(params.rocPeriod ?? 12, "rocPeriod", 2);
    const rocSignalPeriod = requireInt(params.rocSignalPeriod ?? 9, "rocSignalPeriod", 1);
    const roc: Array<number | null> = Array(bars.length).fill(null);
    for (let i = rocPeriod; i < bars.length; i += 1) {
      const base = closes[i - rocPeriod];
      roc[i] = base === 0 ? null : 100 * (closes[i] / base - 1);
    }
    const signalLine = smaSeries(
      roc.map((value) => value ?? 0),
      rocSignalPeriod,
    );
    const minBars = rocPeriod + rocSignalPeriod + 1;
    for (let i = 1; i < bars.length; i += 1) {
      if (roc[i] == null || roc[i - 1] == null || i < minBars) continue;
      if (crossedUp(roc[i - 1]!, signalLine[i - 1]!, roc[i]!, signalLine[i]!)) signals[i] = "BUY";
      else if (crossedDown(roc[i - 1]!, signalLine[i - 1]!, roc[i]!, signalLine[i]!)) signals[i] = "SELL";
    }
    return { signals, minBars, series: { roc, signal: signalLine } };
  }

  if (strategy === "ADX") {
    const adxPeriod = requireInt(params.adxPeriod ?? 14, "adxPeriod", 2);
    const plusDm: number[] = Array(bars.length).fill(0);
    const minusDm: number[] = Array(bars.length).fill(0);
    for (let i = 1; i < bars.length; i += 1) {
      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];
      plusDm[i] = upMove > downMove && upMove > 0 ? upMove : 0;
      minusDm[i] = downMove > upMove && downMove > 0 ? downMove : 0;
    }
    const atr = atrSeries(highs, lows, closes, adxPeriod);
    const plusDi: Array<number | null> = Array(bars.length).fill(null);
    const minusDi: Array<number | null> = Array(bars.length).fill(null);
    const smoothedPlus = wilderSmooth(plusDm, adxPeriod);
    const smoothedMinus = wilderSmooth(minusDm, adxPeriod);
    const dx: number[] = Array(bars.length).fill(0);
    for (let i = 0; i < bars.length; i += 1) {
      if (atr[i] == null || atr[i] === 0 || smoothedPlus[i] == null || smoothedMinus[i] == null) continue;
      plusDi[i] = (100 * smoothedPlus[i]!) / atr[i]!;
      minusDi[i] = (100 * smoothedMinus[i]!) / atr[i]!;
      const sum = plusDi[i]! + minusDi[i]!;
      dx[i] = sum === 0 ? 0 : (100 * Math.abs(plusDi[i]! - minusDi[i]!)) / sum;
    }
    const adx = wilderSmooth(dx, adxPeriod);
    for (let i = 1; i < bars.length; i += 1) {
      const prevPlus = plusDi[i - 1];
      const prevMinus = minusDi[i - 1];
      const currPlus = plusDi[i];
      const currMinus = minusDi[i];
      if ([prevPlus, prevMinus, currPlus, currMinus].some((value) => value == null)) continue;
      if (crossedUp(prevPlus!, prevMinus!, currPlus!, currMinus!)) signals[i] = "BUY";
      else if (crossedDown(prevPlus!, prevMinus!, currPlus!, currMinus!)) signals[i] = "SELL";
    }
    return { signals, minBars: adxPeriod * 2 + 2, series: { adx, plusDi, minusDi } };
  }

  if (strategy === "AROON") {
    const aroonPeriod = requireInt(params.aroonPeriod ?? 25, "aroonPeriod", 2);
    const aroonUp: Array<number | null> = Array(bars.length).fill(null);
    const aroonDown: Array<number | null> = Array(bars.length).fill(null);
    for (let i = aroonPeriod; i < bars.length; i += 1) {
      let highAge = 0;
      let lowAge = 0;
      let max = highs[i];
      let min = lows[i];
      for (let j = 1; j <= aroonPeriod; j += 1) {
        const idx = i - j;
        if (highs[idx] >= max) {
          max = highs[idx];
          highAge = j;
        }
        if (lows[idx] <= min) {
          min = lows[idx];
          lowAge = j;
        }
      }
      aroonUp[i] = ((aroonPeriod - highAge) / aroonPeriod) * 100;
      aroonDown[i] = ((aroonPeriod - lowAge) / aroonPeriod) * 100;
    }
    for (let i = 1; i < bars.length; i += 1) {
      const prevUp = aroonUp[i - 1];
      const prevDown = aroonDown[i - 1];
      const up = aroonUp[i];
      const down = aroonDown[i];
      if ([prevUp, prevDown, up, down].some((value) => value == null)) continue;
      if (crossedUp(prevUp!, prevDown!, up!, down!)) signals[i] = "BUY";
      else if (crossedDown(prevUp!, prevDown!, up!, down!)) signals[i] = "SELL";
    }
    return { signals, minBars: aroonPeriod + 1, series: { aroonUp, aroonDown } };
  }

  if (strategy === "SUPERTREND") {
    const atrPeriod = requireInt(params.atrPeriod ?? 10, "atrPeriod", 2);
    const atrMultiplier = requireNumber(params.atrMultiplier ?? 3, "atrMultiplier");
    if (atrMultiplier <= 0) throw new ValidationError("atrMultiplier must be positive.");
    const atr = atrSeries(highs, lows, closes, atrPeriod);
    const supertrend: Array<number | null> = Array(bars.length).fill(null);
    const trend: Array<number | null> = Array(bars.length).fill(null);
    let finalUpper = 0;
    let finalLower = 0;
    let started = false;
    for (let i = 0; i < bars.length; i += 1) {
      if (atr[i] == null) continue;
      const hl2 = midpoint(highs[i], lows[i]);
      const basicUpper = hl2 + atrMultiplier * atr[i]!;
      const basicLower = hl2 - atrMultiplier * atr[i]!;
      if (!started) {
        finalUpper = basicUpper;
        finalLower = basicLower;
        trend[i] = closes[i] >= hl2 ? 1 : -1;
        supertrend[i] = trend[i] === 1 ? finalLower : finalUpper;
        started = true;
        continue;
      }
      finalUpper = basicUpper < finalUpper || closes[i - 1] > finalUpper ? basicUpper : finalUpper;
      finalLower = basicLower > finalLower || closes[i - 1] < finalLower ? basicLower : finalLower;
      const prevTrend = trend[i - 1] ?? 1;
      if (prevTrend === 1) {
        if (closes[i] < finalLower) {
          trend[i] = -1;
          supertrend[i] = finalUpper;
        } else {
          trend[i] = 1;
          supertrend[i] = finalLower;
        }
      } else if (closes[i] > finalUpper) {
        trend[i] = 1;
        supertrend[i] = finalLower;
      } else {
        trend[i] = -1;
        supertrend[i] = finalUpper;
      }
      if (trend[i - 1] === -1 && trend[i] === 1) signals[i] = "BUY";
      else if (trend[i - 1] === 1 && trend[i] === -1) signals[i] = "SELL";
    }
    return { signals, minBars: atrPeriod + 3, series: { supertrend } };
  }

  if (strategy === "PSAR") {
    const step = requireNumber(params.psarStep ?? 0.02, "psarStep");
    const maxAf = requireNumber(params.psarMax ?? 0.2, "psarMax");
    if (step <= 0 || maxAf <= 0 || step >= maxAf) {
      throw new ValidationError("psarStep must be positive and below psarMax.");
    }
    const psar: Array<number | null> = Array(bars.length).fill(null);
    if (bars.length < 2) {
      return { signals, minBars: 5, series: { psar } };
    }
    let up = closes[1] >= closes[0];
    let af = step;
    let ep = up ? highs[0] : lows[0];
    let value = up ? lows[0] : highs[0];
    psar[0] = value;
    for (let i = 1; i < bars.length; i += 1) {
      value += af * (ep - value);
      if (up) {
        value = Math.min(value, lows[i - 1], i >= 2 ? lows[i - 2] : lows[i - 1]);
        if (lows[i] < value) {
          up = false;
          value = ep;
          ep = lows[i];
          af = step;
          signals[i] = "SELL";
        } else if (highs[i] > ep) {
          ep = highs[i];
          af = Math.min(maxAf, af + step);
        }
      } else {
        value = Math.max(value, highs[i - 1], i >= 2 ? highs[i - 2] : highs[i - 1]);
        if (highs[i] > value) {
          up = true;
          value = ep;
          ep = highs[i];
          af = step;
          signals[i] = "BUY";
        } else if (lows[i] < ep) {
          ep = lows[i];
          af = Math.min(maxAf, af + step);
        }
      }
      psar[i] = value;
    }
    return { signals, minBars: 5, series: { psar } };
  }

  if (strategy === "ICHIMOKU") {
    const tenkanPeriod = requireInt(params.tenkanPeriod ?? 9, "tenkanPeriod", 2);
    const kijunPeriod = requireInt(params.kijunPeriod ?? 26, "kijunPeriod", 3);
    if (tenkanPeriod >= kijunPeriod) throw new ValidationError("tenkanPeriod must be less than kijunPeriod.");
    const tenkanHL = rollingHighLow(highs, lows, tenkanPeriod);
    const kijunHL = rollingHighLow(highs, lows, kijunPeriod);
    const tenkan: Array<number | null> = tenkanHL.high.map((high, i) =>
      high == null || tenkanHL.low[i] == null ? null : midpoint(high, tenkanHL.low[i]!),
    );
    const kijun: Array<number | null> = kijunHL.high.map((high, i) =>
      high == null || kijunHL.low[i] == null ? null : midpoint(high, kijunHL.low[i]!),
    );
    for (let i = 1; i < bars.length; i += 1) {
      const prevT = tenkan[i - 1];
      const prevK = kijun[i - 1];
      const t = tenkan[i];
      const k = kijun[i];
      if ([prevT, prevK, t, k].some((value) => value == null)) continue;
      if (crossedUp(prevT!, prevK!, t!, k!)) signals[i] = "BUY";
      else if (crossedDown(prevT!, prevK!, t!, k!)) signals[i] = "SELL";
    }
    return { signals, minBars: kijunPeriod + 1, series: { tenkan, kijun } };
  }

  if (strategy === "KELTNER") {
    const keltnerPeriod = requireInt(params.keltnerPeriod ?? 20, "keltnerPeriod", 2);
    const atrPeriod = requireInt(params.atrPeriod ?? 10, "atrPeriod", 2);
    const atrMultiplier = requireNumber(params.atrMultiplier ?? 2, "atrMultiplier");
    if (atrMultiplier <= 0) throw new ValidationError("atrMultiplier must be positive.");
    const middle = emaSeries(closes, keltnerPeriod);
    const atr = atrSeries(highs, lows, closes, atrPeriod);
    const keltnerUpper: Array<number | null> = Array(bars.length).fill(null);
    const keltnerLower: Array<number | null> = Array(bars.length).fill(null);
    for (let i = 0; i < bars.length; i += 1) {
      if (middle[i] == null || atr[i] == null) continue;
      keltnerUpper[i] = middle[i]! + atrMultiplier * atr[i]!;
      keltnerLower[i] = middle[i]! - atrMultiplier * atr[i]!;
    }
    for (let i = 1; i < bars.length; i += 1) {
      const prevLower = keltnerLower[i - 1];
      const prevUpper = keltnerUpper[i - 1];
      const lower = keltnerLower[i];
      const upper = keltnerUpper[i];
      if ([prevLower, prevUpper, lower, upper].some((value) => value == null)) continue;
      if (closes[i - 1] <= prevLower! && closes[i] > lower!) signals[i] = "BUY";
      else if (closes[i - 1] >= prevUpper! && closes[i] < upper!) signals[i] = "SELL";
    }
    return {
      signals,
      minBars: Math.max(keltnerPeriod, atrPeriod) + 2,
      series: { keltnerUpper, keltnerLower, keltnerMid: middle },
    };
  }

  if (strategy === "BUY_HOLD") {
    signals[0] = "BUY";
    return { signals, minBars: 2, series: {} };
  }

  throw new ValidationError("Unsupported strategy.");
}
