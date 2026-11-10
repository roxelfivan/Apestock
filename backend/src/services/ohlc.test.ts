import assert from "node:assert/strict";
import { test } from "node:test";
import { isCompleteOhlc, rangeCovered, toOhlcBar } from "./dataService.js";

test("toOhlcBar drops Yahoo's in-progress session where close is null", () => {
  assert.equal(
    toOhlcBar({
      date: "2026-11-05",
      open: 81.54,
      high: 82.21,
      low: 81.54,
      close: null,
    }),
    null,
  );
});

test("toOhlcBar drops Number(null) zero closes already written to cache", () => {
  assert.equal(isCompleteOhlc({ date: "2026-11-05", open: 81.54, high: 82.21, low: 81.54, close: 0 }), false);
});

test("toOhlcBar accepts numeric strings from Yahoo quotes", () => {
  const bar = toOhlcBar({ date: "2026-11-04", open: "81.37", high: "81.8", low: "80.89", close: "81.76" });
  assert.equal(bar?.close, 81.76);
});

test("toOhlcBar keeps a finished daily bar", () => {
  const bar = toOhlcBar({
    date: new Date("2026-11-04T14:30:00.000Z"),
    open: 81.37,
    high: 81.8,
    low: 80.89,
    close: 81.76,
  });
  assert.equal(bar?.close, 81.76);
  assert.equal(bar?.date, "2026-11-04");
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
