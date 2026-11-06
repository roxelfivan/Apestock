import assert from "node:assert/strict";
import { test } from "node:test";
import { readStoredPrices, writeStoredPrices } from "./priceStore.js";

test("writeStoredPrices keeps bars in memory when the disk path is not writable", async () => {
  const previous = process.env.PRICE_CACHE_DIR;
  process.env.PRICE_CACHE_DIR = "/var/task/data/prices";
  try {
    await writeStoredPrices({
      symbol: "TLT",
      assetType: "STOCK",
      bars: [{ date: "2026-11-05", open: 1, high: 1, low: 1, close: 1 }],
      updatedAt: "2026-11-06T00:00:00.000Z",
    });
    const stored = await readStoredPrices("TLT");
    assert.equal(stored?.bars[0]?.close, 1);
  } finally {
    if (previous === undefined) delete process.env.PRICE_CACHE_DIR;
    else process.env.PRICE_CACHE_DIR = previous;
  }
});
