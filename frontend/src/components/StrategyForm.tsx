import type { FormEvent } from "react";
import { STRATEGY_LABELS } from "../lib/defaults";
import type { SizingMode, StrategyName, StrategyParams, Timeframe } from "../types";

interface StrategyFormProps {
  strategy: StrategyName;
  params: StrategyParams;
  startingCapital: number;
  tradePercent: number;
  timeframe: Timeframe;
  startDate: string;
  endDate: string;
  commissionBps: number;
  commissionPerShare: number;
  slippageBps: number;
  sizingMode: SizingMode;
  loading: boolean;
  tickerValid: boolean;
  paramsValid: boolean;
  paramsError: string | null;
  onStrategyChange: (strategy: StrategyName) => void;
  onParamsChange: (patch: Partial<StrategyParams>) => void;
  onStartingCapitalChange: (value: number) => void;
  onTradePercentChange: (value: number) => void;
  onTimeframeChange: (timeframe: Timeframe) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onCommissionBpsChange: (value: number) => void;
  onCommissionPerShareChange: (value: number) => void;
  onSlippageBpsChange: (value: number) => void;
  onSizingModeChange: (value: SizingMode) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export default function StrategyForm({
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
  loading,
  tickerValid,
  paramsValid,
  paramsError,
  onStrategyChange,
  onParamsChange,
  onStartingCapitalChange,
  onTradePercentChange,
  onTimeframeChange,
  onStartDateChange,
  onEndDateChange,
  onCommissionBpsChange,
  onCommissionPerShareChange,
  onSlippageBpsChange,
  onSizingModeChange,
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
        {(Object.keys(STRATEGY_LABELS) as StrategyName[]).map((name) => (
          <option key={name} value={name}>
            {STRATEGY_LABELS[name]}
          </option>
        ))}
      </select>

      {strategy === "MA_CROSSOVER" || strategy === "EMA_CROSSOVER" ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <NumberField
            id="shortPeriod"
            label="Short period"
            min={2}
            value={params.shortPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ shortPeriod: value })}
          />
          <NumberField
            id="longPeriod"
            label="Long period"
            min={3}
            value={params.longPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ longPeriod: value })}
          />
        </div>
      ) : null}

      {strategy === "RSI" ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NumberField
            id="rsiPeriod"
            label="RSI period"
            min={2}
            value={params.rsiPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ rsiPeriod: value })}
          />
          <NumberField
            id="oversold"
            label="Oversold (buy)"
            min={1}
            max={49}
            value={params.oversold}
            className={fieldClass}
            onChange={(value) => onParamsChange({ oversold: value })}
          />
          <NumberField
            id="overbought"
            label="Overbought (sell)"
            min={51}
            max={99}
            value={params.overbought}
            className={fieldClass}
            onChange={(value) => onParamsChange({ overbought: value })}
          />
        </div>
      ) : null}

      {strategy === "MACD" ? (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <NumberField
            id="fastPeriod"
            label="Fast"
            min={2}
            value={params.fastPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ fastPeriod: value })}
          />
          <NumberField
            id="slowPeriod"
            label="Slow"
            min={3}
            value={params.slowPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ slowPeriod: value })}
          />
          <NumberField
            id="signalPeriod"
            label="Signal"
            min={1}
            value={params.signalPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ signalPeriod: value })}
          />
        </div>
      ) : null}

      {strategy === "BOLLINGER" ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <NumberField
            id="bbPeriod"
            label="Period"
            min={2}
            value={params.bbPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ bbPeriod: value })}
          />
          <NumberField
            id="bbStdDev"
            label="Std dev"
            min={0.1}
            step={0.1}
            value={params.bbStdDev}
            className={fieldClass}
            onChange={(value) => onParamsChange({ bbStdDev: value })}
          />
        </div>
      ) : null}

      {strategy === "DONCHIAN" ? (
        <div className="mt-4">
          <NumberField
            id="donchianPeriod"
            label="Channel period"
            min={2}
            value={params.donchianPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ donchianPeriod: value })}
          />
        </div>
      ) : null}

      {strategy === "STOCHASTIC" ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NumberField
            id="kPeriod"
            label="%K period"
            min={2}
            value={params.kPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ kPeriod: value })}
          />
          <NumberField
            id="stochOversold"
            label="Oversold (buy)"
            min={1}
            max={49}
            value={params.oversold}
            className={fieldClass}
            onChange={(value) => onParamsChange({ oversold: value })}
          />
          <NumberField
            id="stochOverbought"
            label="Overbought (sell)"
            min={51}
            max={99}
            value={params.overbought}
            className={fieldClass}
            onChange={(value) => onParamsChange({ overbought: value })}
          />
        </div>
      ) : null}

      {strategy === "MOMENTUM" ? (
        <div className="mt-4">
          <NumberField
            id="lookback"
            label="Lookback (days)"
            min={2}
            value={params.lookback}
            className={fieldClass}
            onChange={(value) => onParamsChange({ lookback: value })}
          />
        </div>
      ) : null}

      {strategy === "WILLIAMS_R" ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NumberField
            id="wrPeriod"
            label="%R period"
            min={2}
            value={params.wrPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ wrPeriod: value })}
          />
          <NumberField
            id="wrOversold"
            label="Oversold (buy)"
            min={-99}
            max={-51}
            value={params.oversold}
            className={fieldClass}
            onChange={(value) => onParamsChange({ oversold: value })}
          />
          <NumberField
            id="wrOverbought"
            label="Overbought (sell)"
            min={-49}
            max={-1}
            value={params.overbought}
            className={fieldClass}
            onChange={(value) => onParamsChange({ overbought: value })}
          />
        </div>
      ) : null}

      {strategy === "BUY_HOLD" ? (
        <p className="mt-4 text-xs text-slate-400">
          Invests 100% of cash on the first fill (T+1 open). Trade size is ignored.
        </p>
      ) : null}

      {paramsError ? <p className="mt-3 text-xs text-rose-400">{paramsError}</p> : null}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <NumberField
          id="capital"
          label="Starting capital"
          min={1}
          value={startingCapital}
          className={fieldClass}
          onChange={onStartingCapitalChange}
        />
        <NumberField
          id="tradePercent"
          label="Size per trade (%)"
          min={1}
          max={100}
          value={tradePercent}
          className={fieldClass}
          onChange={onTradePercentChange}
        />
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-300" htmlFor="sizingMode">
            Sizing
          </label>
          <select
            id="sizingMode"
            value={sizingMode}
            onChange={(event) => onSizingModeChange(event.target.value as SizingMode)}
            className={fieldClass}
          >
            <option value="fixed_from_start">Fixed slice of starting capital</option>
            <option value="percent_of_equity">Percent of current equity</option>
          </select>
        </div>
        <div className="col-span-2">
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
            <option value="CUSTOM">Custom dates</option>
          </select>
        </div>
        {timeframe === "CUSTOM" ? (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300" htmlFor="startDate">
                Start
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(event) => onStartDateChange(event.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300" htmlFor="endDate">
                End
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(event) => onEndDateChange(event.target.value)}
                className={fieldClass}
              />
            </div>
          </>
        ) : null}
      </div>

      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Costs (optional)</p>
      <div className="mt-2 grid grid-cols-3 gap-3">
        <NumberField
          id="commissionBps"
          label="Comm. bps"
          min={0}
          value={commissionBps}
          className={fieldClass}
          onChange={onCommissionBpsChange}
        />
        <NumberField
          id="commissionPerShare"
          label="$ / share"
          min={0}
          step={0.001}
          value={commissionPerShare}
          className={fieldClass}
          onChange={onCommissionPerShareChange}
        />
        <NumberField
          id="slippageBps"
          label="Slip bps"
          min={0}
          value={slippageBps}
          className={fieldClass}
          onChange={onSlippageBpsChange}
        />
      </div>

      <button
        type="submit"
        disabled={loading || !tickerValid || !paramsValid}
        className="mt-5 w-full rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        {loading ? "Running backtest…" : "Run backtest"}
      </button>
    </form>
  );
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  step,
  className,
  onChange,
}: {
  id: string;
  label: string;
  value: number | undefined;
  min?: number;
  max?: number;
  step?: number;
  className: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value ?? ""}
        onChange={(event) => onChange(Number(event.target.value))}
        className={className}
      />
    </div>
  );
}
