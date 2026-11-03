import type { AssetType, Timeframe } from "../types.js";
import { ValidationError } from "../errors.js";

const TIMEFRAMES: Record<Exclude<Timeframe, "CUSTOM">, number> = {
  "1Y": 365,
  "3Y": 365 * 3,
  "5Y": 365 * 5,
};

export function isTimeframe(value: string): value is Timeframe {
  return value === "1Y" || value === "3Y" || value === "5Y" || value === "CUSTOM";
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function addUtcDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string): number {
  const a = Date.parse(`${start}T00:00:00.000Z`);
  const b = Date.parse(`${end}T00:00:00.000Z`);
  return Math.round((b - a) / 86_400_000);
}

export function weekdayCount(start: string, end: string): number {
  let count = 0;
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const last = Date.parse(`${end}T00:00:00.000Z`);
  while (cursor.getTime() < last) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

export function timeframeToRange(timeframe: string = "3Y"): { startDate: string; endDate: string } {
  if (!isTimeframe(timeframe)) {
    throw new ValidationError("timeframe must be one of 1Y, 3Y, 5Y, or CUSTOM.");
  }
  if (timeframe === "CUSTOM") {
    throw new ValidationError("CUSTOM timeframe requires startDate and endDate.");
  }
  const days = TIMEFRAMES[timeframe];
  const endDate = utcToday();
  return { startDate: addUtcDays(endDate, -days), endDate };
}

export function countMissingSessions(
  dates: string[],
  assetType: AssetType,
): number {
  if (dates.length < 2) return 0;
  let missing = 0;
  for (let i = 1; i < dates.length; i += 1) {
    if (assetType === "CRYPTO") {
      missing += Math.max(0, daysBetween(dates[i - 1], dates[i]) - 1);
    } else {
      missing += Math.max(0, weekdayCount(dates[i - 1], dates[i]) - 1);
    }
  }
  return missing;
}
