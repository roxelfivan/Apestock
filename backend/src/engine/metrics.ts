import { linReg, mean, round, stdev } from "../lib/math.js";
import type { ClosedTrade, DrawdownPoint, EquityPoint, RiskMetrics } from "../types.js";

const TRADING_DAYS = 252;
const RISK_FREE = 0;

function dailyReturns(values: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < values.length; i += 1) {
    const prev = values[i - 1];
    if (prev > 0) out.push(values[i] / prev - 1);
  }
  return out;
}

export function maxDrawdownPct(equity: number[]): number {
  if (equity.length === 0) return 0;
  let peak = equity[0];
  let maxDrawdown = 0;
  for (const value of equity) {
    if (value > peak) peak = value;
    if (peak > 0) {
      const drawdown = ((value - peak) / peak) * 100;
      if (drawdown < maxDrawdown) maxDrawdown = drawdown;
    }
  }
  return maxDrawdown;
}

export function drawdownCurve(equityCurve: EquityPoint[]): DrawdownPoint[] {
  let peak = equityCurve[0]?.portfolioValue ?? 0;
  return equityCurve.map((point) => {
    if (point.portfolioValue > peak) peak = point.portfolioValue;
    const drawdown = peak > 0 ? ((point.portfolioValue - peak) / peak) * 100 : 0;
    return { date: point.date, drawdown: round(drawdown, 2) };
  });
}

function monthlyReturns(equityCurve: EquityPoint[]): Array<{ month: string; returnPct: number }> {
  const byMonth = new Map<string, { first: number; last: number }>();
  for (const point of equityCurve) {
    const month = point.date.slice(0, 7);
    const existing = byMonth.get(month);
    if (!existing) byMonth.set(month, { first: point.portfolioValue, last: point.portfolioValue });
    else existing.last = point.portfolioValue;
  }
  return [...byMonth.entries()].map(([month, values]) => ({
    month,
    returnPct: values.first > 0 ? round(((values.last - values.first) / values.first) * 100, 2) : 0,
  }));
}

export function computeRiskMetrics(
  startingCapital: number,
  equityCurve: EquityPoint[],
  trades: ClosedTrade[],
): RiskMetrics {
  const values = equityCurve.map((point) => point.portfolioValue);
  const bench = equityCurve.map((point) => point.benchmarkValue);
  const portRets = dailyReturns(values);
  const benchRets = dailyReturns(bench);
  const years = Math.max(daysFromCurve(equityCurve) / 365, 1 / 365);
  const finalValue = values[values.length - 1] ?? startingCapital;
  const cagr = startingCapital > 0 ? (finalValue / startingCapital) ** (1 / years) - 1 : 0;
  const vol = stdev(portRets) * Math.sqrt(TRADING_DAYS);
  const excessDaily = portRets.map((value) => value - RISK_FREE / TRADING_DAYS);
  const sharpe = stdev(excessDaily) > 0 ? (mean(excessDaily) * TRADING_DAYS) / (stdev(excessDaily) * Math.sqrt(TRADING_DAYS)) : 0;
  const downside = portRets.filter((value) => value < 0);
  const sortino =
    stdev(downside) > 0 ? (mean(excessDaily) * TRADING_DAYS) / (stdev(downside) * Math.sqrt(TRADING_DAYS)) : 0;
  const mdd = Math.abs(maxDrawdownPct(values));
  const calmar = mdd > 0 ? (cagr * 100) / mdd : 0;
  const benchFinal = bench[bench.length - 1] ?? startingCapital;
  const benchReturn = startingCapital > 0 ? ((benchFinal - startingCapital) / startingCapital) * 100 : 0;
  const totalReturn = startingCapital > 0 ? ((finalValue - startingCapital) / startingCapital) * 100 : 0;
  const { alpha, beta } = linReg(benchRets, portRets);
  const wins = trades.filter((trade) => trade.pnl > 0);
  const losses = trades.filter((trade) => trade.pnl < 0);
  const grossWin = wins.reduce((sum, trade) => sum + trade.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.pnl, 0));
  const signalTrades = trades.filter((trade) => trade.reason === "signal");
  const signalWins = signalTrades.filter((trade) => trade.pnl > 0).length;

  let streak = 0;
  let maxConsecutiveLosses = 0;
  for (const trade of trades) {
    if (trade.pnl < 0) {
      streak += 1;
      if (streak > maxConsecutiveLosses) maxConsecutiveLosses = streak;
    } else {
      streak = 0;
    }
  }

  const investedDays = estimateTimeInMarket(equityCurve, trades);

  return {
    cagr: round(cagr * 100, 2),
    volatility: round(vol * 100, 2),
    sharpe: round(sharpe, 2),
    sortino: round(sortino, 2),
    calmar: round(calmar, 2),
    excessReturn: round(totalReturn - benchReturn, 2),
    alpha: round(alpha * TRADING_DAYS * 100, 2),
    beta: round(beta, 2),
    profitFactor: round(grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0, 2),
    avgWin: round(wins.length ? mean(wins.map((trade) => trade.pnl)) : 0, 2),
    avgLoss: round(losses.length ? mean(losses.map((trade) => trade.pnl)) : 0, 2),
    avgHoldDays: round(trades.length ? mean(trades.map((trade) => trade.holdDays)) : 0, 1),
    timeInMarket: round(investedDays * 100, 1),
    maxConsecutiveLosses,
    winRateSignal: round(signalTrades.length === 0 ? 0 : (signalWins / signalTrades.length) * 100, 2),
    signalTrades: signalTrades.length,
    monthlyReturns: monthlyReturns(equityCurve),
  };
}

function daysFromCurve(equityCurve: EquityPoint[]): number {
  if (equityCurve.length < 2) return 1;
  const start = Date.parse(`${equityCurve[0].date}T00:00:00.000Z`);
  const end = Date.parse(`${equityCurve[equityCurve.length - 1].date}T00:00:00.000Z`);
  return Math.max(1, Math.round((end - start) / 86_400_000));
}

function estimateTimeInMarket(equityCurve: EquityPoint[], trades: ClosedTrade[]): number {
  if (equityCurve.length === 0) return 0;
  const dates = new Set<string>();
  for (const trade of trades) {
    for (const point of equityCurve) {
      if (point.date >= trade.entryDate && point.date <= trade.exitDate) dates.add(point.date);
    }
  }
  return dates.size / equityCurve.length;
}
