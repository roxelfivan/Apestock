export function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function linReg(xs: number[], ys: number[]): { alpha: number; beta: number } {
  if (xs.length < 2 || xs.length !== ys.length) return { alpha: 0, beta: 0 };
  const xAvg = mean(xs);
  const yAvg = mean(ys);
  let cov = 0;
  let varX = 0;
  for (let i = 0; i < xs.length; i += 1) {
    const dx = xs[i] - xAvg;
    cov += dx * (ys[i] - yAvg);
    varX += dx * dx;
  }
  if (varX === 0) return { alpha: yAvg, beta: 0 };
  const beta = cov / varX;
  return { alpha: yAvg - beta * xAvg, beta };
}
