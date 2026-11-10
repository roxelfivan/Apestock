export class ValidationError extends Error {
  status = 400;

  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class DataError extends Error {
  status = 502;

  constructor(message: string) {
    super(message);
    this.name = "DataError";
  }
}

const HTML_ERROR =
  "Yahoo Finance is temporarily unavailable. Wait a minute and try again.";

const QUOTA_ERROR =
  "Yahoo's unofficial feed hit a free-request limit. Daily bars then try Yahoo's public chart, Stooq, and for crypto Coinbase / Binance.US / Kraken.";

export function isQuotaOrThrottleError(raw: unknown): boolean {
  const text = typeof raw === "string" ? raw : raw instanceof Error ? raw.message : String(raw ?? "");
  return /quota has been exceeded|too many requests|rate limit|429|throttle|unofficial-api/i.test(text);
}

export function sanitizeUserError(raw: unknown, fallback = "Request failed."): string {
  const text = typeof raw === "string" ? raw.trim() : raw instanceof Error ? raw.message.trim() : "";
  if (!text) return fallback;
  if (isQuotaOrThrottleError(text)) return QUOTA_ERROR;
  if (
    /<!DOCTYPE|<html[\s>]|<\/html>|sad-panda|Inactivity Timeout|query2\.finance\.yahoo/i.test(text)
  ) {
    return HTML_ERROR;
  }
  if (text.length > 280) return fallback;
  return text;
}

export function httpStatus(error: unknown): number {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = Number((error as { status?: unknown }).status);
    if (Number.isFinite(status) && status >= 400) return status;
  }
  return 500;
}
