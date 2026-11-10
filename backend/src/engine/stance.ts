import type { CommitteeVote, OhlcBar, StrategyName, StrategyParams } from "../types.js";

const MA_DEADBAND = 0.002;
const PRICE_DEADBAND = 0.003;
const ADX_TREND = 20;
const AROON_GAP = 25;

function reading(series: Record<string, Array<number | null>>, name: string, index: number): number | null {
  const value = series[name]?.[index];
  return value == null || !Number.isFinite(value) ? null : value;
}

function compareWithBand(left: number, right: number, band: number): CommitteeVote {
  const mid = (Math.abs(left) + Math.abs(right)) / 2;
  const scale = mid > 0 ? mid : 1;
  if (Math.abs(left - right) / scale <= band) return "HOLD";
  return left > right ? "BUY" : "SELL";
}

function oscillatorZone(value: number, oversold: number, overbought: number): CommitteeVote {
  if (value <= oversold) return "BUY";
  if (value >= overbought) return "SELL";
  return "HOLD";
}

function nearPrice(close: number, level: number, band = PRICE_DEADBAND): boolean {
  return close > 0 && Math.abs(close - level) / close <= band;
}

export function regimeVote(
  strategy: StrategyName,
  bars: OhlcBar[],
  series: Record<string, Array<number | null>>,
  params: StrategyParams,
  index: number,
): { vote: CommitteeVote; reason: string } {
  const close = bars[index]?.close;
  if (close == null) return { vote: "HOLD", reason: "No close" };

  if (strategy === "MA_CROSSOVER" || strategy === "EMA_CROSSOVER" || strategy === "WMA_CROSSOVER") {
    const shortMa = reading(series, "shortMa", index);
    const longMa = reading(series, "longMa", index);
    if (shortMa == null || longMa == null) return { vote: "HOLD", reason: "Averages not ready" };
    const vote = compareWithBand(shortMa, longMa, MA_DEADBAND);
    return {
      vote,
      reason: vote === "HOLD" ? "Averages are inside a 0.2% deadband" : `Short MA ${shortMa > longMa ? "above" : "below"} long MA`,
    };
  }

  if (strategy === "HMA") {
    const hma = reading(series, "hma", index);
    if (hma == null) return { vote: "HOLD", reason: "HMA not ready" };
    if (nearPrice(close, hma)) return { vote: "HOLD", reason: "Close is hugging the Hull MA" };
    return { vote: close > hma ? "BUY" : "SELL", reason: close > hma ? "Close above Hull MA" : "Close below Hull MA" };
  }

  if (strategy === "RSI") {
    const rsi = reading(series, "rsi", index);
    const oversold = Number(params.oversold ?? 30);
    const overbought = Number(params.overbought ?? 70);
    if (rsi == null) return { vote: "HOLD", reason: "RSI not ready" };
    const vote = oscillatorZone(rsi, oversold, overbought);
    return {
      vote,
      reason: vote === "HOLD" ? `RSI ${rsi.toFixed(1)} is between ${oversold} and ${overbought}` : `RSI ${rsi.toFixed(1)}`,
    };
  }

  if (strategy === "STOCHASTIC") {
    const k = reading(series, "stochK", index);
    const oversold = Number(params.oversold ?? 20);
    const overbought = Number(params.overbought ?? 80);
    if (k == null) return { vote: "HOLD", reason: "%K not ready" };
    const vote = oscillatorZone(k, oversold, overbought);
    return {
      vote,
      reason: vote === "HOLD" ? `%K ${k.toFixed(1)} is between ${oversold} and ${overbought}` : `%K ${k.toFixed(1)}`,
    };
  }

  if (strategy === "STOCH_RSI") {
    const k = reading(series, "stochRsi", index);
    const oversold = Number(params.oversold ?? 20);
    const overbought = Number(params.overbought ?? 80);
    if (k == null) return { vote: "HOLD", reason: "StochRSI not ready" };
    const vote = oscillatorZone(k, oversold, overbought);
    return {
      vote,
      reason: vote === "HOLD" ? `StochRSI ${k.toFixed(1)} is between ${oversold} and ${overbought}` : `StochRSI ${k.toFixed(1)}`,
    };
  }

  if (strategy === "WILLIAMS_R") {
    const wr = reading(series, "williamsR", index);
    const oversold = Number(params.oversold ?? -80);
    const overbought = Number(params.overbought ?? -20);
    if (wr == null) return { vote: "HOLD", reason: "%R not ready" };
    const vote = oscillatorZone(wr, oversold, overbought);
    return {
      vote,
      reason: vote === "HOLD" ? `%R ${wr.toFixed(1)} is between ${oversold} and ${overbought}` : `%R ${wr.toFixed(1)}`,
    };
  }

  if (strategy === "CCI") {
    const cci = reading(series, "cci", index);
    const oversold = Number(params.oversold ?? -100);
    const overbought = Number(params.overbought ?? 100);
    if (cci == null) return { vote: "HOLD", reason: "CCI not ready" };
    const vote = oscillatorZone(cci, oversold, overbought);
    return {
      vote,
      reason: vote === "HOLD" ? `CCI ${cci.toFixed(1)} is between ${oversold} and ${overbought}` : `CCI ${cci.toFixed(1)}`,
    };
  }

  if (strategy === "ULTIMATE") {
    const uo = reading(series, "uo", index);
    const oversold = Number(params.oversold ?? 30);
    const overbought = Number(params.overbought ?? 70);
    if (uo == null) return { vote: "HOLD", reason: "UO not ready" };
    const vote = oscillatorZone(uo, oversold, overbought);
    return {
      vote,
      reason: vote === "HOLD" ? `UO ${uo.toFixed(1)} is between ${oversold} and ${overbought}` : `UO ${uo.toFixed(1)}`,
    };
  }

  if (strategy === "MACD" || strategy === "PPO" || strategy === "TRIX" || strategy === "ROC") {
    const lineName = strategy === "MACD" ? "macd" : strategy === "PPO" ? "ppo" : strategy === "TRIX" ? "trix" : "roc";
    const line = reading(series, lineName, index);
    const signal = reading(series, "signal", index);
    if (line == null || signal == null) return { vote: "HOLD", reason: "Line not ready" };
    const deadband = strategy === "MACD" ? Math.max(Math.abs(close) * 0.0005, 0.01) : 0.05;
    if (Math.abs(line - signal) <= deadband) return { vote: "HOLD", reason: "Line is hugging its signal" };
    return { vote: line > signal ? "BUY" : "SELL", reason: line > signal ? "Line above signal" : "Line below signal" };
  }

  if (strategy === "AWESOME") {
    const ao = reading(series, "ao", index);
    if (ao == null) return { vote: "HOLD", reason: "AO not ready" };
    if (Math.abs(ao) <= close * 0.001) return { vote: "HOLD", reason: "Awesome oscillator is near zero" };
    return { vote: ao > 0 ? "BUY" : "SELL", reason: ao > 0 ? "AO above zero" : "AO below zero" };
  }

  if (strategy === "MOMENTUM") {
    const momentum = reading(series, "momentum", index);
    if (momentum == null) return { vote: "HOLD", reason: "Momentum not ready" };
    if (Math.abs(momentum) <= 0.01) return { vote: "HOLD", reason: "N-day return is inside ±1%" };
    return { vote: momentum > 0 ? "BUY" : "SELL", reason: momentum > 0 ? "N-day return positive" : "N-day return negative" };
  }

  if (strategy === "ADX") {
    const adx = reading(series, "adx", index);
    const plusDi = reading(series, "plusDi", index);
    const minusDi = reading(series, "minusDi", index);
    if (adx == null || plusDi == null || minusDi == null) return { vote: "HOLD", reason: "ADX not ready" };
    if (adx < ADX_TREND) return { vote: "HOLD", reason: `ADX ${adx.toFixed(1)} is below ${ADX_TREND} (no trend)` };
    return {
      vote: plusDi > minusDi ? "BUY" : "SELL",
      reason: plusDi > minusDi ? "+DI leads −DI" : "−DI leads +DI",
    };
  }

  if (strategy === "AROON") {
    const up = reading(series, "aroonUp", index);
    const down = reading(series, "aroonDown", index);
    if (up == null || down == null) return { vote: "HOLD", reason: "Aroon not ready" };
    if (Math.abs(up - down) < AROON_GAP) return { vote: "HOLD", reason: "Aroon Up and Down are close (range)" };
    return { vote: up > down ? "BUY" : "SELL", reason: up > down ? "Aroon Up leads" : "Aroon Down leads" };
  }

  if (strategy === "SUPERTREND") {
    const supertrend = reading(series, "supertrend", index);
    if (supertrend == null) return { vote: "HOLD", reason: "Supertrend not ready" };
    if (nearPrice(close, supertrend)) return { vote: "HOLD", reason: "Close is at the Supertrend line" };
    return { vote: close > supertrend ? "BUY" : "SELL", reason: close > supertrend ? "Close above Supertrend" : "Close below Supertrend" };
  }

  if (strategy === "PSAR") {
    const psar = reading(series, "psar", index);
    if (psar == null) return { vote: "HOLD", reason: "SAR not ready" };
    if (nearPrice(close, psar)) return { vote: "HOLD", reason: "Close is at the SAR dots" };
    return { vote: close > psar ? "BUY" : "SELL", reason: close > psar ? "Close above SAR" : "Close below SAR" };
  }

  if (strategy === "ICHIMOKU") {
    const tenkan = reading(series, "tenkan", index);
    const kijun = reading(series, "kijun", index);
    if (tenkan == null || kijun == null) return { vote: "HOLD", reason: "Ichimoku not ready" };
    const lo = Math.min(tenkan, kijun);
    const hi = Math.max(tenkan, kijun);
    if (close >= lo && close <= hi) return { vote: "HOLD", reason: "Close is between Tenkan and Kijun" };
    return { vote: close > hi ? "BUY" : "SELL", reason: close > hi ? "Close above TK lines" : "Close below TK lines" };
  }

  if (strategy === "BOLLINGER") {
    const upper = reading(series, "bbUpper", index);
    const lower = reading(series, "bbLower", index);
    if (upper == null || lower == null) return { vote: "HOLD", reason: "Bands not ready" };
    if (close <= lower) return { vote: "BUY", reason: "Close at or below the lower band" };
    if (close >= upper) return { vote: "SELL", reason: "Close at or above the upper band" };
    return { vote: "HOLD", reason: "Close is inside the bands" };
  }

  if (strategy === "KELTNER") {
    const upper = reading(series, "keltnerUpper", index);
    const lower = reading(series, "keltnerLower", index);
    if (upper == null || lower == null) return { vote: "HOLD", reason: "Channels not ready" };
    if (close <= lower) return { vote: "BUY", reason: "Close at or below the lower channel" };
    if (close >= upper) return { vote: "SELL", reason: "Close at or above the upper channel" };
    return { vote: "HOLD", reason: "Close is inside the channel" };
  }

  if (strategy === "DONCHIAN") {
    const high = reading(series, "donchianHigh", index);
    const low = reading(series, "donchianLow", index);
    if (high == null || low == null || high === low) return { vote: "HOLD", reason: "Channel not ready" };
    const position = (close - low) / (high - low);
    if (position >= 0.75) return { vote: "BUY", reason: "Close in the top quarter of the channel" };
    if (position <= 0.25) return { vote: "SELL", reason: "Close in the bottom quarter of the channel" };
    return { vote: "HOLD", reason: "Close is in the middle of the channel" };
  }

  return { vote: "HOLD", reason: "No zone rule" };
}
