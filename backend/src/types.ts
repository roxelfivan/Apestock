export type AssetType = "STOCK" | "CRYPTO";
export type StrategyName = "MA_CROSSOVER" | "RSI";
export type Timeframe = "1Y" | "3Y" | "5Y";
export type Signal = "BUY" | "SELL" | "HOLD";

export interface OhlcBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface StrategyParams {
  shortPeriod?: number;
  longPeriod?: number;
  rsiPeriod?: number;
  oversold?: number;
  overbought?: number;
  period?: number;
  oversoldThreshold?: number;
  overboughtThreshold?: number;
}

export interface BacktestRequest {
  ticker?: string;
  assetType?: AssetType | string;
  strategy?: StrategyName | string;
  params?: StrategyParams;
  startingCapital?: number;
  tradePercent?: number;
  timeframe?: Timeframe | string;
}

export interface EquityPoint {
  date: string;
  portfolioValue: number;
  benchmarkValue: number;
}

export interface TradeEvent {
  date: string;
  side: "BUY" | "SELL";
}

export interface BacktestResult {
  totalReturn: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  equityCurve: EquityPoint[];
  events: TradeEvent[];
}

export interface ApiError {
  error: string;
}
