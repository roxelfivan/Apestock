import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AssetType, OhlcBar } from "../types.js";

export interface StoredPrices {
  symbol: string;
  assetType: AssetType;
  bars: OhlcBar[];
  updatedAt: string;
}

function cacheDir(): string {
  return process.env.PRICE_CACHE_DIR || path.join(process.cwd(), "data", "prices");
}

function fileFor(symbol: string): string {
  const safe = symbol.replace(/[^A-Z0-9-]/g, "_");
  return path.join(cacheDir(), `${safe}.json`);
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

export async function readStoredPrices(symbol: string): Promise<StoredPrices | null> {
  try {
    const raw = await readFile(fileFor(symbol), "utf8");
    const parsed = JSON.parse(raw) as StoredPrices;
    if (!parsed || !Array.isArray(parsed.bars)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeStoredPrices(entry: StoredPrices): Promise<void> {
  await mkdir(cacheDir(), { recursive: true });
  await writeFile(fileFor(entry.symbol), JSON.stringify(entry), "utf8");
}
