import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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
import { DEFAULT_PARAMS, STRATEGY_LABELS } from "./lib/defaults";
import { btnPrimary } from "./ui";
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
  StrategyParams,
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
  const [pane, setPane] = useState<"setup" | "results">("setup");
  const errorRef = useRef<HTMLDivElement>(null);
  const runIdRef = useRef(0);

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

  async function executeBacktest(nextConfig: BacktestConfig): Promise<void> {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    setLoading(true);
    setError("");
    try {
      await refreshPrices();
      const payload = await runBacktest(nextConfig);
      // A newer request already landed: drop this response so the charts match the latest click.
      if (runIdRef.current !== runId) return;
      setResult(payload);
      setStale(false);
      setRuns(saveRun(nextConfig, payload));
    } catch (err) {
      if (runIdRef.current !== runId) return;
      setResult(null);
      setError(sanitizeUserError(err, "Unable to run backtest."));
      setPane("setup");
      queueMicrotask(() => errorRef.current?.focus());
    } finally {
      if (runIdRef.current === runId) setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tickerValid) {
      setError("Enter a ticker from the selected universe, or enable any-symbol search.");
      setPane("setup");
      queueMicrotask(() => errorRef.current?.focus());
      return;
    }
    if (formError) {
      setError(formError);
      setPane("setup");
      queueMicrotask(() => errorRef.current?.focus());
      return;
    }

    setPane("results");
    await executeBacktest(config);
  }

  function handleCommitteeSelect(nextStrategy: StrategyName, nextParams: StrategyParams) {
    const resolvedParams =
      nextStrategy === strategy ? params : nextParams ?? DEFAULT_PARAMS[nextStrategy];
    setStrategy(nextStrategy);
    setParams(resolvedParams);
    setSweep(null);
    setWalkForward(null);
    void executeBacktest({ ...config, strategy: nextStrategy, params: resolvedParams });
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
    void syncPrices(
      next.ticker,
      next.assetType,
      (run.result.bars ?? []).map((bar) => ({
        date: bar.date,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      })),
    )
      .then(setPriceSync)
      .catch(() => undefined);
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
    setPane("results");
  }

  const compare = runs.find((run) => run.id === compareId)?.result ?? null;

  const canRun = tickerValid && !formError && !loading;

  return (
    <div className="min-h-dvh overflow-x-hidden bg-slate-950">
      <a
        href="#results"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-emerald-400 focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950"
      >
        Skip to results
      </a>
      <div className="mx-auto w-full min-w-0 max-w-7xl px-4 pb-36 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 lg:mb-8">
          <div className="flex min-w-0 items-center gap-3">
            <a
              href="/"
              aria-label="Apestock home"
              className="shrink-0 rounded-xl outline-none ring-1 ring-emerald-400/25 focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <img
                src="/app-icon.png"
                alt=""
                width={44}
                height={55}
                className="h-11 w-auto rounded-xl bg-slate-950"
              />
            </a>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">Apestock</span>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-medium tracking-wide text-emerald-300">
                  v{packageJson.version}
                </span>
              </p>
              <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">Daily backtester</h1>
              <p className="mt-1 hidden max-w-2xl text-sm text-slate-400 lg:block">
                Ranked US stocks, ETFs, and crypto, or any symbol. Daily bars, technical rules plus buy-and-hold.
                Signals on the close; fills at the next open.
              </p>
            </div>
          </div>
          <p className="hidden rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-400 lg:block">
            long only · T+1 open · warmup before the test window
          </p>
        </header>

        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <div className={`min-w-0 space-y-4 lg:block ${pane === "setup" ? "block" : "hidden"}`}>
            {error ? (
              <div
                ref={errorRef}
                tabIndex={-1}
                role="alert"
                aria-labelledby="error-title"
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 outline-none break-words focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                <p id="error-title" className="font-semibold text-rose-200">
                  There is a problem
                </p>
                <p className="mt-1">{error}</p>
              </div>
            ) : null}
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
          </div>
          <div
            id="results"
            className={`min-w-0 space-y-4 scroll-mt-4 lg:block ${pane === "results" ? "block" : "hidden"}`}
          >
            <MetricsDashboard
              result={result}
              compare={compare}
              loading={loading}
              stale={stale}
              onGoToSetup={() => setPane("setup")}
            />
            {result ? <PriceChart result={result} /> : null}
            {result ? <DrawdownChart result={result} /> : null}
            {result ? <MonthlyGrid result={result} /> : null}
            {result?.committee?.members.length ? (
              <div className={loading || stale ? "opacity-60" : ""}>
                <CommitteeBox committee={result.committee} onSelect={handleCommitteeSelect} busy={loading} />
              </div>
            ) : null}
            {result ? <TradeTable result={result} /> : null}
            <RunHistory runs={runs} compareId={compareId} onCompare={setCompareId} onRestore={restoreRun} />
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur lg:hidden">
        <div className="px-4 pt-2" style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}>
          {pane === "setup" ? (
            <button type="submit" form="backtest-form" disabled={!canRun} className={`${btnPrimary} mb-2`}>
              {loading ? "Running backtest…" : `Run ${ticker.trim().toUpperCase() || "backtest"}`}
            </button>
          ) : (
            <p className="mb-2 truncate text-center text-xs text-slate-400">
              {result
                ? `${result.ticker} · ${result.strategy ? STRATEGY_LABELS[result.strategy] : "strategy"} · ${result.timeframe}`
                : "Set a ticker and rule, then run a backtest"}
            </p>
          )}
          <nav aria-label="App sections" className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPane("setup")}
              aria-current={pane === "setup" ? "page" : undefined}
              className={`min-h-11 rounded-xl text-sm font-semibold transition duration-200 ${
                pane === "setup" ? "bg-slate-100 text-slate-950" : "border border-slate-700 text-slate-300"
              }`}
            >
              Setup
            </button>
            <button
              type="button"
              onClick={() => setPane("results")}
              aria-current={pane === "results" ? "page" : undefined}
              className={`min-h-11 rounded-xl text-sm font-semibold transition duration-200 ${
                pane === "results" ? "bg-slate-100 text-slate-950" : "border border-slate-700 text-slate-300"
              }`}
            >
              Results
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
