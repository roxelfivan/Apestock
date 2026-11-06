import type { AssetType } from "../types.js";

export interface UniverseGroup {
  label: string;
  symbols: string[];
}

export interface UniverseSlice {
  symbols: string[];
  groups: UniverseGroup[];
}

export interface UniverseSnapshot {
  fetchedAt: string;
  stock: UniverseSlice;
  crypto: UniverseSlice;
}

export function unique(symbols: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const symbol of symbols) {
    if (seen.has(symbol)) continue;
    seen.add(symbol);
    out.push(symbol);
  }
  return out;
}

export function yahooSymbol(raw: string): string {
  return raw.trim().toUpperCase().replace(/\./g, "-");
}

export function sliceFor(snapshot: UniverseSnapshot, assetType: AssetType): UniverseSlice {
  return assetType === "CRYPTO" ? snapshot.crypto : snapshot.stock;
}

export function isValidTicker(ticker: string, assetType: AssetType, snapshot: UniverseSnapshot): boolean {
  const symbol = yahooSymbol(ticker);
  return sliceFor(snapshot, assetType).symbols.includes(symbol);
}
