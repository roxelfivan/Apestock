import type { Request, Response } from "express";
import { RSI, SMA } from "technicalindicators";
import { DataError, fetchHistoricalData } from "../services/dataService.js";
import type {
  AssetType,
  BacktestRequest,
  BacktestResult,
  EquityPoint,
  OhlcBar,
  Signal,
  StrategyName,
  StrategyParams,
  Timeframe,
  TradeEvent,
} from "../types.js";

const STRATEGIES = new Set<StrategyName>(["MA_CROSSOVER", "RSI"]);
const ASSET_TYPES = new Set<AssetType>(["STOCK", "CRYPTO"]);
const TIMEFRAMES: Record<Timeframe, number> = {
  "1Y": 365,
  "3Y": 365 * 3,
  "5Y": 365 * 5,
};

export class ValidationError extends Error {
  status = 400;

  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function isTimeframe(value: string): value is Timeframe {
  return value === "1Y" || value === "3Y" || value === "5Y";
}

function timeframeToRange(timeframe: string = "3Y"): { startDate: string; endDate: string } {
  if (!isTimeframe(timeframe)) {
    throw new ValidationError("timeframe must be one of 1Y, 3Y, or 5Y.");
  }
  const days = TIMEFRAMES[timeframe];
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function padIndicator(values: number[], length: number): Array<number | null> {
  const offset = length - values.length;
  const padded: Array<number | null> = Array(length).fill(null);
  for (let i = 0; i < values.length; i += 1) {
    padded[offset + i] = values[i];
  }
  return padded;
}

function computeSignals(
  bars: OhlcBar[],
  strategy: StrategyName,
  params: StrategyParams,
): { signals: Signal[]; minBars: number } {
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
    const signals: Signal[] = Array(bars.length).fill("HOLD");

    for (let i = 1; i < bars.length; i += 1) {
      const prevShort = shortSma[i - 1];
      const prevLong = longSma[i - 1];
      const short = shortSma[i];
      const long = longSma[i];
      if ([prevShort, prevLong, short, long].some((value) => value == null)) continue;
      if (prevShort! <= prevLong! && short! > long!) signals[i] = "BUY";
      else if (prevShort! >= prevLong! && short! < long!) signals[i] = "SELL";
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
  const signals: Signal[] = Array(bars.length).fill("HOLD");

  for (let i = 1; i < bars.length; i += 1) {
    const prev = rsi[i - 1];
    const current = rsi[i];
    if (prev == null || current == null) continue;
    if (prev <= oversold && current > oversold) signals[i] = "BUY";
    else if (prev >= overbought && current < overbought) signals[i] = "SELL";
  }

  return { signals, minBars: rsiPeriod + 2 };
}

function runEngine(
  bars: OhlcBar[],
  signals: Signal[],
  startingCapital: number,
  tradePercent: number,
): BacktestResult {
  let cash = startingCapital;
  const lots: Array<{ shares: number; entryPrice: number }> = [];
  let pending: Signal | null = null;
  const trades: Array<{ pnl: number }> = [];
  const events: TradeEvent[] = [];
  const equityCurve: EquityPoint[] = [];
  const slice = startingCapital * (tradePercent / 100);

  const firstOpen = bars[0].open;
  const benchmarkShares = startingCapital / firstOpen;

  const openShares = () => lots.reduce((sum, lot) => sum + lot.shares, 0);

  for (let i = 0; i < bars.length; i += 1) {
    const bar = bars[i];

    if (pending) {
      if (pending === "BUY" && cash > 0) {
        const spend = Math.min(cash, slice);
        if (spend > 0 && bar.open > 0) {
          lots.push({ shares: spend / bar.open, entryPrice: bar.open });
          cash -= spend;
          events.push({ date: bar.date, side: "BUY" });
        }
      } else if (pending === "SELL" && lots.length > 0) {
        const lot = lots.shift()!;
        const proceeds = lot.shares * bar.open;
        trades.push({ pnl: proceeds - lot.entryPrice * lot.shares });
        cash += proceeds;
        events.push({ date: bar.date, side: "SELL" });
      }
      pending = null;
    }

    const portfolioValue = cash + openShares() * bar.close;
    const benchmarkValue = benchmarkShares * bar.close;
    equityCurve.push({
      date: bar.date,
      portfolioValue: round(portfolioValue, 2),
      benchmarkValue: round(benchmarkValue, 2),
    });

    if (i < bars.length - 1) {
      if (signals[i] === "BUY" && cash > 0) pending = "BUY";
      else if (signals[i] === "SELL" && lots.length > 0) pending = "SELL";
    }
  }

  if (lots.length > 0) {
    const last = bars[bars.length - 1];
    for (const lot of lots) {
      trades.push({ pnl: lot.shares * last.close - lot.entryPrice * lot.shares });
      events.push({ date: last.date, side: "SELL" });
    }
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
    events,
  };
}

function httpStatus(error: unknown): number {
  if (error instanceof ValidationError || error instanceof DataError) return error.status;
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = Number((error as { status?: unknown }).status);
    if (Number.isFinite(status) && status >= 400) return status;
  }
  return 500;
}

export async function runBacktest(req: Request, res: Response): Promise<Response> {
  try {
    const body = (req.body ?? {}) as BacktestRequest;
    const ticker = typeof body.ticker === "string" ? body.ticker.trim().toUpperCase() : "";
    const assetType = body.assetType;
    const strategy = body.strategy;
    const params = body.params ?? {};
    const startingCapital = Number(body.startingCapital);
    const tradePercent = body.tradePercent == null ? 20 : Number(body.tradePercent);
    const timeframe = body.timeframe || "3Y";

    if (!ticker) {
      throw new ValidationError("Missing ticker.");
    }
    if (!ASSET_TYPES.has(assetType as AssetType)) {
      throw new ValidationError("assetType must be STOCK or CRYPTO.");
    }
    if (!STRATEGIES.has(strategy as StrategyName)) {
      throw new ValidationError("strategy must be MA_CROSSOVER or RSI.");
    }
    if (!Number.isFinite(startingCapital) || startingCapital <= 0) {
      throw new ValidationError("startingCapital must be a positive number.");
    }
    if (!Number.isFinite(tradePercent) || tradePercent < 1 || tradePercent > 100) {
      throw new ValidationError("tradePercent must be a number from 1 to 100.");
    }

    const { startDate, endDate } = timeframeToRange(timeframe);
    const bars = await fetchHistoricalData(ticker, assetType as AssetType, startDate, endDate);
    const { signals, minBars } = computeSignals(bars, strategy as StrategyName, params);

    if (bars.length < minBars) {
      throw new ValidationError(
        `Data gap: ${bars.length} valid bars is not enough for this strategy (need at least ${minBars}).`,
      );
    }

    const result = runEngine(bars, signals, startingCapital, tradePercent);
    return res.json(result);
  } catch (error) {
    const status = httpStatus(error);
    const message = error instanceof Error ? error.message : "Backtest failed.";
    if (status >= 500) {
      console.error(error);
    }
    return res.status(status).json({ error: message });
  }
}
