declare module "technicalindicators" {
  export const SMA: {
    calculate(input: { period: number; values: number[] }): number[];
  };
  export const RSI: {
    calculate(input: { period: number; values: number[] }): number[];
  };
}
