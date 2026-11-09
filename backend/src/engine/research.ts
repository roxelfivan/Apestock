import { ValidationError } from "../errors.js";
import { fetchHistoricalData } from "../services/dataService.js";
import type {
  BacktestRequest,
  StrategyName,
  StrategyParams,
  SweepCell,
  SweepResult,
  WalkForwardFold,
  WalkForwardResult,
} from "../types.js";
import { authorizeParsedRequest, buildResult, parseBacktestRequest } from "./execute.js";

const SWEEP_WARNING =
  "Grid search overfits. Treat the best cell as a hypothesis, not a proven edge. Prefer walk-forward before acting on a parameter set.";

const WALK_FORWARD_WARNING =
  "Walk-forward still leaks assumptions (grid, folds, costs). A strong in-sample Sharpe that dies out of sample is the useful result.";

function uniqueParams(items: StrategyParams[]): StrategyParams[] {
  const seen = new Set<string>();
  const out: StrategyParams[] = [];
  for (const item of items) {
    const key = JSON.stringify(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function defaultGrid(strategy: StrategyName): StrategyParams[] {
  if (strategy === "MA_CROSSOVER" || strategy === "EMA_CROSSOVER") {
    const shorts = [10, 20, 50];
    const longs = [50, 100, 200];
    const grid: StrategyParams[] = [];
    for (const shortPeriod of shorts) {
      for (const longPeriod of longs) {
        if (shortPeriod < longPeriod) grid.push({ shortPeriod, longPeriod });
      }
    }
    return grid;
  }
  if (strategy === "RSI") {
    const grid: StrategyParams[] = [];
    for (const oversold of [20, 25, 30]) {
      for (const overbought of [70, 75, 80]) {
        grid.push({ rsiPeriod: 14, oversold, overbought });
      }
    }
    return grid;
  }
  if (strategy === "MACD") {
    return [
      { fastPeriod: 8, slowPeriod: 17, signalPeriod: 9 },
      { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
      { fastPeriod: 19, slowPeriod: 39, signalPeriod: 9 },
    ];
  }
  if (strategy === "BOLLINGER") {
    return [
      { bbPeriod: 20, bbStdDev: 2 },
      { bbPeriod: 20, bbStdDev: 2.5 },
      { bbPeriod: 50, bbStdDev: 2 },
    ];
  }
  if (strategy === "DONCHIAN") {
    return [{ donchianPeriod: 20 }, { donchianPeriod: 55 }, { donchianPeriod: 100 }];
  }
  if (strategy === "STOCHASTIC") {
    return [
      { kPeriod: 14, oversold: 20, overbought: 80 },
      { kPeriod: 14, oversold: 25, overbought: 75 },
      { kPeriod: 21, oversold: 20, overbought: 80 },
    ];
  }
  if (strategy === "MOMENTUM") {
    return [{ lookback: 10 }, { lookback: 20 }, { lookback: 60 }];
  }
  if (strategy === "WILLIAMS_R") {
    return [
      { wrPeriod: 14, oversold: -80, overbought: -20 },
      { wrPeriod: 14, oversold: -85, overbought: -15 },
      { wrPeriod: 21, oversold: -80, overbought: -20 },
    ];
  }
  if (strategy === "WMA_CROSSOVER") {
    return [
      { shortPeriod: 10, longPeriod: 30 },
      { shortPeriod: 20, longPeriod: 50 },
      { shortPeriod: 10, longPeriod: 50 },
    ];
  }
  if (strategy === "HMA") {
    return [{ hmaPeriod: 9 }, { hmaPeriod: 16 }, { hmaPeriod: 21 }];
  }
  if (strategy === "STOCH_RSI") {
    return [
      { stochRsiPeriod: 14, oversold: 20, overbought: 80 },
      { stochRsiPeriod: 14, oversold: 30, overbought: 70 },
      { stochRsiPeriod: 21, oversold: 20, overbought: 80 },
    ];
  }
  if (strategy === "PPO") {
    return [
      { fastPeriod: 8, slowPeriod: 17, signalPeriod: 9 },
      { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
      { fastPeriod: 19, slowPeriod: 39, signalPeriod: 9 },
    ];
  }
  if (strategy === "TRIX") {
    return [
      { trixPeriod: 9, trixSignalPeriod: 9 },
      { trixPeriod: 15, trixSignalPeriod: 9 },
      { trixPeriod: 21, trixSignalPeriod: 9 },
    ];
  }
  if (strategy === "CCI") {
    return [
      { cciPeriod: 14, oversold: -100, overbought: 100 },
      { cciPeriod: 20, oversold: -100, overbought: 100 },
      { cciPeriod: 20, oversold: -150, overbought: 150 },
    ];
  }
  if (strategy === "ULTIMATE") {
    return [
      { uoShort: 7, uoMid: 14, uoLong: 28, oversold: 30, overbought: 70 },
      { uoShort: 7, uoMid: 14, uoLong: 28, oversold: 25, overbought: 75 },
    ];
  }
  if (strategy === "AWESOME") {
    return [
      { aoFast: 5, aoSlow: 34 },
      { aoFast: 5, aoSlow: 21 },
    ];
  }
  if (strategy === "ROC") {
    return [
      { rocPeriod: 10, rocSignalPeriod: 9 },
      { rocPeriod: 12, rocSignalPeriod: 9 },
      { rocPeriod: 20, rocSignalPeriod: 9 },
    ];
  }
  if (strategy === "ADX") {
    return [{ adxPeriod: 10 }, { adxPeriod: 14 }, { adxPeriod: 21 }];
  }
  if (strategy === "AROON") {
    return [{ aroonPeriod: 14 }, { aroonPeriod: 25 }, { aroonPeriod: 50 }];
  }
  if (strategy === "SUPERTREND") {
    return [
      { atrPeriod: 7, atrMultiplier: 3 },
      { atrPeriod: 10, atrMultiplier: 3 },
      { atrPeriod: 10, atrMultiplier: 2 },
    ];
  }
  if (strategy === "PSAR") {
    return [
      { psarStep: 0.02, psarMax: 0.2 },
      { psarStep: 0.02, psarMax: 0.3 },
      { psarStep: 0.01, psarMax: 0.2 },
    ];
  }
  if (strategy === "ICHIMOKU") {
    return [
      { tenkanPeriod: 7, kijunPeriod: 22 },
      { tenkanPeriod: 9, kijunPeriod: 26 },
      { tenkanPeriod: 12, kijunPeriod: 30 },
    ];
  }
  if (strategy === "KELTNER") {
    return [
      { keltnerPeriod: 20, atrPeriod: 10, atrMultiplier: 2 },
      { keltnerPeriod: 20, atrPeriod: 10, atrMultiplier: 1.5 },
      { keltnerPeriod: 50, atrPeriod: 10, atrMultiplier: 2 },
    ];
  }
  return [{}];
}

function toCell(result: ReturnType<typeof buildResult>): SweepCell {
  return {
    params: result.params,
    totalReturn: result.totalReturn,
    maxDrawdown: result.maxDrawdown,
    sharpe: result.metrics.sharpe,
    cagr: result.metrics.cagr,
    totalTrades: result.totalTrades,
  };
}

export async function executeSweep(body: BacktestRequest): Promise<SweepResult> {
  const parsed = await authorizeParsedRequest(parseBacktestRequest(body));
  const bars = await fetchHistoricalData(parsed.ticker, parsed.assetType, parsed.fetchStart, parsed.endDate);
  const grid = uniqueParams(defaultGrid(parsed.strategy));
  const results = grid.map((params) =>
    toCell(buildResult({ ...parsed, params }, bars, { committee: false })),
  );
  return {
    ticker: parsed.ticker,
    strategy: parsed.strategy,
    warning: SWEEP_WARNING,
    results,
  };
}

export async function executeWalkForward(body: BacktestRequest): Promise<WalkForwardResult> {
  const folds = Math.min(5, Math.max(2, Number(body.folds ?? 3)));
  const parsed = await authorizeParsedRequest(parseBacktestRequest(body));
  const bars = await fetchHistoricalData(parsed.ticker, parsed.assetType, parsed.fetchStart, parsed.endDate);
  const startIndex = Math.max(0, bars.findIndex((bar) => bar.date >= parsed.startDate));
  const testBars = bars.slice(startIndex);
  if (testBars.length < folds * 40) {
    throw new ValidationError("Need more history for walk-forward (about 40 test bars per fold).");
  }

  const segment = Math.floor(testBars.length / folds);
  const foldSummaries: WalkForwardFold[] = [];
  const oosCurves: Array<ReturnType<typeof buildResult>> = [];

  for (let fold = 1; fold < folds; fold += 1) {
    const isEnd = startIndex + segment * fold;
    const oosEnd = fold === folds - 1 ? bars.length : startIndex + segment * (fold + 1);
    const isEndDate = bars[isEnd - 1]?.date ?? parsed.startDate;
    const oosStartDate = bars[isEnd]?.date ?? parsed.startDate;
    const oosEndDate = bars[oosEnd - 1]?.date ?? parsed.endDate;
    const grid = defaultGrid(parsed.strategy);
    let bestParams = grid[0];
    let bestSharpe = Number.NEGATIVE_INFINITY;
    for (const params of grid) {
      const isResult = buildResult(
        { ...parsed, params, startDate: parsed.startDate, endDate: isEndDate, timeframe: "CUSTOM" },
        bars.slice(0, isEnd),
        { committee: false },
      );
      if (isResult.metrics.sharpe > bestSharpe) {
        bestSharpe = isResult.metrics.sharpe;
        bestParams = params;
      }
    }
    const oos = buildResult(
      { ...parsed, params: bestParams, startDate: oosStartDate, endDate: oosEndDate, timeframe: "CUSTOM" },
      bars.slice(0, oosEnd),
      { committee: false },
    );
    oosCurves.push(oos);
    foldSummaries.push({
      fold,
      params: bestParams,
      inSampleSharpe: bestSharpe,
      outOfSampleReturn: oos.totalReturn,
      outOfSampleSharpe: oos.metrics.sharpe,
      startDate: oosStartDate,
      endDate: oosEndDate,
    });
  }

  const combined = stitchResults(oosCurves, parsed.ticker, parsed.strategy);
  return {
    ticker: parsed.ticker,
    strategy: parsed.strategy,
    warning: WALK_FORWARD_WARNING,
    folds: foldSummaries,
    combined,
  };
}

function stitchResults(
  parts: Array<ReturnType<typeof buildResult>>,
  ticker: string,
  strategy: StrategyName,
): ReturnType<typeof buildResult> {
  if (parts.length === 0) {
    throw new Error("Walk-forward produced no out-of-sample windows.");
  }
  const first = parts[0];
  const equityCurve = parts.flatMap((part, index) => {
    if (index === 0) return part.equityCurve;
    const prevEnd = equityCurveLast(parts[index - 1].equityCurve);
    const scale = prevEnd / (part.equityCurve[0]?.portfolioValue || prevEnd);
    const benchScale = (parts[index - 1].equityCurve.at(-1)?.benchmarkValue || 1) / (part.equityCurve[0]?.benchmarkValue || 1);
    return part.equityCurve.map((point) => ({
      date: point.date,
      portfolioValue: Math.round(point.portfolioValue * scale * 100) / 100,
      benchmarkValue: Math.round(point.benchmarkValue * benchScale * 100) / 100,
    }));
  });
  return {
    ...first,
    ticker,
    strategy,
    equityCurve,
    events: parts.flatMap((part) => part.events),
    trades: parts.flatMap((part) => part.trades),
    bars: parts.flatMap((part) => part.bars),
    drawdownCurve: parts.flatMap((part) => part.drawdownCurve),
    totalReturn: first.startingCapital
      ? Math.round((((equityCurve.at(-1)?.portfolioValue ?? first.startingCapital) - first.startingCapital) / first.startingCapital) * 10000) / 100
      : 0,
    testStartDate: first.testStartDate,
    endDate: parts.at(-1)?.endDate ?? first.endDate,
  };
}

function equityCurveLast(curve: Array<{ portfolioValue: number }>): number {
  return curve.at(-1)?.portfolioValue || 1;
}
