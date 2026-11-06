import type { AssetType, UniverseSlice, UniverseSnapshot } from "../types";

export function sliceFor(snapshot: UniverseSnapshot, assetType: AssetType): UniverseSlice {
  return assetType === "CRYPTO" ? snapshot.crypto : snapshot.stock;
}

export function universeFor(snapshot: UniverseSnapshot, assetType: AssetType): string[] {
  return sliceFor(snapshot, assetType).symbols;
}

export function universeGroups(snapshot: UniverseSnapshot, assetType: AssetType) {
  return sliceFor(snapshot, assetType).groups;
}

export function isValidTicker(ticker: string, assetType: AssetType, snapshot: UniverseSnapshot | null): boolean {
  if (!snapshot) return false;
  const symbol = (ticker || "").trim().toUpperCase();
  return universeFor(snapshot, assetType).includes(symbol);
}

export const UNIVERSE_STORAGE_KEY = "apestock.universe.v1";

export function readStoredUniverse(): UniverseSnapshot | null {
  try {
    const raw = localStorage.getItem(UNIVERSE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UniverseSnapshot;
    if (!parsed?.stock?.groups || !parsed?.crypto?.groups) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function storeUniverse(snapshot: UniverseSnapshot): void {
  try {
    localStorage.setItem(UNIVERSE_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore quota / private-mode failures.
  }
}
