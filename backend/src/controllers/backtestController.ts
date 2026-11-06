import type { Request, Response } from "express";
import { sliceFor } from "../data/universe.js";
import { httpStatus, sanitizeUserError } from "../errors.js";
import { executeBacktest } from "../engine/execute.js";
import { executeSweep, executeWalkForward } from "../engine/research.js";
import { syncSymbolPrices } from "../services/dataService.js";
import { getUniverseSnapshot } from "../services/universeService.js";
import type { AssetType, BacktestRequest } from "../types.js";

function handleError(res: Response, error: unknown): Response {
  const status = httpStatus(error);
  const message = sanitizeUserError(error, "Backtest failed.");
  if (status >= 500) console.error(error);
  return res.status(status).json({ error: message });
}

export async function runBacktest(req: Request, res: Response): Promise<Response> {
  try {
    const result = await executeBacktest((req.body ?? {}) as BacktestRequest);
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

export async function runSweep(req: Request, res: Response): Promise<Response> {
  try {
    const result = await executeSweep((req.body ?? {}) as BacktestRequest);
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

export async function runWalkForward(req: Request, res: Response): Promise<Response> {
  try {
    const result = await executeWalkForward((req.body ?? {}) as BacktestRequest);
    return res.json(result);
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getUniverse(req: Request, res: Response): Promise<Response> {
  try {
    const snapshot = await getUniverseSnapshot();
    const rawType = req.query.assetType;
    if (rawType == null || rawType === "") {
      return res.json(snapshot);
    }
    const assetType = String(rawType).toUpperCase() as AssetType;
    if (assetType !== "STOCK" && assetType !== "CRYPTO") {
      return res.status(400).json({ error: "assetType must be STOCK or CRYPTO." });
    }
    const slice = sliceFor(snapshot, assetType);
    return res.json({
      assetType,
      fetchedAt: snapshot.fetchedAt,
      symbols: slice.symbols,
      groups: slice.groups,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function syncPrices(req: Request, res: Response): Promise<Response> {
  try {
    const body = (req.body ?? {}) as { ticker?: string; assetType?: string };
    const ticker = typeof body.ticker === "string" ? body.ticker.trim().toUpperCase() : "";
    const assetType = String(body.assetType ?? "").toUpperCase() as AssetType;
    if (!ticker) return res.status(400).json({ error: "Missing ticker." });
    if (assetType !== "STOCK" && assetType !== "CRYPTO") {
      return res.status(400).json({ error: "assetType must be STOCK or CRYPTO." });
    }
    return res.json(await syncSymbolPrices(ticker, assetType));
  } catch (error) {
    return handleError(res, error);
  }
}
