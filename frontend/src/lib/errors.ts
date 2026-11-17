const HTML_ERROR = "Yahoo Finance is temporarily unavailable. Wait a minute and try again.";
const QUOTA_ERROR =
  "Yahoo's unofficial feed hit a free-request limit. Daily bars then try Yahoo's public chart, Stooq, and for crypto Coinbase / Binance.US / Kraken.";

function asText(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : raw instanceof Error ? raw.message.trim() : "";
}

function isQuota(text: string): boolean {
  return /quota has been exceeded|too many requests|rate limit|429|throttle|unofficial-api|unofficial feed/i.test(
    text,
  );
}

export function describeStoredBars(summary: {
  ticker: string;
  present: boolean;
  barCount: number;
  firstBar: string | null;
  lastBar: string | null;
} | null | undefined): string {
  if (!summary?.present || summary.barCount <= 0 || !summary.firstBar || !summary.lastBar) return "";
  return `${summary.ticker} already has ${summary.barCount.toLocaleString()} stored daily bars (${summary.firstBar} → ${summary.lastBar}).`;
}

export function sanitizeUserError(
  raw: unknown,
  fallback = "Request failed.",
  stored?: Parameters<typeof describeStoredBars>[0],
): string {
  const text = asText(raw);
  const storedLine = describeStoredBars(stored);
  if (/stored daily bars|stored file/i.test(text)) {
    return text.length > 400 ? `${text.slice(0, 397)}...` : text;
  }
  if (isQuota(text)) {
    return storedLine ? `Live feeds are temporarily limited. ${storedLine}` : QUOTA_ERROR;
  }
  if (!text) return storedLine || fallback;
  if (/<!DOCTYPE|<html[\s>]|<\/html>|sad-panda|Inactivity Timeout|query2\.finance\.yahoo/i.test(text)) {
    return storedLine ? `${HTML_ERROR} ${storedLine}` : HTML_ERROR;
  }
  if (text.length > 280) return storedLine || fallback;
  return text;
}
