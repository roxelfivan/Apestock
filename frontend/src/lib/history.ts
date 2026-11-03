import type { BacktestConfig, BacktestResult, SavedRun } from "../types";

const KEY = "apestock.runs.v1";
const MAX_RUNS = 12;

function readAll(): SavedRun[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedRun[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadRuns(): SavedRun[] {
  return readAll();
}

export function saveRun(config: BacktestConfig, result: BacktestResult): SavedRun[] {
  const run: SavedRun = {
    id: `${Date.now()}-${config.ticker}-${config.strategy}`,
    createdAt: new Date().toISOString(),
    config,
    result,
  };
  const next = [run, ...readAll().filter((item) => item.id !== run.id)].slice(0, MAX_RUNS);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
