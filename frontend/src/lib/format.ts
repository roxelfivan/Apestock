export function formatPct(value: number, digits = 2): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatAxisPct(value: number): string {
  if (!Number.isFinite(value)) return "";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)}%`;
}

export function formatMoney(value: number, digits = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value);
}

export function toneFor(value: number, invert = false): "positive" | "negative" | "neutral" {
  const next = invert ? -value : value;
  if (next > 0) return "positive";
  if (next < 0) return "negative";
  return "neutral";
}
