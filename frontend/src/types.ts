export type AssetType = "STOCK" | "CRYPTO";
export type StrategyName = "MA_CROSSOVER" | "RSI";
export type Timeframe = "1Y" | "3Y" | "5Y";

export interface StrategyParams {
  shortPeriod?: number;
  longPeriod?: number;
  rsiPeriod?: number;
  oversold?: number;
  overbought?: number;
}

export interface EquityPoint {
  date: string;
  portfolioValue: number;
  benchmarkValue: number;
}

export interface BacktestResult {
  totalReturn: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  equityCurve: EquityPoint[];
}

export interface ApiError {
  error?: string;
}
