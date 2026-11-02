import { SMA, RSI } from "technicalindicators";
import { DataError, fetchHistoricalData } from "../services/dataService.js";

const STRATEGIES = new Set(["MA_CROSSOVER", "RSI"]);
const ASSET_TYPES = new Set(["STOCK", "CRYPTO"]);
const TIMEFRAMES = {
  "1Y": 365,
  "3Y": 365 * 3,
  "5Y": 365 * 5,
};

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
    this.status = 400;
  }
}

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function timeframeToRange(timeframe = "3Y") {
  const days = TIMEFRAMES[timeframe];
  if (!days) {
    throw new ValidationError("timeframe must be one of 1Y, 3Y, or 5Y.");
  }
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function padIndicator(values, length) {
  const offset = length - values.length;
  const padded = Array(length).fill(null);
  for (let i = 0; i < values.length; i += 1) {
    padded[offset + i] = values[i];
  }
  return padded;
}

function computeSignals(bars, strategy, params) {
  const closes = bars.map((bar) => bar.close);

  if (strategy === "MA_CROSSOVER") {
    const shortPeriod = Number(params.shortPeriod);
    const longPeriod = Number(params.longPeriod);
    if (!Number.isInteger(shortPeriod) || !Number.isInteger(longPeriod)) {
      throw new ValidationError("MA_CROSSOVER requires integer shortPeriod and longPeriod.");
    }
    if (shortPeriod < 2 || longPeriod < 3 || shortPeriod >= longPeriod) {
      throw new ValidationError("shortPeriod must be at least 2 and less than longPeriod.");
    }

    const shortSma = padIndicator(SMA.calculate({ period: shortPeriod, values: closes }), bars.length);
    const longSma = padIndicator(SMA.calculate({ period: longPeriod, values: closes }), bars.length);
    const signals = Array(bars.length).fill("HOLD");

    for (let i = 1; i < bars.length; i += 1) {
      const prevShort = shortSma[i - 1];
      const prevLong = longSma[i - 1];
      const short = shortSma[i];
      const long = longSma[i];
      if ([prevShort, prevLong, short, long].some((value) => value == null)) continue;
      if (prevShort <= prevLong && short > long) signals[i] = "BUY";
      else if (prevShort >= prevLong && short < long) signals[i] = "SELL";
    }

    return { signals, minBars: longPeriod + 1 };
  }

  const rsiPeriod = Number(params.rsiPeriod ?? params.period);
  const oversold = Number(params.oversold ?? params.oversoldThreshold);
  const overbought = Number(params.overbought ?? params.overboughtThreshold);
  if (![rsiPeriod, oversold, overbought].every(Number.isFinite)) {
    throw new ValidationError(
      "RSI requires rsiPeriod, oversold (buy threshold), and overbought (sell threshold).",
    );
  }
  if (!Number.isInteger(rsiPeriod) || rsiPeriod < 2) {
    throw new ValidationError("rsiPeriod must be an integer of at least 2.");
  }
  if (oversold <= 0 || overbought >= 100 || oversold >= overbought) {
    throw new ValidationError("oversold must be below overbought, within 0–100.");
  }

  const rsi = padIndicator(RSI.calculate({ period: rsiPeriod, values: closes }), bars.length);
  const signals = Array(bars.length).fill("HOLD");

  for (let i = 1; i < bars.length; i += 1) {
    const prev = rsi[i - 1];
    const current = rsi[i];
    if (prev == null || current == null) continue;
    if (prev <= oversold && current > oversold) signals[i] = "BUY";
    else if (prev >= overbought && current < overbought) signals[i] = "SELL";
  }

  return { signals, minBars: rsiPeriod + 2 };
}

function runEngine(bars, signals, startingCapital) {
  let cash = startingCapital;
  let shares = 0;
  let pending = null;
  const trades = [];
  let entryPrice = null;
  const equityCurve = [];

  const firstOpen = bars[0].open;
  const benchmarkShares = startingCapital / firstOpen;

  for (let i = 0; i < bars.length; i += 1) {
    const bar = bars[i];

    if (pending) {
      if (pending === "BUY" && shares === 0 && cash > 0) {
        shares = cash / bar.open;
        cash = 0;
        entryPrice = bar.open;
      } else if (pending === "SELL" && shares > 0) {
        const proceeds = shares * bar.open;
        const pnl = proceeds - (entryPrice ?? bar.open) * shares;
        trades.push({ pnl });
        cash = proceeds;
        shares = 0;
        entryPrice = null;
      }
      pending = null;
    }

    const invested = shares * bar.close;
    const portfolioValue = cash + invested;
    const benchmarkValue = benchmarkShares * bar.close;
    equityCurve.push({
      date: bar.date,
      portfolioValue: round(portfolioValue, 2),
      benchmarkValue: round(benchmarkValue, 2),
    });

    if (i < bars.length - 1) {
      if (signals[i] === "BUY" && shares === 0) pending = "BUY";
      else if (signals[i] === "SELL" && shares > 0) pending = "SELL";
    }
  }

  if (shares > 0) {
    const last = bars[bars.length - 1];
    const proceeds = shares * last.close;
    trades.push({ pnl: proceeds - (entryPrice ?? last.close) * shares });
  }

  const finalValue = equityCurve[equityCurve.length - 1].portfolioValue;
  const totalReturn = ((finalValue - startingCapital) / startingCapital) * 100;

  let peak = equityCurve[0].portfolioValue;
  let maxDrawdown = 0;
  for (const point of equityCurve) {
    if (point.portfolioValue > peak) peak = point.portfolioValue;
    const drawdown = ((point.portfolioValue - peak) / peak) * 100;
    if (drawdown < maxDrawdown) maxDrawdown = drawdown;
  }

  const totalTrades = trades.length;
  const wins = trades.filter((trade) => trade.pnl > 0).length;
  const winRate = totalTrades === 0 ? 0 : (wins / totalTrades) * 100;

  return {
    totalReturn: round(totalReturn),
    maxDrawdown: round(maxDrawdown),
    winRate: round(winRate),
    totalTrades,
    equityCurve,
  };
}

export async function runBacktest(req, res) {
  try {
    const body = req.body || {};
    const ticker = typeof body.ticker === "string" ? body.ticker.trim().toUpperCase() : "";
    const assetType = body.assetType;
    const strategy = body.strategy;
    const params = body.params || {};
    const startingCapital = Number(body.startingCapital);
    const timeframe = body.timeframe || "3Y";

    if (!ticker) {
      throw new ValidationError("Missing ticker.");
    }
    if (!ASSET_TYPES.has(assetType)) {
      throw new ValidationError("assetType must be STOCK or CRYPTO.");
    }
    if (!STRATEGIES.has(strategy)) {
      throw new ValidationError("strategy must be MA_CROSSOVER or RSI.");
    }
    if (!Number.isFinite(startingCapital) || startingCapital <= 0) {
      throw new ValidationError("startingCapital must be a positive number.");
    }

    const { startDate, endDate } = timeframeToRange(timeframe);
    const bars = await fetchHistoricalData(ticker, assetType, startDate, endDate);
    const { signals, minBars } = computeSignals(bars, strategy, params);

    if (bars.length < minBars) {
      throw new ValidationError(
        `Data gap: ${bars.length} valid bars is not enough for this strategy (need at least ${minBars}).`,
      );
    }

    const result = runEngine(bars, signals, startingCapital);
    return res.json(result);
  } catch (error) {
    const status = error.status || (error instanceof DataError ? 400 : 500);
    const message = error.message || "Backtest failed.";
    if (status >= 500) {
      console.error(error);
    }
    return res.status(status >= 400 ? status : 500).json({ error: message });
  }
}
