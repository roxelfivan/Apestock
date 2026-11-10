import { round } from "../lib/math.js";
import type {
  CommitteeMember,
  CommitteeResult,
  CommitteeVote,
  OhlcBar,
  Signal,
  StrategyName,
  StrategyParams,
} from "../types.js";
import { runEngine, type EngineConfig } from "./engine.js";
import { COMMITTEE_STRATEGIES, DEFAULT_STRATEGY_PARAMS, STRATEGY_LABELS } from "./defaults.js";
import { computeRiskMetrics, maxDrawdownPct } from "./metrics.js";
import { computeSignals, warmupBars } from "./signals.js";
import { regimeVote } from "./stance.js";

export function committeeFetchWarmup(): number {
  let maxWarmup = 0;
  for (const strategy of COMMITTEE_STRATEGIES) {
    maxWarmup = Math.max(maxWarmup, warmupBars(strategy, DEFAULT_STRATEGY_PARAMS[strategy]));
  }
  return Math.ceil(maxWarmup * 2.5) + 14;
}

function lastNumber(values: Array<number | null> | undefined, index: number): number | null {
  const value = values?.[index];
  return value == null || !Number.isFinite(value) ? null : round(value, 4);
}

function snapshotValues(series: Record<string, Array<number | null>>, index: number): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const [name, values] of Object.entries(series)) {
    out[name] = lastNumber(values, index);
  }
  return out;
}

function stanceFromSignals(
  bars: OhlcBar[],
  signals: Signal[],
  lastIndex: number,
): { vote: CommitteeVote; lastAction: Signal | null; lastActionDate: string | null; latestSignal: Signal } {
  let vote: CommitteeVote = "HOLD";
  let lastAction: Signal | null = null;
  let lastActionDate: string | null = null;
  const end = Math.min(lastIndex, bars.length - 1);
  for (let i = 0; i <= end; i += 1) {
    const signal = signals[i];
    if (signal === "BUY" || signal === "SELL") {
      vote = signal;
      lastAction = signal;
      lastActionDate = bars[i].date;
    }
  }
  return {
    vote,
    lastAction,
    lastActionDate,
    latestSignal: signals[end] ?? "HOLD",
  };
}

function majorityVote(members: CommitteeMember[]): CommitteeVote {
  const counts = { BUY: 0, SELL: 0, HOLD: 0 };
  for (const member of members) {
    if (!member.ready) continue;
    counts[member.vote] += 1;
  }
  const buy = counts.BUY;
  const sell = counts.SELL;
  const hold = counts.HOLD;
  if (buy > sell && buy > hold) return "BUY";
  if (sell > buy && sell > hold) return "SELL";
  return "HOLD";
}

function sharpeWeightedVote(members: CommitteeMember[]): CommitteeVote {
  let buy = 0;
  let sell = 0;
  for (const member of members) {
    if (!member.ready || member.vote === "HOLD") continue;
    const weight = Math.max(member.sharpe, 0.1);
    if (member.vote === "BUY") buy += weight;
    else sell += weight;
  }
  if (buy > sell) return "BUY";
  if (sell > buy) return "SELL";
  return "HOLD";
}

export function computeCommittee(
  bars: OhlcBar[],
  startIndex: number,
  engineConfig: EngineConfig,
  selected: { strategy: StrategyName; params: StrategyParams },
): CommitteeResult {
  const lastIndex = bars.length - 1;
  const members: CommitteeMember[] = [];

  for (const strategy of COMMITTEE_STRATEGIES) {
    const params =
      strategy === selected.strategy ? selected.params : DEFAULT_STRATEGY_PARAMS[strategy];
    try {
      const { signals, minBars, series } = computeSignals(bars, strategy, params);
      if (bars.length < minBars) {
        members.push({
          strategy,
          label: STRATEGY_LABELS[strategy],
          params,
          selected: strategy === selected.strategy,
          ready: false,
          vote: "HOLD",
          latestSignal: "HOLD",
          lastAction: null,
          lastActionDate: null,
          voteReason: "Not enough history",
          asOf: bars[lastIndex]?.date ?? null,
          lastValues: {},
          totalReturn: 0,
          maxDrawdown: 0,
          sharpe: 0,
          winRate: 0,
          totalTrades: 0,
        });
        continue;
      }

      const lastEvent = stanceFromSignals(bars, signals, lastIndex);
      const regime = regimeVote(strategy, bars, series, params, lastIndex);
      const engine = runEngine(bars, signals, engineConfig, { startIndex });
      const values = engine.equityCurve.map((point) => point.portfolioValue);
      const winTrades = engine.trades.filter((trade) => trade.pnl > 0);
      const metrics = computeRiskMetrics(engineConfig.startingCapital, engine.equityCurve, engine.trades);

      members.push({
        strategy,
        label: STRATEGY_LABELS[strategy],
        params,
        selected: strategy === selected.strategy,
        ready: true,
        vote: regime.vote,
        latestSignal: lastEvent.latestSignal,
        lastAction: lastEvent.lastAction,
        lastActionDate: lastEvent.lastActionDate,
        voteReason: regime.reason,
        asOf: bars[lastIndex]?.date ?? null,
        lastValues: snapshotValues(series, lastIndex),
        totalReturn: round(((engine.finalValue - engineConfig.startingCapital) / engineConfig.startingCapital) * 100),
        maxDrawdown: round(maxDrawdownPct(values)),
        sharpe: metrics.sharpe,
        winRate: round(engine.trades.length === 0 ? 0 : (winTrades.length / engine.trades.length) * 100),
        totalTrades: engine.trades.length,
      });
    } catch {
      members.push({
        strategy,
        label: STRATEGY_LABELS[strategy],
        params,
        selected: strategy === selected.strategy,
        ready: false,
        vote: "HOLD",
        latestSignal: "HOLD",
        lastAction: null,
        lastActionDate: null,
        voteReason: "Could not compute",
        asOf: bars[lastIndex]?.date ?? null,
        lastValues: {},
        totalReturn: 0,
        maxDrawdown: 0,
        sharpe: 0,
        winRate: 0,
        totalTrades: 0,
      });
    }
  }

  const ready = members.filter((member) => member.ready);
  const buyVotes = ready.filter((member) => member.vote === "BUY").length;
  const sellVotes = ready.filter((member) => member.vote === "SELL").length;
  const holdVotes = ready.filter((member) => member.vote === "HOLD").length;

  return {
    asOf: bars[lastIndex]?.date ?? null,
    majority: majorityVote(members),
    weighted: sharpeWeightedVote(members),
    buyVotes,
    sellVotes,
    holdVotes,
    members,
  };
}
