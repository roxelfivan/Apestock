import type { Request, Response } from "express";
import { CRYPTO_GROUPS, STOCK_GROUPS, universeFor } from "../data/universe.js";
import { httpStatus } from "../errors.js";
import { executeBacktest } from "../engine/execute.js";
import { executeSweep, executeWalkForward } from "../engine/research.js";
import type { AssetType, BacktestRequest } from "../types.js";

function handleError(res: Response, error: unknown): Response {
  const status = httpStatus(error);
  const message = error instanceof Error ? error.message : "Backtest failed.";
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

export function getUniverse(req: Request, res: Response): Response {
  const assetType = String(req.query.assetType ?? "STOCK").toUpperCase() as AssetType;
  if (assetType !== "STOCK" && assetType !== "CRYPTO") {
    return res.status(400).json({ error: "assetType must be STOCK or CRYPTO." });
  }
  return res.json({
    assetType,
    symbols: universeFor(assetType),
    groups: assetType === "CRYPTO" ? CRYPTO_GROUPS : STOCK_GROUPS,
  });
}
