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

function slimResult(result: BacktestResult): BacktestResult {
  return {
    ...result,
    bars: (result.bars ?? []).map((bar) => ({
      date: bar.date,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      indicators: {},
    })),
    committee: result.committee
      ? {
          ...result.committee,
          members: (result.committee.members ?? []).map((member) => ({
            ...member,
            lastValues: {},
          })),
        }
      : result.committee,
  };
}

function persistRuns(runs: SavedRun[]): void {
  const slim = runs.map((run) => ({ ...run, result: slimResult(run.result) }));
  for (let count = slim.length; count >= 0; count -= 1) {
    try {
      if (count === 0) {
        localStorage.removeItem(KEY);
        return;
      }
      localStorage.setItem(KEY, JSON.stringify(slim.slice(0, count)));
      return;
    } catch {
      // localStorage quota — drop older runs and retry.
    }
  }
}

export function saveRun(config: BacktestConfig, result: BacktestResult): SavedRun[] {
  const run: SavedRun = {
    id: `${Date.now()}-${config.ticker}-${config.strategy}`,
    createdAt: new Date().toISOString(),
    config,
    result,
  };
  const next = [run, ...readAll().filter((item) => item.id !== run.id)].slice(0, MAX_RUNS);
  persistRuns(next);
  return next;
}
