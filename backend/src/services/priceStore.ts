import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AssetType, OhlcBar } from "../types.js";

export interface StoredPrices {
  symbol: string;
  assetType: AssetType;
  bars: OhlcBar[];
  updatedAt: string;
}

const memory = new Map<string, StoredPrices>();

function isServerlessCwd(cwd: string): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT ||
      cwd === "/var/task" ||
      cwd.startsWith("/var/task/"),
  );
}

export function priceCacheDir(): string {
  if (process.env.PRICE_CACHE_DIR) return process.env.PRICE_CACHE_DIR;
  const cwd = process.cwd();
  if (isServerlessCwd(cwd)) {
    return path.join(tmpdir(), "apestock", "prices");
  }
  return path.join(cwd, "data", "prices");
}

function fileFor(symbol: string): string {
  const safe = symbol.replace(/[^A-Z0-9-]/g, "_");
  return path.join(priceCacheDir(), `${safe}.json`);
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
  const hit = memory.get(symbol);
  if (hit) {
    return { ...hit, bars: hit.bars.map((bar) => ({ ...bar })) };
  }
  try {
    const raw = await readFile(fileFor(symbol), "utf8");
    const parsed = JSON.parse(raw) as StoredPrices;
    if (!parsed || !Array.isArray(parsed.bars)) return null;
    memory.set(symbol, parsed);
    return { ...parsed, bars: parsed.bars.map((bar) => ({ ...bar })) };
  } catch {
    return null;
  }
}

export async function writeStoredPrices(entry: StoredPrices): Promise<void> {
  const copy: StoredPrices = {
    ...entry,
    bars: entry.bars.map((bar) => ({ ...bar })),
  };
  memory.set(entry.symbol, copy);
  try {
    await mkdir(priceCacheDir(), { recursive: true });
    await writeFile(fileFor(entry.symbol), JSON.stringify(copy), "utf8");
  } catch {
    // Serverless bundles are read-only; /tmp and in-memory still serve the process.
  }
}
