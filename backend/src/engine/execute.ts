import { isValidTicker } from "../data/universe.js";
import { ValidationError } from "../errors.js";
import { getUniverseSnapshot } from "../services/universeService.js";
import { countMissingSessions, isIsoDate, isTimeframe, timeframeToRange, addUtcDays } from "../lib/dates.js";
import { round } from "../lib/math.js";
import { fetchHistoricalData } from "../services/dataService.js";
import type {
  AssetType,
  BacktestRequest,
  BacktestResult,
  IndicatorBar,
  OhlcBar,
  SizingMode,
  StrategyName,
  StrategyParams,
  Timeframe,
} from "../types.js";
import { computeCommittee, committeeFetchWarmup } from "./committee.js";
import { runEngine, type EngineConfig } from "./engine.js";
import { computeRiskMetrics, drawdownCurve, maxDrawdownPct } from "./metrics.js";
import { computeSignals, warmupBars } from "./signals.js";

export const STRATEGIES = new Set<StrategyName>([
  "MA_CROSSOVER",
  "EMA_CROSSOVER",
  "RSI",
  "MACD",
  "BOLLINGER",
  "DONCHIAN",
  "STOCHASTIC",
  "MOMENTUM",
  "WILLIAMS_R",
  "BUY_HOLD",
]);
export const ASSET_TYPES = new Set<AssetType>(["STOCK", "CRYPTO"]);
export const SIZING_MODES = new Set<SizingMode>(["fixed_from_start", "percent_of_equity"]);

export const RESULT_VERSION = 3;

export interface ParsedRequest {
  ticker: string;
  assetType: AssetType;
  strategy: StrategyName;
  params: StrategyParams;
  startingCapital: number;
  tradePercent: number;
  timeframe: Timeframe;
  startDate: string;
  endDate: string;
  fetchStart: string;
  commissionBps: number;
  commissionPerShare: number;
  slippageBps: number;
  sizingMode: SizingMode;
  allowAnySymbol: boolean;
}

export function parseBacktestRequest(body: BacktestRequest): ParsedRequest {
  const ticker = typeof body.ticker === "string" ? body.ticker.trim().toUpperCase() : "";
  const assetType = body.assetType as AssetType;
  const strategy = body.strategy as StrategyName;
  const params = body.params ?? {};
  const startingCapital = Number(body.startingCapital);
  const tradePercent = body.tradePercent == null ? 20 : Number(body.tradePercent);
  const timeframe = (body.timeframe || "3Y") as Timeframe;
  const commissionBps = body.commissionBps == null ? 0 : Number(body.commissionBps);
  const commissionPerShare = body.commissionPerShare == null ? 0 : Number(body.commissionPerShare);
  const slippageBps = body.slippageBps == null ? 0 : Number(body.slippageBps);
  const sizingMode = (body.sizingMode || "fixed_from_start") as SizingMode;
  const allowAnySymbol = Boolean(body.allowAnySymbol);

  if (!ticker) throw new ValidationError("Missing ticker.");
  if (!ASSET_TYPES.has(assetType)) throw new ValidationError("assetType must be STOCK or CRYPTO.");
  if (!STRATEGIES.has(strategy)) {
    throw new ValidationError(
      "strategy must be MA_CROSSOVER, EMA_CROSSOVER, RSI, MACD, BOLLINGER, DONCHIAN, STOCHASTIC, MOMENTUM, WILLIAMS_R, or BUY_HOLD.",
    );
  }
  if (!Number.isFinite(startingCapital) || startingCapital <= 0) {
    throw new ValidationError("startingCapital must be a positive number.");
  }
  if (!Number.isFinite(tradePercent) || tradePercent < 1 || tradePercent > 100) {
    throw new ValidationError("tradePercent must be a number from 1 to 100.");
  }
  if (!isTimeframe(String(timeframe))) {
    throw new ValidationError("timeframe must be one of 1Y, 3Y, 5Y, or CUSTOM.");
  }
  if (!SIZING_MODES.has(sizingMode)) {
    throw new ValidationError("sizingMode must be fixed_from_start or percent_of_equity.");
  }
  if (![commissionBps, commissionPerShare, slippageBps].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new ValidationError("commission and slippage must be non-negative numbers.");
  }
  let startDate: string;
  let endDate: string;
  if (timeframe === "CUSTOM") {
    startDate = String(body.startDate ?? "");
    endDate = String(body.endDate ?? "");
    if (!isIsoDate(startDate) || !isIsoDate(endDate) || startDate >= endDate) {
      throw new ValidationError("CUSTOM timeframe requires startDate < endDate as YYYY-MM-DD.");
    }
  } else {
    ({ startDate, endDate } = timeframeToRange(timeframe));
  }

  const warmup = Math.max(Math.ceil(warmupBars(strategy, params) * 2.5) + 14, committeeFetchWarmup());
  const fetchStart = addUtcDays(startDate, -warmup);

  return {
    ticker,
    assetType,
    strategy,
    params,
    startingCapital,
    tradePercent: strategy === "BUY_HOLD" ? 100 : tradePercent,
    timeframe,
    startDate,
    endDate,
    fetchStart,
    commissionBps,
    commissionPerShare,
    slippageBps,
    sizingMode,
    allowAnySymbol,
  };
}

export function engineConfigFrom(parsed: ParsedRequest): EngineConfig {
  return {
    startingCapital: parsed.startingCapital,
    tradePercent: parsed.tradePercent,
    sizingMode: parsed.sizingMode,
    commissionBps: parsed.commissionBps,
    commissionPerShare: parsed.commissionPerShare,
    slippageBps: parsed.slippageBps,
  };
}

export function fillModelLabel(parsed: ParsedRequest): string {
  const sizing = parsed.sizingMode === "percent_of_equity" ? "% of equity" : "slice of start";
  return `long only · ${sizing} · T+1 open · ${parsed.commissionBps}bps + $${parsed.commissionPerShare}/sh · ${parsed.slippageBps}bps slip`;
}

export async function authorizeParsedRequest(parsed: ParsedRequest): Promise<ParsedRequest> {
  if (parsed.allowAnySymbol) return parsed;
  const snapshot = await getUniverseSnapshot();
  if (!isValidTicker(parsed.ticker, parsed.assetType, snapshot)) {
    throw new ValidationError(
      `${parsed.ticker} is not in the ${parsed.assetType} universe. Enable allowAnySymbol to override.`,
    );
  }
  return parsed;
}

export async function executeBacktest(body: BacktestRequest): Promise<BacktestResult> {
  const parsed = await authorizeParsedRequest(parseBacktestRequest(body));
  const bars = await fetchHistoricalData(parsed.ticker, parsed.assetType, parsed.fetchStart, parsed.endDate);
  return buildResult(parsed, bars);
}

export function buildResult(
  parsed: ParsedRequest,
  bars: OhlcBar[],
  options: { committee?: boolean } = {},
): BacktestResult {
  const { signals, minBars, series } = computeSignals(bars, parsed.strategy, parsed.params);
  if (bars.length < minBars) {
    throw new ValidationError(
      `Data gap: ${bars.length} valid bars is not enough for this strategy (need at least ${minBars}).`,
    );
  }

  let startIndex = bars.findIndex((bar) => bar.date >= parsed.startDate);
  if (startIndex < 0) startIndex = 0;
  const testBars = bars.slice(startIndex);
  if (testBars.length < 2) {
    throw new ValidationError("Not enough bars in the selected test window.");
  }

  const engine = runEngine(bars, signals, engineConfigFrom(parsed), { startIndex });
  const values = engine.equityCurve.map((point) => point.portfolioValue);
  const winTrades = engine.trades.filter((trade) => trade.pnl > 0);
  const indicatorBars: IndicatorBar[] = testBars.map((bar, offset) => {
    const index = startIndex + offset;
    const indicators: Record<string, number | null> = {};
    for (const [name, valuesForName] of Object.entries(series)) {
      indicators[name] = valuesForName[index] ?? null;
    }
    return { ...bar, indicators };
  });

  return {
    version: RESULT_VERSION,
    ticker: parsed.ticker,
    strategy: parsed.strategy,
    params: parsed.params,
    startingCapital: parsed.startingCapital,
    tradePercent: parsed.tradePercent,
    timeframe: parsed.timeframe,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    testStartDate: testBars[0].date,
    missingSessions: countMissingSessions(
      testBars.map((bar) => bar.date),
      parsed.assetType,
    ),
    fillModel: fillModelLabel(parsed),
    sizingMode: parsed.sizingMode,
    commissionBps: parsed.commissionBps,
    commissionPerShare: parsed.commissionPerShare,
    slippageBps: parsed.slippageBps,
    totalReturn: round(((engine.finalValue - parsed.startingCapital) / parsed.startingCapital) * 100),
    maxDrawdown: round(maxDrawdownPct(values)),
    winRate: round(engine.trades.length === 0 ? 0 : (winTrades.length / engine.trades.length) * 100),
    totalTrades: engine.trades.length,
    equityCurve: engine.equityCurve,
    events: engine.events,
    trades: engine.trades,
    bars: indicatorBars,
    metrics: computeRiskMetrics(parsed.startingCapital, engine.equityCurve, engine.trades),
    drawdownCurve: drawdownCurve(engine.equityCurve),
    committee:
      options.committee === false
        ? {
            asOf: bars.at(-1)?.date ?? null,
            majority: "HOLD",
            weighted: "HOLD",
            buyVotes: 0,
            sellVotes: 0,
            holdVotes: 0,
            members: [],
          }
        : computeCommittee(bars, startIndex, engineConfigFrom(parsed), {
            strategy: parsed.strategy,
            params: parsed.params,
          }),
  };
}
