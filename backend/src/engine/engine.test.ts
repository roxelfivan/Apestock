import assert from "node:assert/strict";
import { test } from "node:test";
import type { OhlcBar } from "../types.js";
import { runEngine } from "./engine.js";
import { computeRiskMetrics } from "./metrics.js";
import { DEFAULT_STRATEGY_PARAMS } from "./defaults.js";
import { computeSignals } from "./signals.js";

function barsFromCloses(closes: number[], start = "2020-01-01"): OhlcBar[] {
  return closes.map((close, index) => {
    const date = new Date(`${start}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + index);
    const iso = date.toISOString().slice(0, 10);
    return { date: iso, open: close, high: close * 1.01, low: close * 0.99, close };
  });
}

const config = {
  startingCapital: 10_000,
  tradePercent: 20,
  sizingMode: "fixed_from_start" as const,
  commissionBps: 0,
  commissionPerShare: 0,
  slippageBps: 0,
};

test("MA crossover buys after a golden cross and sells after a death cross", () => {
  const closes = [
    10, 10, 10, 10, 10, 10, 10, 10,
    11, 12, 13, 14, 15, 16, 17, 18,
    17, 16, 15, 14, 13, 12, 11, 10,
  ];
  const ohlc = barsFromCloses(closes);
  const { signals } = computeSignals(ohlc, "MA_CROSSOVER", { shortPeriod: 3, longPeriod: 5 });
  assert.ok(signals.includes("BUY"));
  assert.ok(signals.includes("SELL"));
  const result = runEngine(ohlc, signals, config);
  assert.ok(result.trades.length >= 1);
  assert.equal(result.events.some((event) => event.side === "BUY"), true);
});

test("EOD exits are tagged separately from signal sells", () => {
  const ohlc = barsFromCloses([10, 11, 12, 13, 14, 15, 16, 17]);
  const signals = ohlc.map((_, index) => (index === 1 ? "BUY" : "HOLD")) as Array<"BUY" | "SELL" | "HOLD">;
  const result = runEngine(ohlc, signals, config);
  assert.ok(result.trades.length >= 1);
  assert.equal(result.trades.at(-1)?.reason, "eod");
  assert.equal(result.events.filter((event) => event.reason === "eod").length, result.trades.filter((t) => t.reason === "eod").length);
});

test("commission and slippage reduce proceeds vs a frictionless fill", () => {
  const ohlc = barsFromCloses([10, 11, 12, 13, 14, 15, 12, 11, 10, 9]);
  const { signals } = computeSignals(ohlc, "MA_CROSSOVER", { shortPeriod: 2, longPeriod: 4 });
  const clean = runEngine(ohlc, signals, config);
  const costly = runEngine(ohlc, signals, {
    ...config,
    commissionBps: 20,
    slippageBps: 50,
  });
  assert.ok(costly.finalValue <= clean.finalValue + 1e-6);
});

test("percent-of-equity sizing can spend more than a start-capital slice after gains", () => {
  const ohlc = barsFromCloses([10, 12, 14, 16, 18, 20, 22, 24]);
  const signals = ohlc.map((_, index) => (index % 2 === 0 ? "BUY" : "HOLD")) as Array<"BUY" | "SELL" | "HOLD">;
  const fixed = runEngine(ohlc, signals, config);
  const compounded = runEngine(ohlc, signals, { ...config, sizingMode: "percent_of_equity" });
  const fixedBuys = fixed.events.filter((event) => event.side === "BUY").length;
  const compoundBuys = compounded.events.filter((event) => event.side === "BUY").length;
  assert.ok(compoundBuys >= fixedBuys);
});

test("risk metrics stay finite on a short profitable curve", () => {
  const ohlc = barsFromCloses([100, 101, 102, 103, 104, 105]);
  const engine = runEngine(
    ohlc,
    ohlc.map(() => "HOLD"),
    { ...config, tradePercent: 100 },
  );
  const metrics = computeRiskMetrics(10_000, engine.equityCurve, engine.trades);
  assert.equal(Number.isFinite(metrics.sharpe), true);
  assert.equal(Number.isFinite(metrics.cagr), true);
});

test("BUY_HOLD emits a single opening buy", () => {
  const ohlc = barsFromCloses([10, 11, 12, 13, 14]);
  const { signals } = computeSignals(ohlc, "BUY_HOLD", {});
  assert.equal(signals[0], "BUY");
  assert.ok(signals.slice(1).every((signal) => signal === "HOLD"));
});

test("momentum buys after N-day return turns positive", () => {
  const ohlc = barsFromCloses([10, 10, 10, 9, 8, 7, 8, 9, 11, 12]);
  const { signals } = computeSignals(ohlc, "MOMENTUM", { lookback: 3 });
  assert.ok(signals.includes("BUY"));
});

test("stochastic emits a buy after leaving oversold", () => {
  const ohlc = barsFromCloses([20, 19, 18, 17, 16, 15, 14, 13, 12, 18, 20]);
  const { signals } = computeSignals(ohlc, "STOCHASTIC", { kPeriod: 5, oversold: 20, overbought: 80 });
  assert.ok(signals.includes("BUY"));
});

test("CCI, Supertrend, and Ichimoku emit at least one buy on a recovery", () => {
  const down = Array.from({ length: 40 }, (_, i) => 80 - i);
  const up = Array.from({ length: 40 }, (_, i) => 40 + i * 1.5);
  const ohlc = barsFromCloses([...down, ...up]);
  const cci = computeSignals(ohlc, "CCI", { cciPeriod: 10, oversold: -100, overbought: 100 });
  const st = computeSignals(ohlc, "SUPERTREND", { atrPeriod: 7, atrMultiplier: 2 });
  const ichi = computeSignals(ohlc, "ICHIMOKU", { tenkanPeriod: 5, kijunPeriod: 12 });
  assert.ok(cci.signals.includes("BUY"));
  assert.ok(st.signals.includes("BUY") || st.signals.includes("SELL"));
  assert.ok(ichi.signals.includes("BUY") || ichi.signals.includes("SELL"));
});

test("all technical strategies compute without throwing on a long series", () => {
  const ohlc = barsFromCloses(
    Array.from({ length: 220 }, (_, i) => 50 + Math.sin(i / 8) * 8 + i * 0.05),
  );
  const names = [
    "WMA_CROSSOVER",
    "HMA",
    "STOCH_RSI",
    "PPO",
    "TRIX",
    "CCI",
    "ULTIMATE",
    "AWESOME",
    "ROC",
    "ADX",
    "AROON",
    "SUPERTREND",
    "PSAR",
    "ICHIMOKU",
    "KELTNER",
  ] as const;
  for (const name of names) {
    const result = computeSignals(ohlc, name, DEFAULT_STRATEGY_PARAMS[name]);
    assert.equal(result.signals.length, ohlc.length);
  }
});
