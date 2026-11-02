import type { FormEvent } from "react";
import type { StrategyName, StrategyParams, Timeframe } from "../types";

interface StrategyFormProps {
  strategy: StrategyName;
  params: StrategyParams;
  startingCapital: number;
  timeframe: Timeframe;
  loading: boolean;
  tickerValid: boolean;
  onStrategyChange: (strategy: StrategyName) => void;
  onParamsChange: (patch: Partial<StrategyParams>) => void;
  onStartingCapitalChange: (value: number) => void;
  onTimeframeChange: (timeframe: Timeframe) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function StrategyForm({
  strategy,
  params,
  startingCapital,
  timeframe,
  loading,
  tickerValid,
  onStrategyChange,
  onParamsChange,
  onStartingCapitalChange,
  onTimeframeChange,
  onSubmit,
}: StrategyFormProps) {
  const fieldClass =
    "mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/20"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Strategy</p>
      <h2 className="mt-1 text-lg font-semibold text-white">Parameters</h2>

      <label className="mt-4 block text-sm font-medium text-slate-300" htmlFor="strategy">
        Logic
      </label>
      <select
        id="strategy"
        value={strategy}
        onChange={(event) => onStrategyChange(event.target.value as StrategyName)}
        className={fieldClass}
      >
        <option value="MA_CROSSOVER">Moving average crossover</option>
        <option value="RSI">RSI mean reversion</option>
      </select>

      {strategy === "MA_CROSSOVER" ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-300" htmlFor="shortPeriod">
              Short period
            </label>
            <input
              id="shortPeriod"
              type="number"
              min={2}
              value={params.shortPeriod ?? ""}
              onChange={(event) => onParamsChange({ shortPeriod: Number(event.target.value) })}
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300" htmlFor="longPeriod">
              Long period
            </label>
            <input
              id="longPeriod"
              type="number"
              min={3}
              value={params.longPeriod ?? ""}
              onChange={(event) => onParamsChange({ longPeriod: Number(event.target.value) })}
              className={fieldClass}
            />
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-300" htmlFor="rsiPeriod">
              RSI period
            </label>
            <input
              id="rsiPeriod"
              type="number"
              min={2}
              value={params.rsiPeriod ?? ""}
              onChange={(event) => onParamsChange({ rsiPeriod: Number(event.target.value) })}
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300" htmlFor="oversold">
              Oversold (buy)
            </label>
            <input
              id="oversold"
              type="number"
              min={1}
              max={49}
              value={params.oversold ?? ""}
              onChange={(event) => onParamsChange({ oversold: Number(event.target.value) })}
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300" htmlFor="overbought">
              Overbought (sell)
            </label>
            <input
              id="overbought"
              type="number"
              min={51}
              max={99}
              value={params.overbought ?? ""}
              onChange={(event) => onParamsChange({ overbought: Number(event.target.value) })}
              className={fieldClass}
            />
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-300" htmlFor="capital">
            Starting capital
          </label>
          <input
            id="capital"
            type="number"
            min={1}
            value={startingCapital}
            onChange={(event) => onStartingCapitalChange(Number(event.target.value))}
            className={fieldClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300" htmlFor="timeframe">
            Timeframe
          </label>
          <select
            id="timeframe"
            value={timeframe}
            onChange={(event) => onTimeframeChange(event.target.value as Timeframe)}
            className={fieldClass}
          >
            <option value="1Y">1Y</option>
            <option value="3Y">3Y</option>
            <option value="5Y">5Y</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !tickerValid}
        className="mt-5 w-full rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        {loading ? "Running backtest…" : "Run backtest"}
      </button>
    </form>
  );
}
