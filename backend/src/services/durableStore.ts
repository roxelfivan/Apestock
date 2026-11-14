import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const BLOB_PREFIX = "apestock/";

/** Shared EOD folder in the Vercel Blob store (visible as a directory in the dashboard). */
export const PRICE_DATABASE_FOLDER = "price-database";

export function isServerlessCwd(cwd = process.cwd()): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT ||
      cwd === "/var/task" ||
      cwd.startsWith("/var/task/"),
  );
}

export function blobStoreEnabled(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.BLOB_STORE_ID ||
      (process.env.VERCEL && process.env.VERCEL_OIDC_TOKEN),
  );
}

function namespacedBlobPath(key: string): string {
  return `${BLOB_PREFIX}${key.replace(/^\/+/, "")}`;
}

export async function readBlobPath(pathname: string): Promise<string | null> {
  if (!blobStoreEnabled()) return null;
  try {
    const { get } = await import("@vercel/blob");
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return await new Response(result.stream).text();
  } catch {
    return null;
  }
}

export async function writeBlobPath(pathname: string, body: string): Promise<void> {
  if (!blobStoreEnabled()) return;
  const { put } = await import("@vercel/blob");
  await put(pathname, body, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

async function readBlobText(key: string): Promise<string | null> {
  return readBlobPath(namespacedBlobPath(key));
}

async function writeBlobText(key: string, body: string): Promise<void> {
  await writeBlobPath(namespacedBlobPath(key), body);
}

export async function readJsonFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

export async function writeJsonFile(filePath: string, body: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, body, "utf8");
}

export function serverlessTmpDir(...parts: string[]): string {
  return path.join(tmpdir(), "apestock", ...parts);
}

export async function readDurableText(key: string, localPaths: string[]): Promise<string | null> {
  for (const filePath of localPaths) {
    const raw = await readJsonFile(filePath);
    if (raw) return raw;
  }
  return readBlobText(key);
}

export async function writeDurableText(key: string, localPath: string | null, body: string): Promise<void> {
  if (localPath) {
    try {
      await writeJsonFile(localPath, body);
    } catch {
      // Serverless bundles are read-only; Blob and in-memory still serve the process.
    }
  }
  try {
    await writeBlobText(key, body);
  } catch {
    // Blob is optional; a missing store must not fail a backtest.
  }
}
