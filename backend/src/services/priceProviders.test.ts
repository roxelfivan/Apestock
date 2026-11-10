import assert from "node:assert/strict";
import { test } from "node:test";
import {
  binanceSymbol,
  parseBinanceKlines,
  parseCoinbaseCandles,
  parseKrakenOhlc,
  parseStooqCsv,
  parseYahooChartPayload,
  stooqSymbol,
} from "./priceProviders.js";

test("stooq maps US and crypto Yahoo tickers", () => {
  assert.equal(stooqSymbol("AAPL", "STOCK"), "aapl.us");
  assert.equal(stooqSymbol("BRK-B", "STOCK"), "brk.b.us");
  assert.equal(stooqSymbol("BTC-USD", "CRYPTO"), "btcusd");
});

test("binance maps Yahoo crypto pairs to USDT", () => {
  assert.equal(binanceSymbol("BTC-USD"), "BTCUSDT");
  assert.equal(binanceSymbol("AAPL"), null);
});

test("parseStooqCsv keeps dated OHLC rows", () => {
  const csv = [
    "Date,Open,High,Low,Close,Volume",
    "2024-01-03,3,4,2,3.5,10",
    "2024-01-02,1,2,1,1.5,10",
    "No data",
  ].join("\n");
  const bars = parseStooqCsv(csv, "2024-01-01", "2024-01-02");
  assert.equal(bars.length, 1);
  assert.equal(bars[0].date, "2024-01-02");
  assert.equal(bars[0].close, 1.5);
});

test("parseBinanceKlines uses open time as the session date", () => {
  const rows = [[Date.parse("2024-06-01T00:00:00.000Z"), "10", "12", "9", "11", "1"]];
  const bars = parseBinanceKlines(rows, "2024-06-01", "2024-06-01");
  assert.equal(bars[0]?.date, "2024-06-01");
  assert.equal(bars[0]?.close, 11);
});

test("parseYahooChartPayload reads quote arrays", () => {
  const payload = {
    chart: {
      result: [
        {
          timestamp: [1_704_067_200],
          indicators: { quote: [{ open: [10], high: [12], low: [9], close: [11] }] },
        },
      ],
    },
  };
  const bars = parseYahooChartPayload(payload, "2024-01-01", "2024-01-01", "UTC");
  assert.equal(bars[0]?.close, 11);
  assert.equal(bars[0]?.date, "2024-01-01");
});

test("parseCoinbaseCandles uses time, low, high, open, close order", () => {
  const bars = parseCoinbaseCandles([[1_704_067_200, 9, 12, 10, 11, 1]], "2024-01-01", "2024-01-01");
  assert.equal(bars[0]?.open, 10);
  assert.equal(bars[0]?.close, 11);
});

test("parseKrakenOhlc reads the first pair array", () => {
  const bars = parseKrakenOhlc(
    { error: [], result: { XXBTZUSD: [[1_704_067_200, "10", "12", "9", "11"]], last: 1 } },
    "2024-01-01",
    "2024-01-01",
  );
  assert.equal(bars[0]?.close, 11);
});
