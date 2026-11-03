declare module "technicalindicators" {
  export const SMA: {
    calculate(input: { period: number; values: number[] }): number[];
  };
  export const EMA: {
    calculate(input: { period: number; values: number[] }): number[];
  };
  export const RSI: {
    calculate(input: { period: number; values: number[] }): number[];
  };
  export const MACD: {
    calculate(input: {
      values: number[];
      fastPeriod: number;
      slowPeriod: number;
      signalPeriod: number;
      SimpleMAOscillator?: boolean;
      SimpleMASignal?: boolean;
    }): Array<{ MACD?: number; signal?: number; histogram?: number }>;
  };
  export const BollingerBands: {
    calculate(input: {
      period: number;
      values: number[];
      stdDev: number;
    }): Array<{ lower?: number; middle?: number; upper?: number }>;
  };
}
