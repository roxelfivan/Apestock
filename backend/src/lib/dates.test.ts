import assert from "node:assert/strict";
import { test } from "node:test";
import { latestCompleteSession } from "./dates.js";
import { mergeBars } from "../services/priceStore.js";

test("US stocks use the prior weekday before the New York close buffer", () => {
  const mondayMorning = new Date("2026-11-02T14:30:00.000Z"); // 09:30 ET
  assert.equal(latestCompleteSession("STOCK", mondayMorning), "2026-10-30");
});

test("US stocks include the session after 17:00 ET", () => {
  const mondayEvening = new Date("2026-11-02T22:30:00.000Z"); // 17:30 ET
  assert.equal(latestCompleteSession("STOCK", mondayEvening), "2026-11-02");
});

test("US stocks skip the weekend", () => {
  const saturday = new Date("2026-11-07T18:00:00.000Z");
  assert.equal(latestCompleteSession("STOCK", saturday), "2026-11-06");
});

test("crypto uses the prior UTC day as the last complete bar", () => {
  assert.equal(latestCompleteSession("CRYPTO", new Date("2026-11-06T08:00:00.000Z")), "2026-11-05");
});

test("mergeBars overwrites the same date and keeps order", () => {
  const merged = mergeBars(
    [
      { date: "2026-01-02", open: 1, high: 1, low: 1, close: 1 },
      { date: "2026-01-01", open: 1, high: 1, low: 1, close: 1 },
    ],
    [{ date: "2026-01-02", open: 2, high: 2, low: 2, close: 2 }],
  );
  assert.deepEqual(
    merged.map((bar) => [bar.date, bar.close]),
    [
      ["2026-01-01", 1],
      ["2026-01-02", 2],
    ],
  );
});
