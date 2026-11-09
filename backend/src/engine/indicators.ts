export function smaSeries(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = Array(values.length).fill(null);
  if (period < 1) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function emaSeries(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = Array(values.length).fill(null);
  if (period < 1 || values.length === 0) return out;
  const k = 2 / (period + 1);
  let ema = values[0];
  out[0] = ema;
  for (let i = 1; i < values.length; i += 1) {
    ema = values[i] * k + ema * (1 - k);
    out[i] = ema;
  }
  return out;
}

export function wmaSeries(values: Array<number | null>, period: number): Array<number | null> {
  const out: Array<number | null> = Array(values.length).fill(null);
  const denom = (period * (period + 1)) / 2;
  for (let i = period - 1; i < values.length; i += 1) {
    let sum = 0;
    let ok = true;
    for (let j = 0; j < period; j += 1) {
      const value = values[i - period + 1 + j];
      if (value == null) {
        ok = false;
        break;
      }
      sum += value * (j + 1);
    }
    if (ok) out[i] = sum / denom;
  }
  return out;
}

export function hmaSeries(values: number[], period: number): Array<number | null> {
  const half = Math.max(1, Math.round(period / 2));
  const sqrt = Math.max(1, Math.round(Math.sqrt(period)));
  const wmaHalf = wmaSeries(values, half);
  const wmaFull = wmaSeries(values, period);
  const raw: Array<number | null> = values.map((_, i) => {
    if (wmaHalf[i] == null || wmaFull[i] == null) return null;
    return 2 * wmaHalf[i]! - wmaFull[i]!;
  });
  return wmaSeries(raw, sqrt);
}

export function trueRange(highs: number[], lows: number[], closes: number[]): number[] {
  const tr: number[] = Array(closes.length).fill(0);
  tr[0] = highs[0] - lows[0];
  for (let i = 1; i < closes.length; i += 1) {
    tr[i] = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
  }
  return tr;
}

export function wilderSmooth(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = Array(values.length).fill(null);
  if (values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i += 1) sum += values[i];
  let prev = sum / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i += 1) {
    prev = (prev * (period - 1) + values[i]) / period;
    out[i] = prev;
  }
  return out;
}

export function atrSeries(highs: number[], lows: number[], closes: number[], period: number): Array<number | null> {
  return wilderSmooth(trueRange(highs, lows, closes), period);
}

export function rollingHighLow(
  highs: number[],
  lows: number[],
  period: number,
): { high: Array<number | null>; low: Array<number | null> } {
  const high: Array<number | null> = Array(highs.length).fill(null);
  const low: Array<number | null> = Array(lows.length).fill(null);
  for (let i = period - 1; i < highs.length; i += 1) {
    let max = highs[i - period + 1];
    let min = lows[i - period + 1];
    for (let j = i - period + 2; j <= i; j += 1) {
      max = Math.max(max, highs[j]);
      min = Math.min(min, lows[j]);
    }
    high[i] = max;
    low[i] = min;
  }
  return { high, low };
}

export function midpoint(high: number, low: number): number {
  return (high + low) / 2;
}
