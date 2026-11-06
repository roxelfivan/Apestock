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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function shiftYmd(year: number, month: number, day: number, delta: number): {
  year: number;
  month: number;
  day: number;
  weekday: (typeof WEEKDAYS)[number];
} {
  const date = new Date(Date.UTC(year, month - 1, day + delta));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    weekday: WEEKDAYS[date.getUTCDay()],
  };
}

function nyParts(now: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

/** Latest session whose daily bar should be complete (US 4pm ET + 1h buffer; crypto = prior UTC day). */
export function latestCompleteSession(assetType: AssetType, now = new Date()): string {
  if (assetType === "CRYPTO") {
    return addUtcDays(now.toISOString().slice(0, 10), -1);
  }

  const ny = nyParts(now);
  const closed = ny.hour > 17 || (ny.hour === 17 && ny.minute >= 0);
  let cursor = shiftYmd(ny.year, ny.month, ny.day, closed ? 0 : -1);
  while (cursor.weekday === "Sat" || cursor.weekday === "Sun") {
    cursor = shiftYmd(cursor.year, cursor.month, cursor.day, -1);
  }
  return `${cursor.year}-${String(cursor.month).padStart(2, "0")}-${String(cursor.day).padStart(2, "0")}`;
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
