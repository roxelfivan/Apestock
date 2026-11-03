import { round } from "../lib/math.js";
import type {
  ClosedTrade,
  EquityPoint,
  OhlcBar,
  Signal,
  SizingMode,
  TradeEvent,
  TradeReason,
} from "../types.js";

export interface EngineConfig {
  startingCapital: number;
  tradePercent: number;
  sizingMode: SizingMode;
  commissionBps: number;
  commissionPerShare: number;
  slippageBps: number;
}

export interface EngineOutput {
  equityCurve: EquityPoint[];
  events: TradeEvent[];
  trades: ClosedTrade[];
  finalValue: number;
}

interface Lot {
  shares: number;
  entryPrice: number;
  entryDate: string;
  entryCost: number;
}

function buyPrice(open: number, slippageBps: number): number {
  return open * (1 + slippageBps / 10_000);
}

function sellPrice(open: number, slippageBps: number): number {
  return open * (1 - slippageBps / 10_000);
}

function commissionCost(shares: number, notional: number, config: EngineConfig): number {
  return shares * config.commissionPerShare + notional * (config.commissionBps / 10_000);
}

function holdDays(entryDate: string, exitDate: string): number {
  const start = Date.parse(`${entryDate}T00:00:00.000Z`);
  const end = Date.parse(`${exitDate}T00:00:00.000Z`);
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

function closeLot(
  lot: Lot,
  exitDate: string,
  exitPrice: number,
  config: EngineConfig,
  reason: TradeReason,
): { trade: ClosedTrade; proceeds: number } {
  const notional = lot.shares * exitPrice;
  const fee = commissionCost(lot.shares, notional, config);
  const proceeds = notional - fee;
  const pnl = proceeds - lot.entryCost;
  const pnlPct = lot.entryCost > 0 ? (pnl / lot.entryCost) * 100 : 0;
  return {
    proceeds,
    trade: {
      entryDate: lot.entryDate,
      exitDate,
      entryPrice: round(lot.entryPrice, 4),
      exitPrice: round(exitPrice, 4),
      qty: round(lot.shares, 6),
      pnl: round(pnl, 2),
      pnlPct: round(pnlPct, 2),
      holdDays: holdDays(lot.entryDate, exitDate),
      reason,
    },
  };
}

export function runEngine(
  bars: OhlcBar[],
  signals: Signal[],
  config: EngineConfig,
  options: { startIndex?: number } = {},
): EngineOutput {
  const startIndex = options.startIndex ?? 0;
  let cash = config.startingCapital;
  const lots: Lot[] = [];
  let pending: Signal | null = null;
  const trades: ClosedTrade[] = [];
  const events: TradeEvent[] = [];
  const equityCurve: EquityPoint[] = [];
  const firstOpen = bars[startIndex]?.open ?? bars[0].open;
  const benchmarkShares = firstOpen > 0 ? config.startingCapital / firstOpen : 0;

  const openShares = () => lots.reduce((sum, lot) => sum + lot.shares, 0);

  if (startIndex > 0 && signals[startIndex - 1] === "BUY") pending = "BUY";
  else if (startIndex > 0 && signals[startIndex - 1] === "SELL") pending = "SELL";

  for (let i = startIndex; i < bars.length; i += 1) {
    const bar = bars[i];

    if (pending) {
      if (pending === "BUY" && cash > 0 && bar.open > 0) {
        const fill = buyPrice(bar.open, config.slippageBps);
        const markedEquity = cash + openShares() * fill;
        const budget =
          config.sizingMode === "percent_of_equity"
            ? markedEquity * (config.tradePercent / 100)
            : config.startingCapital * (config.tradePercent / 100);
        const spend = Math.min(cash, budget);
        const unitCost = fill + config.commissionPerShare + fill * (config.commissionBps / 10_000);
        const shares = unitCost > 0 ? spend / unitCost : 0;
        const notional = shares * fill;
        const fee = commissionCost(shares, notional, config);
        const totalCost = notional + fee;
        if (shares > 0 && totalCost > 0 && totalCost <= cash + 1e-9) {
          lots.push({ shares, entryPrice: fill, entryDate: bar.date, entryCost: totalCost });
          cash -= totalCost;
          events.push({ date: bar.date, side: "BUY", reason: "signal" });
        }
      } else if (pending === "SELL" && lots.length > 0) {
        const fill = sellPrice(bar.open, config.slippageBps);
        const lot = lots.shift()!;
        const closed = closeLot(lot, bar.date, fill, config, "signal");
        trades.push(closed.trade);
        cash += closed.proceeds;
        events.push({ date: bar.date, side: "SELL", reason: "signal" });
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
      const closed = closeLot(lot, last.date, last.close, config, "eod");
      trades.push(closed.trade);
      events.push({ date: last.date, side: "SELL", reason: "eod" });
    }
  }

  return {
    equityCurve,
    events,
    trades,
    finalValue: equityCurve[equityCurve.length - 1]?.portfolioValue ?? config.startingCapital,
  };
}
