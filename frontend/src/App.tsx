import { useEffect, useMemo, useState, type FormEvent } from "react";
import packageJson from "../package.json";
import AssetSelector from "./components/AssetSelector";
import CommitteeBox from "./components/CommitteeBox";
import DrawdownChart from "./components/DrawdownChart";
import MetricsDashboard from "./components/MetricsDashboard";
import MonthlyGrid from "./components/MonthlyGrid";
import PriceChart from "./components/PriceChart";
import ResearchPanels from "./components/ResearchPanels";
import RunHistory from "./components/RunHistory";
import StrategyForm from "./components/StrategyForm";
import TradeTable from "./components/TradeTable";
import { isValidTicker, readStoredUniverse, storeUniverse, universeFor, universeIsFresh } from "./data/universes";
import { fetchUniverse, runBacktest, runSweep, runWalkForward, syncPrices } from "./lib/api";
import { sanitizeUserError } from "./lib/errors";
import { DEFAULT_PARAMS } from "./lib/defaults";
import { loadRuns, saveRun } from "./lib/history";
import { configFromSearch, searchFromConfig } from "./lib/queryState";
import { paramsError } from "./lib/validation";
import type {
  AssetType,
  BacktestConfig,
  BacktestResult,
  SavedRun,
  SizingMode,
  StrategyName,
  SweepResult,
  Timeframe,
  PriceSyncResult,
  UniverseSnapshot,
  WalkForwardResult,
} from "./types";

function defaultCustomStart(): string {
  const end = new Date();
  const start = new Date(end);
  start.setUTCFullYear(start.getUTCFullYear() - 3);
  return start.toISOString().slice(0, 10);
}

function defaultCustomEnd(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function App() {
  const initial = useMemo(() => configFromSearch(window.location.search), []);
  const [assetType, setAssetType] = useState<AssetType>(initial.assetType ?? "STOCK");
  const [ticker, setTicker] = useState(initial.ticker ?? "AAPL");
  const [strategy, setStrategy] = useState<StrategyName>(initial.strategy ?? "MA_CROSSOVER");
  const [params, setParams] = useState(initial.params ?? DEFAULT_PARAMS.MA_CROSSOVER);
  const [startingCapital, setStartingCapital] = useState(initial.startingCapital ?? 10_000);
  const [tradePercent, setTradePercent] = useState(initial.tradePercent ?? 20);
  const [timeframe, setTimeframe] = useState<Timeframe>(initial.timeframe ?? "3Y");
  const [startDate, setStartDate] = useState(initial.startDate ?? defaultCustomStart());
  const [endDate, setEndDate] = useState(initial.endDate ?? defaultCustomEnd());
  const [commissionBps, setCommissionBps] = useState(initial.commissionBps ?? 0);
  const [commissionPerShare, setCommissionPerShare] = useState(initial.commissionPerShare ?? 0);
  const [slippageBps, setSlippageBps] = useState(initial.slippageBps ?? 0);
  const [sizingMode, setSizingMode] = useState<SizingMode>(initial.sizingMode ?? "fixed_from_start");
  const [allowAnySymbol, setAllowAnySymbol] = useState(initial.allowAnySymbol ?? false);
  const [loading, setLoading] = useState(false);
  const [researchBusy, setResearchBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [stale, setStale] = useState(false);
  const [runs, setRuns] = useState<SavedRun[]>(() => loadRuns());
  const [compareId, setCompareId] = useState<string | null>(null);
  const [sweep, setSweep] = useState<SweepResult | null>(null);
  const [walkForward, setWalkForward] = useState<WalkForwardResult | null>(null);
  const [universe, setUniverse] = useState<UniverseSnapshot | null>(() => readStoredUniverse());
  const [universeLoading, setUniverseLoading] = useState(() => !readStoredUniverse());
  const [universeError, setUniverseError] = useState("");
  const [priceSync, setPriceSync] = useState<PriceSyncResult | null>(null);

  const tickerValid = useMemo(
    () => allowAnySymbol || isValidTicker(ticker, assetType, universe),
    [allowAnySymbol, ticker, assetType, universe],
  );
  const formError = paramsError(strategy, params);
  const config = useMemo<BacktestConfig>(
    () => ({
      ticker,
      assetType,
      strategy,
      params,
      startingCapital,
      tradePercent,
      timeframe,
      startDate,
      endDate,
      commissionBps,
      commissionPerShare,
      slippageBps,
      sizingMode,
      allowAnySymbol,
    }),
    [
      ticker,
      assetType,
      strategy,
      params,
      startingCapital,
      tradePercent,
      timeframe,
      startDate,
      endDate,
      commissionBps,
      commissionPerShare,
      slippageBps,
      sizingMode,
      allowAnySymbol,
    ],
  );

  useEffect(() => {
    const next = searchFromConfig(config);
    if (next !== window.location.search) {
      window.history.replaceState(null, "", next);
    }
  }, [config]);

  useEffect(() => {
    if (universeIsFresh(readStoredUniverse())) {
      setUniverseLoading(false);
      return;
    }
    let cancelled = false;
    fetchUniverse()
      .then((snapshot) => {
        if (cancelled) return;
        setUniverse(snapshot);
        storeUniverse(snapshot);
        setUniverseError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setUniverseError(err instanceof Error ? err.message : "Unable to load ranked tickers.");
      })
      .finally(() => {
        if (!cancelled) setUniverseLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function markStale() {
    if (result) setStale(true);
  }

  function handleAssetTypeChange(nextType: AssetType) {
    setAssetType(nextType);
    if (!allowAnySymbol && universe) {
      const nextSymbols = universeFor(universe, nextType);
      if (nextSymbols[0]) setTicker(nextSymbols[0]);
    }
    setResult(null);
    setError("");
    setStale(false);
  }

  function handleTickerChange(next: string) {
    setTicker(next);
    markStale();
  }

  function handleStrategyChange(nextStrategy: StrategyName) {
    setStrategy(nextStrategy);
    setParams(DEFAULT_PARAMS[nextStrategy]);
    markStale();
  }

  async function refreshPrices(): Promise<void> {
    const symbol = ticker.trim().toUpperCase();
    if (!symbol) return;
    if (universe && !allowAnySymbol && !isValidTicker(symbol, assetType, universe)) return;
    try {
      setPriceSync(await syncPrices(symbol, assetType));
    } catch {
      // Backtest/research still fetch bars; skip UI status on a sync failure.
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tickerValid) {
      setError("Enter a ticker from the selected universe, or enable any-symbol search.");
      return;
    }
    if (formError) {
      setError(formError);
      return;
    }

    setLoading(true);
    setError("");
    try {
      await refreshPrices();
      const payload = await runBacktest(config);
      setResult(payload);
      setStale(false);
      setRuns(saveRun(config, payload));
    } catch (err) {
      setResult(null);
      setError(sanitizeUserError(err, "Unable to run backtest."));
    } finally {
      setLoading(false);
    }
  }

  async function handleSweep() {
    setResearchBusy(true);
    setError("");
    try {
      await refreshPrices();
      setSweep(await runSweep(config));
    } catch (err) {
      setError(sanitizeUserError(err, "Sweep failed."));
    } finally {
      setResearchBusy(false);
    }
  }

  async function handleWalkForward() {
    setResearchBusy(true);
    setError("");
    try {
      await refreshPrices();
      setWalkForward(await runWalkForward(config));
    } catch (err) {
      setError(sanitizeUserError(err, "Walk-forward failed."));
    } finally {
      setResearchBusy(false);
    }
  }

  function restoreRun(run: SavedRun) {
    const next = run.config;
    setAssetType(next.assetType);
    setTicker(next.ticker);
    setStrategy(next.strategy);
    setParams(next.params);
    setStartingCapital(next.startingCapital);
    setTradePercent(next.tradePercent);
    setTimeframe(next.timeframe);
    setStartDate(next.startDate);
    setEndDate(next.endDate);
    setCommissionBps(next.commissionBps);
    setCommissionPerShare(next.commissionPerShare);
    setSlippageBps(next.slippageBps);
    setSizingMode(next.sizingMode);
    setAllowAnySymbol(next.allowAnySymbol);
    setResult(run.result);
    setStale(false);
    setError("");
  }

  const compare = runs.find((run) => run.id === compareId)?.result ?? null;

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950">
      <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-start gap-4">
            <a
              href="/"
              aria-label="Apestock home"
              className="shrink-0 rounded-2xl outline-none ring-1 ring-emerald-400/25 focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <img
                src="/app-icon.png"
                alt="Apestock"
                width={56}
                height={70}
                className="h-14 w-auto rounded-2xl bg-slate-950"
              />
            </a>
            <div>
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">Apestock</span>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-emerald-300">
                  v{packageJson.version}
                </span>
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">Daily backtester</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Live top-50 S&P, Nasdaq, stock/bond/other ETF, and crypto universes, or any symbol. Daily bars, 24
                technical rules plus buy-and-hold, optional costs, and inspectable trades. Signals on the close; fills at the next open.
              </p>
            </div>
          </div>
          <div className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-400">
            long only · T+1 open · warmup before the test window
          </div>
        </header>

        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4">
            <AssetSelector
              assetType={assetType}
              ticker={ticker}
              allowAnySymbol={allowAnySymbol}
              universe={universe}
              universeLoading={universeLoading}
              universeError={universeError}
              priceSync={priceSync}
              onAssetTypeChange={handleAssetTypeChange}
              onTickerChange={handleTickerChange}
              onAllowAnySymbolChange={(value) => {
                setAllowAnySymbol(value);
                markStale();
              }}
            />
            <StrategyForm
              strategy={strategy}
              params={params}
              startingCapital={startingCapital}
              tradePercent={tradePercent}
              timeframe={timeframe}
              startDate={startDate}
              endDate={endDate}
              commissionBps={commissionBps}
              commissionPerShare={commissionPerShare}
              slippageBps={slippageBps}
              sizingMode={sizingMode}
              loading={loading}
              tickerValid={tickerValid}
              paramsValid={!formError}
              paramsError={formError}
              onStrategyChange={handleStrategyChange}
              onParamsChange={(patch) => {
                setParams((current) => ({ ...current, ...patch }));
                markStale();
              }}
              onStartingCapitalChange={(value) => {
                setStartingCapital(value);
                markStale();
              }}
              onTradePercentChange={(value) => {
                setTradePercent(value);
                markStale();
              }}
              onTimeframeChange={(value) => {
                setTimeframe(value);
                markStale();
              }}
              onStartDateChange={(value) => {
                setStartDate(value);
                markStale();
              }}
              onEndDateChange={(value) => {
                setEndDate(value);
                markStale();
              }}
              onCommissionBpsChange={(value) => {
                setCommissionBps(value);
                markStale();
              }}
              onCommissionPerShareChange={(value) => {
                setCommissionPerShare(value);
                markStale();
              }}
              onSlippageBpsChange={(value) => {
                setSlippageBps(value);
                markStale();
              }}
              onSizingModeChange={(value) => {
                setSizingMode(value);
                markStale();
              }}
              onSubmit={handleSubmit}
            />
            <ResearchPanels
              sweep={sweep}
              walkForward={walkForward}
              busy={researchBusy}
              onSweep={handleSweep}
              onWalkForward={handleWalkForward}
            />
            {error ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 break-words">
                {error}
              </div>
            ) : null}
          </div>
          <div className="min-w-0 space-y-4">
            <MetricsDashboard result={result} compare={compare} loading={loading} stale={stale} />
            {result?.committee?.members.length ? (
              <div className={loading || stale ? "opacity-60" : ""}>
                <CommitteeBox committee={result.committee} />
              </div>
            ) : null}
            {result ? <PriceChart result={result} /> : null}
            {result ? <DrawdownChart result={result} /> : null}
            {result ? <MonthlyGrid result={result} /> : null}
            {result ? <TradeTable result={result} /> : null}
            <RunHistory runs={runs} compareId={compareId} onCompare={setCompareId} onRestore={restoreRun} />
          </div>
        </div>
      </div>
    </div>
  );
}
