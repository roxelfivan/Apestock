const HTML_ERROR = "Yahoo Finance is temporarily unavailable. Wait a minute and try again.";

export function sanitizeUserError(raw: unknown, fallback = "Request failed."): string {
  const text = typeof raw === "string" ? raw.trim() : raw instanceof Error ? raw.message.trim() : "";
  if (!text) return fallback;
  if (/<!DOCTYPE|<html[\s>]|<\/html>|sad-panda|Inactivity Timeout|query2\.finance\.yahoo/i.test(text)) {
    return HTML_ERROR;
  }
  if (text.length > 280) return fallback;
  return text;
}
