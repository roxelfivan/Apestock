import path from "node:path";
import type { UniverseSnapshot } from "../data/universe.js";
import {
  isServerlessCwd,
  readDurableText,
  serverlessTmpDir,
  writeDurableText,
} from "./durableStore.js";

const BLOB_KEY = "universe.json";

function universeFile(): string {
  if (process.env.PRICE_CACHE_DIR) {
    return path.join(path.dirname(process.env.PRICE_CACHE_DIR), "universe.json");
  }
  if (isServerlessCwd()) {
    return path.join(serverlessTmpDir(), "universe.json");
  }
  return path.join(process.cwd(), "data", "universe.json");
}

function isSnapshot(value: unknown): value is UniverseSnapshot {
  if (!value || typeof value !== "object") return false;
  const snap = value as UniverseSnapshot;
  return Boolean(snap.stock?.groups && snap.crypto?.groups && typeof snap.fetchedAt === "string");
}

export async function readStoredUniverse(): Promise<UniverseSnapshot | null> {
  const raw = await readDurableText(BLOB_KEY, [universeFile()]);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeStoredUniverse(snapshot: UniverseSnapshot): Promise<void> {
  await writeDurableText(BLOB_KEY, universeFile(), JSON.stringify(snapshot));
}
