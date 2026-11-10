import assert from "node:assert/strict";
import { test } from "node:test";
import { providersFor } from "./feeds/index.js";
import {
  parseBinanceKlines,
  parseStooqCsv,
  parseTiingoPrices,
  rangeCovered,
  stooqSymbol,
  yahooCryptoToBinance,
} from "./feeds/parse.js";

test("yahooCryptoToBinance maps Yahoo pairs onto USDT klines", () => {
  assert.equal(yahooCryptoToBinance("BTC-USD"), "BTCUSDT");
  assert.equal(yahooCryptoToBinance("eth-usd"), "ETHUSDT");
  assert.equal(yahooCryptoToBinance("USDT-USD"), null);
  assert.equal(yahooCryptoToBinance("AAPL"), null);
});

test("stooqSymbol keeps Yahoo class-share dashes", () => {
  assert.equal(stooqSymbol("AAPL"), "aapl.us");
  assert.equal(stooqSymbol("BRK-B"), "brk-b.us");
});

test("parseStooqCsv ignores quota and empty payloads", () => {
  assert.deepEqual(parseStooqCsv("Exceeded the daily hits limit.", "2024-01-01", "2024-01-31"), []);
  assert.deepEqual(parseStooqCsv("No data", "2024-01-01", "2024-01-31"), []);
  const bars = parseStooqCsv(
    "Date,Open,High,Low,Close,Volume\n2024-01-03,2,4,1,3,10\n2024-01-02,1,3,1,2,11\n",
    "2024-01-01",
    "2024-01-03",
  );
  assert.equal(bars.length, 2);
  assert.equal(bars[0]?.date, "2024-01-02");
  assert.equal(bars[1]?.close, 3);
});

test("parseBinanceKlines keeps complete daily candles", () => {
  const bars = parseBinanceKlines(
    [[Date.parse("2024-01-02T00:00:00.000Z"), "1", "3", "1", "2", "100"]],
    "2024-01-01",
    "2024-01-03",
  );
  assert.equal(bars[0]?.close, 2);
});

test("parseTiingoPrices maps official EOD rows", () => {
  const bars = parseTiingoPrices(
    [{ date: "2024-01-02T00:00:00.000Z", open: 1, high: 2, low: 1, close: 1.5 }],
    "2024-01-01",
    "2024-01-03",
  );
  assert.equal(bars[0]?.date, "2024-01-02");
});

test("rangeCovered skips a feed when local bars already span the window", () => {
  const bars = [
    { date: "2020-01-02", open: 1, high: 1, low: 1, close: 1 },
    { date: "2024-12-31", open: 1, high: 1, low: 1, close: 1 },
  ];
  assert.equal(rangeCovered(bars, "2020-06-01", "2024-12-31"), true);
  assert.equal(rangeCovered(bars, "2019-01-01", "2024-12-31"), false);
  assert.equal(rangeCovered([], "2020-01-01", "2020-02-01"), false);
});

test("providersFor uses Binance then Yahoo for crypto, Stooq then Yahoo for stocks", () => {
  assert.deepEqual(
    providersFor("CRYPTO").map((provider) => provider.name),
    ["binance", "yahoo"],
  );
  assert.deepEqual(
    providersFor("STOCK").map((provider) => provider.name),
    ["stooq", "yahoo"],
  );
});

test("providersFor inserts Tiingo for stocks when TIINGO_API_KEY is set", () => {
  const previous = process.env.TIINGO_API_KEY;
  process.env.TIINGO_API_KEY = "test";
  try {
    assert.deepEqual(
      providersFor("STOCK").map((provider) => provider.name),
      ["stooq", "tiingo", "yahoo"],
    );
  } finally {
    if (previous === undefined) delete process.env.TIINGO_API_KEY;
    else process.env.TIINGO_API_KEY = previous;
  }
});
