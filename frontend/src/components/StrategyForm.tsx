import type { FormEvent } from "react";
import { STRATEGY_GROUPS, STRATEGY_LABELS } from "../lib/defaults";
import { btnPrimary, fieldClass } from "../ui";
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
  const hasCosts = commissionBps > 0 || commissionPerShare > 0 || slippageBps > 0;

  return (
    <form
      id="backtest-form"
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl shadow-black/20 sm:p-5"
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
        {STRATEGY_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.strategies.map((name) => (
              <option key={name} value={name}>
                {STRATEGY_LABELS[name]}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {strategy === "MA_CROSSOVER" || strategy === "EMA_CROSSOVER" || strategy === "WMA_CROSSOVER" ? (
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
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
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

      {strategy === "HMA" ? (
        <div className="mt-4">
          <NumberField
            id="hmaPeriod"
            label="Hull period"
            min={2}
            value={params.hmaPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ hmaPeriod: value })}
          />
        </div>
      ) : null}

      {strategy === "STOCH_RSI" ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NumberField
            id="stochRsiPeriod"
            label="RSI period"
            min={2}
            value={params.stochRsiPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ stochRsiPeriod: value })}
          />
          <NumberField
            id="stochRsiOversold"
            label="Oversold (buy)"
            min={1}
            max={49}
            value={params.oversold}
            className={fieldClass}
            onChange={(value) => onParamsChange({ oversold: value })}
          />
          <NumberField
            id="stochRsiOverbought"
            label="Overbought (sell)"
            min={51}
            max={99}
            value={params.overbought}
            className={fieldClass}
            onChange={(value) => onParamsChange({ overbought: value })}
          />
        </div>
      ) : null}

      {strategy === "PPO" ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NumberField
            id="ppoFast"
            label="Fast"
            min={2}
            value={params.fastPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ fastPeriod: value })}
          />
          <NumberField
            id="ppoSlow"
            label="Slow"
            min={3}
            value={params.slowPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ slowPeriod: value })}
          />
          <NumberField
            id="ppoSignal"
            label="Signal"
            min={1}
            value={params.signalPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ signalPeriod: value })}
          />
        </div>
      ) : null}

      {strategy === "TRIX" ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <NumberField
            id="trixPeriod"
            label="TRIX period"
            min={2}
            value={params.trixPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ trixPeriod: value })}
          />
          <NumberField
            id="trixSignalPeriod"
            label="Signal"
            min={1}
            value={params.trixSignalPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ trixSignalPeriod: value })}
          />
        </div>
      ) : null}

      {strategy === "CCI" ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NumberField
            id="cciPeriod"
            label="CCI period"
            min={2}
            value={params.cciPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ cciPeriod: value })}
          />
          <NumberField
            id="cciOversold"
            label="Oversold (buy)"
            value={params.oversold}
            className={fieldClass}
            onChange={(value) => onParamsChange({ oversold: value })}
          />
          <NumberField
            id="cciOverbought"
            label="Overbought (sell)"
            value={params.overbought}
            className={fieldClass}
            onChange={(value) => onParamsChange({ overbought: value })}
          />
        </div>
      ) : null}

      {strategy === "ULTIMATE" ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumberField
            id="uoShort"
            label="Short"
            min={2}
            value={params.uoShort}
            className={fieldClass}
            onChange={(value) => onParamsChange({ uoShort: value })}
          />
          <NumberField
            id="uoMid"
            label="Mid"
            min={3}
            value={params.uoMid}
            className={fieldClass}
            onChange={(value) => onParamsChange({ uoMid: value })}
          />
          <NumberField
            id="uoLong"
            label="Long"
            min={4}
            value={params.uoLong}
            className={fieldClass}
            onChange={(value) => onParamsChange({ uoLong: value })}
          />
          <NumberField
            id="uoOversold"
            label="Oversold (buy)"
            min={1}
            max={49}
            value={params.oversold}
            className={fieldClass}
            onChange={(value) => onParamsChange({ oversold: value })}
          />
          <NumberField
            id="uoOverbought"
            label="Overbought (sell)"
            min={51}
            max={99}
            value={params.overbought}
            className={fieldClass}
            onChange={(value) => onParamsChange({ overbought: value })}
          />
        </div>
      ) : null}

      {strategy === "AWESOME" ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <NumberField
            id="aoFast"
            label="Fast SMA"
            min={2}
            value={params.aoFast}
            className={fieldClass}
            onChange={(value) => onParamsChange({ aoFast: value })}
          />
          <NumberField
            id="aoSlow"
            label="Slow SMA"
            min={3}
            value={params.aoSlow}
            className={fieldClass}
            onChange={(value) => onParamsChange({ aoSlow: value })}
          />
        </div>
      ) : null}

      {strategy === "ROC" ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <NumberField
            id="rocPeriod"
            label="ROC period"
            min={2}
            value={params.rocPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ rocPeriod: value })}
          />
          <NumberField
            id="rocSignalPeriod"
            label="Signal SMA"
            min={1}
            value={params.rocSignalPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ rocSignalPeriod: value })}
          />
        </div>
      ) : null}

      {strategy === "ADX" ? (
        <div className="mt-4">
          <NumberField
            id="adxPeriod"
            label="ADX period"
            min={2}
            value={params.adxPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ adxPeriod: value })}
          />
        </div>
      ) : null}

      {strategy === "AROON" ? (
        <div className="mt-4">
          <NumberField
            id="aroonPeriod"
            label="Aroon period"
            min={2}
            value={params.aroonPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ aroonPeriod: value })}
          />
        </div>
      ) : null}

      {strategy === "SUPERTREND" ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <NumberField
            id="stAtrPeriod"
            label="ATR period"
            min={2}
            value={params.atrPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ atrPeriod: value })}
          />
          <NumberField
            id="stAtrMultiplier"
            label="ATR multiplier"
            min={0.1}
            step={0.1}
            value={params.atrMultiplier}
            className={fieldClass}
            onChange={(value) => onParamsChange({ atrMultiplier: value })}
          />
        </div>
      ) : null}

      {strategy === "PSAR" ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <NumberField
            id="psarStep"
            label="AF step"
            min={0.001}
            step={0.01}
            value={params.psarStep}
            className={fieldClass}
            onChange={(value) => onParamsChange({ psarStep: value })}
          />
          <NumberField
            id="psarMax"
            label="AF max"
            min={0.01}
            step={0.01}
            value={params.psarMax}
            className={fieldClass}
            onChange={(value) => onParamsChange({ psarMax: value })}
          />
        </div>
      ) : null}

      {strategy === "ICHIMOKU" ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <NumberField
            id="tenkanPeriod"
            label="Tenkan"
            min={2}
            value={params.tenkanPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ tenkanPeriod: value })}
          />
          <NumberField
            id="kijunPeriod"
            label="Kijun"
            min={3}
            value={params.kijunPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ kijunPeriod: value })}
          />
        </div>
      ) : null}

      {strategy === "KELTNER" ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NumberField
            id="keltnerPeriod"
            label="EMA period"
            min={2}
            value={params.keltnerPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ keltnerPeriod: value })}
          />
          <NumberField
            id="keltnerAtrPeriod"
            label="ATR period"
            min={2}
            value={params.atrPeriod}
            className={fieldClass}
            onChange={(value) => onParamsChange({ atrPeriod: value })}
          />
          <NumberField
            id="keltnerAtrMultiplier"
            label="ATR multiplier"
            min={0.1}
            step={0.1}
            value={params.atrMultiplier}
            className={fieldClass}
            onChange={(value) => onParamsChange({ atrMultiplier: value })}
          />
        </div>
      ) : null}

      {strategy === "BUY_HOLD" ? (
        <p className="mt-4 text-xs text-slate-400">
          Invests 100% of cash on the first fill (T+1 open). Trade size is ignored.
        </p>
      ) : null}

      {paramsError ? <p className="mt-3 text-xs text-rose-400">{paramsError}</p> : null}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        <div className="sm:col-span-2">
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
        <div className="sm:col-span-2">
          <p className="block text-sm font-medium text-slate-300" id="timeframe-label">
            Timeframe
          </p>
          <div
            role="group"
            aria-labelledby="timeframe-label"
            className="mt-1 grid grid-cols-4 gap-2"
          >
            {(["1Y", "3Y", "5Y", "CUSTOM"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onTimeframeChange(option)}
                aria-pressed={timeframe === option}
                className={`min-h-11 rounded-xl px-2 text-sm font-semibold transition duration-200 ${
                  timeframe === option
                    ? "bg-slate-100 text-slate-950 shadow"
                    : "border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
                }`}
              >
                {option === "CUSTOM" ? "Custom" : option}
              </button>
            ))}
          </div>
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

      <details className="mt-5 rounded-xl border border-slate-800 bg-slate-950/40 p-3" open={hasCosts || undefined}>
        <summary className="min-h-11 cursor-pointer list-none text-sm font-medium text-slate-200 marker:content-none [&::-webkit-details-marker]:hidden">
          Optional costs
          <span className="ml-2 text-xs font-normal text-slate-500">commission and slippage</span>
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NumberField
            id="commissionBps"
            label="Commission (bps)"
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
            label="Slippage (bps)"
            min={0}
            value={slippageBps}
            className={fieldClass}
            onChange={onSlippageBpsChange}
          />
        </div>
      </details>

      <button
        type="submit"
        disabled={loading || !tickerValid || !paramsValid}
        className={`${btnPrimary} mt-5 max-lg:hidden`}
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
        inputMode="decimal"
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
