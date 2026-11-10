const HTML_ERROR = "Yahoo Finance is temporarily unavailable. Wait a minute and try again.";
const QUOTA_ERROR =
  "Yahoo's unofficial feed hit a free-request limit. Daily bars then try Yahoo's public chart, Stooq, and for crypto Coinbase / Binance.US / Kraken.";

export function sanitizeUserError(raw: unknown, fallback = "Request failed."): string {
  const text = typeof raw === "string" ? raw.trim() : raw instanceof Error ? raw.message.trim() : "";
  if (!text) return fallback;
  if (/quota has been exceeded|too many requests|rate limit|429|throttle/i.test(text)) return QUOTA_ERROR;
  if (/<!DOCTYPE|<html[\s>]|<\/html>|sad-panda|Inactivity Timeout|query2\.finance\.yahoo/i.test(text)) {
    return HTML_ERROR;
  }
  if (text.length > 280) return fallback;
  return text;
}
