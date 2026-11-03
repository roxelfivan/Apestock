import { useMemo, useState, type FormEvent } from "react";
import AssetSelector from "./components/AssetSelector";
import MetricsDashboard from "./components/MetricsDashboard";
import StrategyForm from "./components/StrategyForm";
import { isValidTicker, universeFor } from "./data/universes";
import type { ApiError, AssetType, BacktestResult, StrategyName, StrategyParams, Timeframe } from "./types";

const DEFAULT_PARAMS: Record<StrategyName, StrategyParams> = {
  MA_CROSSOVER: { shortPeriod: 50, longPeriod: 200 },
  RSI: { rsiPeriod: 14, oversold: 30, overbought: 70 },
};

export default function App() {
  const [assetType, setAssetType] = useState<AssetType>("STOCK");
  const [ticker, setTicker] = useState("AAPL");
  const [strategy, setStrategy] = useState<StrategyName>("MA_CROSSOVER");
  const [params, setParams] = useState<StrategyParams>(DEFAULT_PARAMS.MA_CROSSOVER);
  const [startingCapital, setStartingCapital] = useState(10000);
  const [timeframe, setTimeframe] = useState<Timeframe>("3Y");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BacktestResult | null>(null);

  const tickerValid = useMemo(() => isValidTicker(ticker, assetType), [ticker, assetType]);

  function handleAssetTypeChange(nextType: AssetType) {
    setAssetType(nextType);
    const nextUniverse = universeFor(nextType);
    setTicker(nextUniverse[0]);
    setResult(null);
    setError("");
  }

  function handleStrategyChange(nextStrategy: StrategyName) {
    setStrategy(nextStrategy);
    setParams(DEFAULT_PARAMS[nextStrategy]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tickerValid) {
      setError("Enter a ticker from the selected universe.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: ticker.trim().toUpperCase(),
          assetType,
          strategy,
          params,
          startingCapital,
          timeframe,
        }),
      });
      const payload = (await response.json()) as BacktestResult & ApiError;
      if (!response.ok) {
        throw new Error(payload.error || "Backtest failed.");
      }
      setResult(payload);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Unable to run backtest.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">Apestock</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">Daily backtester</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Top 50 S&P, Nasdaq, and US ETFs plus top-50 crypto. EOD Yahoo data, MA crossover or RSI.
              Signals fire on the close;
              fills happen at the next open.
            </p>
          </div>
          <div className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-400">
            100% long · no shorting · T+1 open
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-4">
            <AssetSelector
              assetType={assetType}
              ticker={ticker}
              onAssetTypeChange={handleAssetTypeChange}
              onTickerChange={setTicker}
            />
            <StrategyForm
              strategy={strategy}
              params={params}
              startingCapital={startingCapital}
              timeframe={timeframe}
              loading={loading}
              tickerValid={tickerValid}
              onStrategyChange={handleStrategyChange}
              onParamsChange={(patch) => setParams((current) => ({ ...current, ...patch }))}
              onStartingCapitalChange={setStartingCapital}
              onTimeframeChange={setTimeframe}
              onSubmit={handleSubmit}
            />
            {error ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            ) : null}
          </div>
          <MetricsDashboard result={result} />
        </div>
      </div>
    </div>
  );
}
