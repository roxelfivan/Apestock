import path from "node:path";
import type { AssetType, OhlcBar } from "../types.js";
import {
  isServerlessCwd,
  readDurableText,
  serverlessTmpDir,
  writeDurableText,
} from "./durableStore.js";
import type { PriceSource } from "./priceProviders.js";

export interface StoredPrices {
  symbol: string;
  assetType: AssetType;
  bars: OhlcBar[];
  updatedAt: string;
  source?: PriceSource;
}

const memory = new Map<string, StoredPrices>();

function seedCacheDir(): string {
  return path.join(process.cwd(), "data", "prices");
}

export function priceCacheDir(): string {
  if (process.env.PRICE_CACHE_DIR) return process.env.PRICE_CACHE_DIR;
  if (isServerlessCwd()) {
    return serverlessTmpDir("prices");
  }
  return seedCacheDir();
}

function fileFor(dir: string, symbol: string): string {
  const safe = symbol.replace(/[^A-Z0-9-]/g, "_");
  return path.join(dir, `${safe}.json`);
}

function blobKey(symbol: string): string {
  const safe = symbol.replace(/[^A-Z0-9-]/g, "_");
  return `prices/${safe}.json`;
}

export function mergeBars(...series: OhlcBar[][]): OhlcBar[] {
  const byDate = new Map<string, OhlcBar>();
  for (const bars of series) {
    for (const bar of bars) {
      byDate.set(bar.date, { ...bar });
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function cloneEntry(entry: StoredPrices): StoredPrices {
  return {
    ...entry,
    bars: entry.bars.map((bar) => ({ ...bar })),
  };
}

function parseStored(raw: string): StoredPrices | null {
  try {
    const parsed = JSON.parse(raw) as StoredPrices;
    if (!parsed || !Array.isArray(parsed.bars)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function readStoredPrices(symbol: string): Promise<StoredPrices | null> {
  const hit = memory.get(symbol);
  if (hit) {
    return cloneEntry(hit);
  }

  const writeDir = priceCacheDir();
  const seedDir = seedCacheDir();
  const localPaths = [fileFor(writeDir, symbol)];
  if (path.resolve(seedDir) !== path.resolve(writeDir)) {
    localPaths.push(fileFor(seedDir, symbol));
  }

  const raw = await readDurableText(blobKey(symbol), localPaths);
  if (!raw) return null;
  const parsed = parseStored(raw);
  if (!parsed) return null;
  memory.set(symbol, parsed);
  return cloneEntry(parsed);
}

export async function writeStoredPrices(entry: StoredPrices): Promise<void> {
  const copy = cloneEntry(entry);
  memory.set(entry.symbol, copy);
  await writeDurableText(blobKey(entry.symbol), fileFor(priceCacheDir(), entry.symbol), JSON.stringify(copy));
}
