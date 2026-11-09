import assert from "node:assert/strict";
import { test } from "node:test";
import type { OhlcBar } from "../types.js";
import { computeCommittee } from "./committee.js";
import { DEFAULT_STRATEGY_PARAMS } from "./defaults.js";

function barsFromCloses(closes: number[], start = "2018-01-01"): OhlcBar[] {
  return closes.map((close, index) => {
    const date = new Date(`${start}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + index);
    const iso = date.toISOString().slice(0, 10);
    return { date: iso, open: close, high: close * 1.02, low: close * 0.98, close };
  });
}

const engineConfig = {
  startingCapital: 10_000,
  tradePercent: 20,
  sizingMode: "fixed_from_start" as const,
  commissionBps: 0,
  commissionPerShare: 0,
  slippageBps: 0,
};

function trendingThenReversal(): number[] {
  const closes: number[] = [];
  for (let i = 0; i < 260; i += 1) closes.push(50 + i * 0.4);
  for (let i = 0; i < 80; i += 1) closes.push(154 - i * 0.9);
  return closes;
}

test("committee reports a vote and performance for each indicator", () => {
  const ohlc = barsFromCloses(trendingThenReversal());
  const committee = computeCommittee(ohlc, 40, engineConfig, {
    strategy: "RSI",
    params: DEFAULT_STRATEGY_PARAMS.RSI,
  });
  assert.equal(committee.members.length, 9);
  assert.equal(committee.buyVotes + committee.sellVotes + committee.holdVotes, committee.members.filter((m) => m.ready).length);
  assert.ok(["BUY", "SELL", "HOLD"].includes(committee.majority));
  const rsi = committee.members.find((member) => member.strategy === "RSI");
  assert.equal(rsi?.selected, true);
  assert.equal(rsi?.ready, true);
  assert.ok(rsi?.lastValues.rsi != null);
  const sma = committee.members.find((member) => member.strategy === "MA_CROSSOVER");
  assert.equal(sma?.selected, false);
  assert.equal(sma?.ready, true);
  assert.ok(sma?.totalTrades >= 0);
});

test("selected strategy uses the request params instead of defaults", () => {
  const ohlc = barsFromCloses(trendingThenReversal());
  const committee = computeCommittee(ohlc, 20, engineConfig, {
    strategy: "MA_CROSSOVER",
    params: { shortPeriod: 5, longPeriod: 20 },
  });
  const sma = committee.members.find((member) => member.strategy === "MA_CROSSOVER");
  assert.deepEqual(sma?.params, { shortPeriod: 5, longPeriod: 20 });
  assert.equal(sma?.selected, true);
});

test("majority follows the largest vote bucket", () => {
  const ohlc = barsFromCloses(Array.from({ length: 80 }, (_, i) => 10 + i));
  const committee = computeCommittee(ohlc, 10, engineConfig, {
    strategy: "MOMENTUM",
    params: { lookback: 5 },
  });
  const ready = committee.members.filter((member) => member.ready);
  const buy = ready.filter((member) => member.vote === "BUY").length;
  const sell = ready.filter((member) => member.vote === "SELL").length;
  const hold = ready.filter((member) => member.vote === "HOLD").length;
  if (buy > sell && buy > hold) assert.equal(committee.majority, "BUY");
  else if (sell > buy && sell > hold) assert.equal(committee.majority, "SELL");
  else assert.equal(committee.majority, "HOLD");
});
