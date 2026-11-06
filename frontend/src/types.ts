export type AssetType = "STOCK" | "CRYPTO";
export type StrategyName =
  | "MA_CROSSOVER"
  | "EMA_CROSSOVER"
  | "RSI"
  | "MACD"
  | "BOLLINGER"
  | "DONCHIAN"
  | "STOCHASTIC"
  | "MOMENTUM"
  | "WILLIAMS_R"
  | "BUY_HOLD";
export type Timeframe = "1Y" | "3Y" | "5Y" | "CUSTOM";
export type SizingMode = "fixed_from_start" | "percent_of_equity";
export type TradeReason = "signal" | "eod";

export interface StrategyParams {
  shortPeriod?: number;
  longPeriod?: number;
  rsiPeriod?: number;
  oversold?: number;
  overbought?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  bbPeriod?: number;
  bbStdDev?: number;
  donchianPeriod?: number;
  kPeriod?: number;
  lookback?: number;
  wrPeriod?: number;
}

export interface EquityPoint {
  date: string;
  portfolioValue: number;
  benchmarkValue: number;
}

export interface TradeEvent {
  date: string;
  side: "BUY" | "SELL";
  reason?: TradeReason;
}

export interface ClosedTrade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  qty: number;
  pnl: number;
  pnlPct: number;
  holdDays: number;
  reason: TradeReason;
}

export interface IndicatorBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  indicators: Record<string, number | null>;
}

export interface MonthlyReturn {
  month: string;
  returnPct: number;
}

export interface RiskMetrics {
  cagr: number;
  volatility: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  excessReturn: number;
  alpha: number;
  beta: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  avgHoldDays: number;
  timeInMarket: number;
  maxConsecutiveLosses: number;
  winRateSignal: number;
  signalTrades: number;
  monthlyReturns: MonthlyReturn[];
}

export interface DrawdownPoint {
  date: string;
  drawdown: number;
}

export interface BacktestResult {
  version?: number;
  ticker?: string;
  strategy?: StrategyName;
  params?: StrategyParams;
  startingCapital?: number;
  tradePercent?: number;
  timeframe?: Timeframe;
  startDate?: string;
  endDate?: string;
  testStartDate?: string;
  missingSessions?: number;
  fillModel?: string;
  sizingMode?: SizingMode;
  commissionBps?: number;
  commissionPerShare?: number;
  slippageBps?: number;
  totalReturn: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  equityCurve: EquityPoint[];
  events: TradeEvent[];
  trades?: ClosedTrade[];
  bars?: IndicatorBar[];
  metrics?: RiskMetrics;
  drawdownCurve?: DrawdownPoint[];
}

export interface SweepCell {
  params: StrategyParams;
  totalReturn: number;
  maxDrawdown: number;
  sharpe: number;
  cagr: number;
  totalTrades: number;
}

export interface SweepResult {
  ticker: string;
  strategy: StrategyName;
  warning: string;
  results: SweepCell[];
}

export interface WalkForwardFold {
  fold: number;
  params: StrategyParams;
  inSampleSharpe: number;
  outOfSampleReturn: number;
  outOfSampleSharpe: number;
  startDate: string;
  endDate: string;
}

export interface WalkForwardResult {
  ticker: string;
  strategy: StrategyName;
  warning: string;
  folds: WalkForwardFold[];
  combined: BacktestResult;
}

export interface BacktestConfig {
  ticker: string;
  assetType: AssetType;
  strategy: StrategyName;
  params: StrategyParams;
  startingCapital: number;
  tradePercent: number;
  timeframe: Timeframe;
  startDate: string;
  endDate: string;
  commissionBps: number;
  commissionPerShare: number;
  slippageBps: number;
  sizingMode: SizingMode;
  allowAnySymbol: boolean;
}

export interface SavedRun {
  id: string;
  createdAt: string;
  config: BacktestConfig;
  result: BacktestResult;
}

export interface ApiError {
  error?: string;
}

export interface UniverseGroup {
  label: string;
  symbols: string[];
}

export interface UniverseSlice {
  symbols: string[];
  groups: UniverseGroup[];
}

export interface UniverseSnapshot {
  fetchedAt: string;
  stock: UniverseSlice;
  crypto: UniverseSlice;
}
