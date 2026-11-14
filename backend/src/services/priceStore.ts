import path from "node:path";
import type { AssetType, OhlcBar } from "../types.js";
import {
  PRICE_DATABASE_FOLDER,
  isServerlessCwd,
  readBlobPath,
  readJsonFile,
  serverlessTmpDir,
  writeBlobPath,
  writeJsonFile,
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

function safeSymbol(symbol: string): string {
  return symbol.replace(/[^A-Z0-9-]/g, "_");
}

function fileFor(dir: string, symbol: string): string {
  return path.join(dir, `${safeSymbol(symbol)}.json`);
}

export function priceDatabaseBlobPath(symbol: string): string {
  return `${PRICE_DATABASE_FOLDER}/${safeSymbol(symbol)}.json`;
}

function legacyPriceBlobPath(symbol: string): string {
  return `apestock/prices/${safeSymbol(symbol)}.json`;
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

export function barsHaveNewDates(existing: OhlcBar[] | undefined, incoming: OhlcBar[]): boolean {
  if (incoming.length === 0) return false;
  if (!existing?.length) return true;
  const have = new Set(existing.map((bar) => bar.date));
  return incoming.some((bar) => !have.has(bar.date));
}

export function combineStored(entries: Array<StoredPrices | null | undefined>): StoredPrices | null {
  const present = entries.filter((entry): entry is StoredPrices => Boolean(entry && Array.isArray(entry.bars)));
  if (present.length === 0) return null;
  const newest = present.reduce((best, entry) => (entry.updatedAt >= best.updatedAt ? entry : best));
  return {
    symbol: newest.symbol,
    assetType: newest.assetType,
    bars: mergeBars(...present.map((entry) => entry.bars)),
    updatedAt: newest.updatedAt,
    source: newest.source,
  };
}

async function readLocalPrices(symbol: string): Promise<StoredPrices | null> {
  const writeDir = priceCacheDir();
  const seedDir = seedCacheDir();
  const paths = [fileFor(writeDir, symbol)];
  if (path.resolve(seedDir) !== path.resolve(writeDir)) {
    paths.push(fileFor(seedDir, symbol));
  }
  for (const filePath of paths) {
    const raw = await readJsonFile(filePath);
    if (!raw) continue;
    const parsed = parseStored(raw);
    if (parsed) return parsed;
  }
  return null;
}

async function readBlobPrices(symbol: string): Promise<StoredPrices | null> {
  const primary = await readBlobPath(priceDatabaseBlobPath(symbol));
  const parsedPrimary = primary ? parseStored(primary) : null;
  if (parsedPrimary) return parsedPrimary;
  const legacy = await readBlobPath(legacyPriceBlobPath(symbol));
  return legacy ? parseStored(legacy) : null;
}

export async function readStoredPrices(symbol: string): Promise<StoredPrices | null> {
  const fromMemory = memory.get(symbol) ?? null;
  const fromDisk = await readLocalPrices(symbol);
  const fromBlob = await readBlobPrices(symbol);
  const combined = combineStored([fromBlob, fromDisk, fromMemory]);
  if (!combined) return null;
  if (barsHaveNewDates(fromBlob?.bars, combined.bars)) {
    await writeStoredPrices(combined);
  } else {
    memory.set(symbol, combined);
  }
  return cloneEntry(combined);
}

export async function mergeIntoPriceDatabase(entry: StoredPrices): Promise<{ uploaded: boolean; stored: StoredPrices }> {
  const fromBlob = await readBlobPrices(entry.symbol);
  const fromDisk = await readLocalPrices(entry.symbol);
  const fromMemory = memory.get(entry.symbol) ?? null;
  const combined = combineStored([fromBlob, fromDisk, fromMemory, entry]);
  if (!combined) {
    return { uploaded: false, stored: cloneEntry(entry) };
  }
  const uploaded = barsHaveNewDates(fromBlob?.bars, combined.bars);
  if (uploaded) {
    await writeStoredPrices(combined);
  } else {
    memory.set(entry.symbol, combined);
  }
  return { uploaded, stored: cloneEntry(combined) };
}

export async function writeStoredPrices(entry: StoredPrices): Promise<void> {
  const previous = memory.get(entry.symbol) ?? null;
  const copy = combineStored([previous, entry]) ?? cloneEntry(entry);
  memory.set(entry.symbol, copy);
  const body = JSON.stringify(copy);
  try {
    await writeJsonFile(fileFor(priceCacheDir(), entry.symbol), body);
  } catch {
    // Serverless bundles are read-only.
  }
  try {
    await writeBlobPath(priceDatabaseBlobPath(entry.symbol), body);
  } catch {
    // Blob is optional; a missing store must not fail a backtest.
  }
}
