import { BollingerBands, EMA, MACD, RSI, SMA } from "technicalindicators";
import { ValidationError } from "../errors.js";
import type { OhlcBar, Signal, StrategyName, StrategyParams } from "../types.js";

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

export function warmupBars(strategy: StrategyName, params: StrategyParams): number {
  switch (strategy) {
    case "MA_CROSSOVER":
    case "EMA_CROSSOVER":
      return requireInt(params.longPeriod, "longPeriod", 3) + 1;
    case "RSI":
      return requireInt(params.rsiPeriod ?? params.period, "rsiPeriod", 2) + 2;
    case "MACD":
      return requireInt(params.slowPeriod ?? 26, "slowPeriod", 3) + requireInt(params.signalPeriod ?? 9, "signalPeriod", 1) + 1;
    case "BOLLINGER":
      return requireInt(params.bbPeriod ?? 20, "bbPeriod", 2) + 2;
    case "DONCHIAN":
      return requireInt(params.donchianPeriod ?? 20, "donchianPeriod", 2) + 1;
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
    const rsiPeriod = requireInt(params.rsiPeriod ?? params.period, "rsiPeriod", 2);
    const oversold = requireNumber(params.oversold ?? params.oversoldThreshold, "oversold");
    const overbought = requireNumber(params.overbought ?? params.overboughtThreshold, "overbought");
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

  signals[0] = "BUY";
  return { signals, minBars: 2, series: {} };
}
