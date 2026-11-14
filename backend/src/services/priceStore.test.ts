import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";
import { PRICE_DATABASE_FOLDER } from "./durableStore.js";
import { fetchHistoricalData } from "./dataService.js";
import {
  barsHaveNewDates,
  combineStored,
  firstCoveringLayer,
  mergeBars,
  priceDatabaseBlobPath,
  readStoredPrices,
  writeStoredPrices,
  type StoredPrices,
} from "./priceStore.js";

function bar(date: string, close: number) {
  return { date, open: close, high: close, low: close, close };
}

function entry(symbol: string, bars: ReturnType<typeof bar>[], source: StoredPrices["source"] = "yahoo"): StoredPrices {
  return {
    symbol,
    assetType: "STOCK",
    bars,
    updatedAt: "2026-11-14T00:00:00.000Z",
    source,
  };
}

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

test("price database files live in a dedicated Blob folder", () => {
  assert.equal(priceDatabaseBlobPath("AAPL"), `${PRICE_DATABASE_FOLDER}/AAPL.json`);
  assert.equal(priceDatabaseBlobPath("BRK-B"), `${PRICE_DATABASE_FOLDER}/BRK-B.json`);
});

test("combineStored unions bars from the shared database and a later download", () => {
  const combined = combineStored([
    {
      symbol: "AAPL",
      assetType: "STOCK",
      updatedAt: "2026-11-10T00:00:00.000Z",
      source: "yahoo",
      bars: [
        { date: "2024-01-02", open: 1, high: 1, low: 1, close: 1 },
        { date: "2024-01-03", open: 1, high: 1, low: 1, close: 1 },
      ],
    },
    {
      symbol: "AAPL",
      assetType: "STOCK",
      updatedAt: "2026-11-14T00:00:00.000Z",
      source: "stooq",
      bars: [{ date: "2024-01-04", open: 2, high: 2, low: 2, close: 2 }],
    },
  ]);
  assert.equal(combined?.source, "stooq");
  assert.deepEqual(
    combined?.bars.map((bar) => bar.date),
    ["2024-01-02", "2024-01-03", "2024-01-04"],
  );
});

test("barsHaveNewDates is true only when the database is missing a session", () => {
  const stored = [
    { date: "2024-01-02", open: 1, high: 1, low: 1, close: 1 },
    { date: "2024-01-03", open: 1, high: 1, low: 1, close: 1 },
  ];
  assert.equal(barsHaveNewDates(stored, stored), false);
  assert.equal(
    barsHaveNewDates(stored, [{ date: "2024-01-04", open: 1, high: 1, low: 1, close: 1 }]),
    true,
  );
  assert.equal(barsHaveNewDates([], [{ date: "2024-01-02", open: 1, high: 1, low: 1, close: 1 }]), true);
});

test("firstCoveringLayer uses Blob when it already spans the window", () => {
  const blob = entry("AAPL", [bar("2024-01-02", 11), bar("2024-01-04", 11)]);
  const local = entry("AAPL", [bar("2024-01-02", 99), bar("2024-01-04", 99)]);
  const picked = firstCoveringLayer(
    [
      { origin: "blob", stored: blob },
      { origin: "local", stored: local },
    ],
    "2024-01-02",
    "2024-01-04",
  );
  assert.equal(picked.covered, true);
  assert.equal(picked.origin, "blob");
  assert.equal(picked.stored?.bars[0]?.close, 11);
});

test("firstCoveringLayer falls through to local when Blob is missing dates", () => {
  const blob = entry("AAPL", [bar("2024-01-03", 11)]);
  const local = entry("AAPL", [bar("2024-01-02", 22), bar("2024-01-04", 22)]);
  const picked = firstCoveringLayer(
    [
      { origin: "blob", stored: blob },
      { origin: "local", stored: local },
    ],
    "2024-01-02",
    "2024-01-04",
  );
  assert.equal(picked.covered, true);
  assert.equal(picked.origin, "local");
  assert.deepEqual(
    picked.stored?.bars.map((row) => [row.date, row.close]),
    [
      ["2024-01-02", 22],
      ["2024-01-03", 11],
      ["2024-01-04", 22],
    ],
  );
});

test("firstCoveringLayer stays uncovered so the caller can download", () => {
  const picked = firstCoveringLayer(
    [
      { origin: "blob", stored: null },
      { origin: "local", stored: entry("AAPL", [bar("2024-01-03", 1)]) },
    ],
    "2024-01-02",
    "2024-01-04",
  );
  assert.equal(picked.covered, false);
  assert.equal(picked.origin, "local");
});

describe("backtest price lookup Blob → local → download", { concurrency: false }, () => {
  async function withCacheDirs<T>(fn: (dirs: { blob: string; local: string }) => Promise<T>): Promise<T> {
    const root = await mkdtemp(path.join(tmpdir(), "ape-price-layers-"));
    const blob = path.join(root, "blob");
    const local = path.join(root, "local");
    await mkdir(path.join(blob, PRICE_DATABASE_FOLDER), { recursive: true });
    await mkdir(local, { recursive: true });
    const previousBlob = process.env.PRICE_BLOB_DIR;
    const previousLocal = process.env.PRICE_CACHE_DIR;
    process.env.PRICE_BLOB_DIR = blob;
    process.env.PRICE_CACHE_DIR = local;
    try {
      return await fn({ blob, local });
    } finally {
      if (previousBlob === undefined) delete process.env.PRICE_BLOB_DIR;
      else process.env.PRICE_BLOB_DIR = previousBlob;
      if (previousLocal === undefined) delete process.env.PRICE_CACHE_DIR;
      else process.env.PRICE_CACHE_DIR = previousLocal;
      await rm(root, { recursive: true, force: true });
    }
  }

  async function writeJson(filePath: string, value: unknown): Promise<void> {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(value), "utf8");
  }

  test("readStoredPrices returns Blob and ignores a conflicting local file", async () => {
    await withCacheDirs(async ({ blob, local }) => {
      await writeJson(path.join(blob, priceDatabaseBlobPath("MSFT")), entry("MSFT", [bar("2024-01-02", 11)]));
      await writeJson(path.join(local, "MSFT.json"), entry("MSFT", [bar("2024-01-02", 99)]));
      const stored = await readStoredPrices("MSFT");
      assert.equal(stored?.bars[0]?.close, 11);
    });
  });

  test("readStoredPrices uses local files when Blob has no object", async () => {
    await withCacheDirs(async ({ local }) => {
      await writeJson(path.join(local, "NVDA.json"), entry("NVDA", [bar("2024-01-02", 44)]));
      const stored = await readStoredPrices("NVDA");
      assert.equal(stored?.bars[0]?.close, 44);
    });
  });

  test("fetchHistoricalData uses Blob prices and does not take local closes", async () => {
    await withCacheDirs(async ({ blob, local }) => {
      const covering = [bar("2024-01-02", 11), bar("2024-01-03", 11), bar("2024-01-04", 11)];
      await writeJson(path.join(blob, priceDatabaseBlobPath("COST")), entry("COST", covering));
      await writeJson(
        path.join(local, "COST.json"),
        entry("COST", [bar("2024-01-02", 99), bar("2024-01-03", 99), bar("2024-01-04", 99)]),
      );
      const bars = await fetchHistoricalData("COST", "STOCK", "2024-01-02", "2024-01-04");
      assert.deepEqual(
        bars.map((row) => row.close),
        [11, 11, 11],
      );
    });
  });

  test("fetchHistoricalData uses local prices when Blob is empty", async () => {
    await withCacheDirs(async ({ local }) => {
      const covering = [bar("2024-01-02", 55), bar("2024-01-03", 55), bar("2024-01-04", 55)];
      await writeJson(path.join(local, "INTC.json"), entry("INTC", covering));
      const bars = await fetchHistoricalData("INTC", "STOCK", "2024-01-02", "2024-01-04");
      assert.deepEqual(
        bars.map((row) => row.close),
        [55, 55, 55],
      );
    });
  });
});
