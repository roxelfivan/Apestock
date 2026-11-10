import assert from "node:assert/strict";
import { test } from "node:test";
import type { OhlcBar } from "../types.js";
import { regimeVote } from "./stance.js";

function bar(close: number): OhlcBar {
  return { date: "2024-01-01", open: close, high: close, low: close, close };
}

test("RSI holds between oversold and overbought", () => {
  const { vote, reason } = regimeVote("RSI", [bar(100)], { rsi: [51] }, { oversold: 30, overbought: 70 }, 0);
  assert.equal(vote, "HOLD");
  assert.match(reason, /between 30 and 70/);
});

test("RSI buys only in the oversold zone", () => {
  const { vote } = regimeVote("RSI", [bar(100)], { rsi: [22] }, { oversold: 30, overbought: 70 }, 0);
  assert.equal(vote, "BUY");
});

test("Bollinger holds when close is inside the bands", () => {
  const { vote } = regimeVote(
    "BOLLINGER",
    [bar(100)],
    { bbUpper: [110], bbLower: [90] },
    {},
    0,
  );
  assert.equal(vote, "HOLD");
});

test("Bollinger buys at the lower band", () => {
  const { vote } = regimeVote(
    "BOLLINGER",
    [bar(89)],
    { bbUpper: [110], bbLower: [90] },
    {},
    0,
  );
  assert.equal(vote, "BUY");
});

test("ADX holds when the trend is weak", () => {
  const { vote, reason } = regimeVote(
    "ADX",
    [bar(100)],
    { adx: [14], plusDi: [25], minusDi: [18] },
    {},
    0,
  );
  assert.equal(vote, "HOLD");
  assert.match(reason, /no trend/);
});

test("Donchian holds in the middle of the channel", () => {
  const { vote } = regimeVote(
    "DONCHIAN",
    [bar(100)],
    { donchianHigh: [120], donchianLow: [80] },
    {},
    0,
  );
  assert.equal(vote, "HOLD");
});
