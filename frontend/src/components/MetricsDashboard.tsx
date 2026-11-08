import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { exportBacktestCsv } from "../lib/csv";
import { formatMoney, formatNumber, formatPct, toneFor } from "../lib/format";
import { STRATEGY_LABELS } from "../lib/defaults";
import type { BacktestResult, TradeEvent } from "../types";

const MIN_ZOOM_SPAN = 20;

function formatAxisPct(value: number): string {
  if (!Number.isFinite(value)) return "";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)}%`;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  return Number(value);
}

function paddedDomain(values: number[]): [number, number] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.15, 2);
  const lo = Math.floor(min - pad);
  const hi = Math.ceil(max + pad);
  return lo === hi ? [lo - 2, hi + 2] : [lo, hi];
}

function eventsOnDate(events: TradeEvent[], date: string): TradeEvent[] {
  return events.filter((event) => event.date === date);
}

function clampRange(start: number, end: number, length: number): { start: number; end: number } {
  const last = Math.max(0, length - 1);
  let nextStart = Math.min(last, Math.max(0, start));
  let nextEnd = Math.min(last, Math.max(0, end));
  if (nextEnd < nextStart) {
    const swap = nextStart;
    nextStart = nextEnd;
    nextEnd = swap;
  }
  if (nextEnd - nextStart + 1 < Math.min(MIN_ZOOM_SPAN, length)) {
    nextEnd = Math.min(last, nextStart + MIN_ZOOM_SPAN - 1);
    nextStart = Math.max(0, nextEnd - MIN_ZOOM_SPAN + 1);
  }
  return { start: Math.round(nextStart), end: Math.round(nextEnd) };
}

function zoomRange(
  start: number,
  end: number,
  length: number,
  factor: number,
  anchor: number,
): { start: number; end: number } {
  const span = Math.max(1, end - start + 1);
  const nextSpan = Math.max(Math.min(MIN_ZOOM_SPAN, length), Math.min(length, span * factor));
  const focus = start + anchor * (span - 1);
  const nextStart = focus - anchor * (nextSpan - 1);
  return clampRange(nextStart, nextStart + nextSpan - 1, length);
}

function touchDistance(a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }): number {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

function touchAnchor(
  a: { clientX: number },
  b: { clientX: number },
  rect: DOMRect,
): number {
  const mid = (a.clientX + b.clientX) / 2;
  return Math.min(1, Math.max(0, (mid - rect.left) / Math.max(rect.width, 1)));
}

interface MetricCardProps {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}

function MetricCard({ label, value, tone = "neutral" }: MetricCardProps) {
  const toneClass =
    tone === "positive" ? "text-emerald-400" : tone === "negative" ? "text-rose-400" : "text-white";
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-1.5 text-lg font-semibold break-words ${toneClass}`}>{value}</p>
    </div>
  );
}

function BuyMark({ cx, cy }: { cx?: number; cy?: number }) {
  if (cx == null || cy == null || !Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  return <polygon points={`${cx},${cy - 6} ${cx - 4},${cy + 1} ${cx + 4},${cy + 1}`} fill="#34d399" />;
}

function SellMark({ cx, cy }: { cx?: number; cy?: number }) {
  if (cx == null || cy == null || !Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  return <polygon points={`${cx},${cy + 6} ${cx - 4},${cy - 1} ${cx + 4},${cy - 1}`} fill="#f43f5e" />;
}

interface MetricsDashboardProps {
  result: BacktestResult | null;
  compare: BacktestResult | null;
  loading: boolean;
  stale: boolean;
}

export default function MetricsDashboard({ result, compare, loading, stale }: MetricsDashboardProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef({ start: 0, end: 0 });
  const pinchRef = useRef<{ distance: number; start: number; end: number } | null>(null);
  const lastTapRef = useRef(0);
  const [range, setRange] = useState({ start: 0, end: 0 });

  const chartData = useMemo(() => {
    if (!result) return [];
    const events = result.events ?? [];
    const basePortfolio = result.equityCurve[0]?.portfolioValue || 1;
    const baseBenchmark = result.equityCurve[0]?.benchmarkValue || 1;
    const compareByDate = new Map(
      (compare?.equityCurve ?? []).map((point) => [point.date, point.portfolioValue]),
    );
    const compareBase = compare?.equityCurve[0]?.portfolioValue || 1;

    return result.equityCurve.map((point) => {
      const dayEvents = eventsOnDate(events, point.date);
      const portfolioPct = ((point.portfolioValue / basePortfolio) - 1) * 100;
      const hasBuy = dayEvents.some((event) => event.side === "BUY");
      const hasSell = dayEvents.some((event) => event.side === "SELL");
      const compareValue = compareByDate.get(point.date);
      return {
        date: point.date,
        portfolioValue: point.portfolioValue,
        benchmarkValue: point.benchmarkValue,
        portfolioPct,
        benchmarkPct: ((point.benchmarkValue / baseBenchmark) - 1) * 100,
        comparePct: compareValue == null ? null : ((compareValue / compareBase) - 1) * 100,
        hasBuy,
        hasSell,
        buyMark: hasBuy ? portfolioPct : null,
        sellMark: hasSell ? portfolioPct : null,
      };
    });
  }, [compare, result]);

  useEffect(() => {
    const next = { start: 0, end: Math.max(0, chartData.length - 1) };
    rangeRef.current = next;
    setRange(next);
  }, [chartData]);

  useEffect(() => {
    rangeRef.current = range;
  }, [range]);

  const visible = useMemo(() => {
    if (chartData.length === 0) return [];
    return chartData.slice(range.start, range.end + 1);
  }, [chartData, range]);

  const strategyDomain = useMemo(
    () => paddedDomain(visible.map((point) => point.portfolioPct)),
    [visible],
  );
  const benchmarkDomain = useMemo(
    () => paddedDomain(visible.map((point) => point.benchmarkPct)),
    [visible],
  );

  const isZoomed = range.start > 0 || range.end < Math.max(0, chartData.length - 1);

  function applyZoom(factor: number, anchor: number) {
    if (chartData.length === 0) return;
    const current = rangeRef.current;
    const next = zoomRange(current.start, current.end, chartData.length, factor, anchor);
    rangeRef.current = next;
    setRange(next);
  }

  function resetZoom() {
    const next = { start: 0, end: Math.max(0, chartData.length - 1) };
    rangeRef.current = next;
    setRange(next);
  }

  useEffect(() => {
    const node = chartRef.current;
    if (!node) return;

    const onWheel = (event: WheelEvent) => {
      if (chartData.length === 0) return;
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const anchor = Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(rect.width, 1)));
      applyZoom(event.deltaY > 0 ? 1.18 : 0.82, anchor);
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [chartData.length]);

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length === 2) {
      pinchRef.current = {
        distance: touchDistance(event.touches[0], event.touches[1]),
        start: rangeRef.current.start,
        end: rangeRef.current.end,
      };
      return;
    }
    if (event.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        resetZoom();
      }
      lastTapRef.current = now;
    }
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 2 || !pinchRef.current || !chartRef.current) return;
    event.preventDefault();
    const currentDistance = touchDistance(event.touches[0], event.touches[1]);
    if (pinchRef.current.distance < 8) return;
    const factor = pinchRef.current.distance / currentDistance;
    const rect = chartRef.current.getBoundingClientRect();
    const next = zoomRange(
      pinchRef.current.start,
      pinchRef.current.end,
      chartData.length,
      factor,
      touchAnchor(event.touches[0], event.touches[1], rect),
    );
    rangeRef.current = next;
    setRange(next);
  }

  function handleTouchEnd() {
    pinchRef.current = null;
  }

  if (!result) {
    return (
      <section className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
        <div>
          <p className="text-sm font-medium text-slate-300">{loading ? "Running backtest…" : "No backtest yet"}</p>
          <p className="mt-1 text-sm text-slate-500">
            {loading
              ? "Fetching Yahoo daily bars and simulating fills."
              : "Choose a ticker, set a rule, then run a daily EOD simulation."}
          </p>
        </div>
      </section>
    );
  }

  const { totalReturn, maxDrawdown, winRate, totalTrades, metrics } = result;

  return (
    <section className={`min-w-0 space-y-4 ${loading || stale ? "opacity-60" : ""}`}>
      {stale || loading ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {loading ? "Updating… previous result stays visible until the new run finishes." : "Inputs changed. This result is stale until you run again."}
        </div>
      ) : null}
      {result.ticker ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Last run</p>
            <p className="text-sm break-words text-white">
              {result.ticker} · {result.strategy ? STRATEGY_LABELS[result.strategy] : "strategy"} · {result.timeframe} ·{" "}
              {result.testStartDate ?? result.startDate} → {result.endDate}
            </p>
            <p className="text-[11px] text-slate-500">{result.fillModel}</p>
            {result.missingSessions ? (
              <p className="text-[11px] text-amber-300">{result.missingSessions} missing sessions in the window</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => exportBacktestCsv(result)}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200"
          >
            Export CSV
          </button>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="Total return"
          value={formatPct(totalReturn)}
          tone={toneFor(totalReturn)}
        />
        <MetricCard
          label="Max drawdown"
          value={formatPct(maxDrawdown)}
          tone={maxDrawdown < 0 ? "negative" : "neutral"}
        />
        <MetricCard
          label="Win rate"
          value={formatPct(winRate)}
          tone={winRate >= 50 ? "positive" : "negative"}
        />
        <MetricCard label="Total trades" value={String(totalTrades)} />
        {metrics ? (
          <>
            <MetricCard label="CAGR" value={formatPct(metrics.cagr)} tone={toneFor(metrics.cagr)} />
            <MetricCard label="Sharpe" value={formatNumber(metrics.sharpe, 2)} tone={toneFor(metrics.sharpe)} />
            <MetricCard label="Sortino" value={formatNumber(metrics.sortino, 2)} tone={toneFor(metrics.sortino)} />
            <MetricCard label="Calmar" value={formatNumber(metrics.calmar, 2)} tone={toneFor(metrics.calmar)} />
            <MetricCard label="Excess vs B&H" value={formatPct(metrics.excessReturn)} tone={toneFor(metrics.excessReturn)} />
            <MetricCard label="Alpha / beta" value={`${formatPct(metrics.alpha)} / ${formatNumber(metrics.beta, 2)}`} />
            <MetricCard label="Profit factor" value={formatNumber(metrics.profitFactor, 2)} />
            <MetricCard label="Time in market" value={formatPct(metrics.timeInMarket, 1)} />
            <MetricCard label="Signal win rate" value={formatPct(metrics.winRateSignal)} />
            <MetricCard label="Avg hold" value={`${formatNumber(metrics.avgHoldDays, 1)}d`} />
            <MetricCard label="Vol" value={formatPct(metrics.volatility)} />
            <MetricCard label="Max loss streak" value={String(metrics.maxConsecutiveLosses)} />
          </>
        ) : null}
      </div>

      <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Equity</p>
            <h3 className="text-sm font-semibold text-white">Strategy vs buy & hold</h3>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded bg-blue-500" /> Portfolio
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-px w-4 border-t border-dashed border-slate-400" /> Benchmark
            </span>
            {compare ? (
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded bg-violet-400" /> Compare
              </span>
            ) : null}
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0 w-0 border-x-[3.5px] border-x-transparent border-b-[6px] border-b-emerald-400" /> Buy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0 w-0 border-x-[3.5px] border-x-transparent border-t-[6px] border-t-rose-500" /> Sell
            </span>
            {isZoomed ? (
              <button
                type="button"
                onClick={resetZoom}
                className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300"
              >
                Reset zoom
              </button>
            ) : (
              <span>Scroll or pinch to zoom</span>
            )}
          </div>
        </div>
        <div
          ref={chartRef}
          className="relative h-[360px] w-full min-w-0 overflow-hidden touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div className="absolute inset-0 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={visible} margin={{ top: 12, right: 12, left: 4, bottom: 8 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#94a3b8", fontSize: 9 }}
                minTickGap={40}
                axisLine={{ stroke: "#334155" }}
                tickLine={false}
              />
              <YAxis
                yAxisId="strategy"
                orientation="left"
                tick={{ fill: "#93c5fd", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatAxisPct}
                width={40}
                domain={strategyDomain}
                allowDataOverflow
              />
              <YAxis
                yAxisId="benchmark"
                orientation="right"
                tick={{ fill: "#94a3b8", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatAxisPct}
                width={40}
                domain={benchmarkDomain}
                allowDataOverflow
              />
              <Tooltip
                trigger="hover"
                shared
                isAnimationActive={false}
                cursor={{ stroke: "#64748b", strokeWidth: 1 }}
                content={({ active, label }) => {
                  if (!active || label == null) return null;
                  const point = visible.find((row) => row.date === String(label));
                  if (!point) return null;
                  return (
                    <div className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-[10px] leading-4 text-slate-100 shadow-lg">
                      <p className="mb-0.5 font-medium text-slate-300">{point.date}</p>
                      <p>
                        Portfolio {formatPct(toNumber(point.portfolioPct))} ({formatMoney(toNumber(point.portfolioValue))})
                      </p>
                      <p>
                        Benchmark {formatPct(toNumber(point.benchmarkPct))} ({formatMoney(toNumber(point.benchmarkValue))})
                      </p>
                      {point.comparePct != null ? <p>Compare {formatPct(toNumber(point.comparePct))}</p> : null}
                      {point.hasBuy ? <p className="text-emerald-400">Buy fill</p> : null}
                      {point.hasSell ? <p className="text-rose-400">Sell fill</p> : null}
                    </div>
                  );
                }}
              />
              <Line
                yAxisId="strategy"
                type="monotone"
                dataKey="portfolioPct"
                name="Portfolio"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#3b82f6", stroke: "#0f172a", strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <Line
                yAxisId="benchmark"
                type="monotone"
                dataKey="benchmarkPct"
                name="Benchmark"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
              {compare ? (
                <Line
                  yAxisId="strategy"
                  type="monotone"
                  dataKey="comparePct"
                  name="Compare"
                  stroke="#a78bfa"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              ) : null}
              <Line
                yAxisId="strategy"
                dataKey="buyMark"
                name="Buy"
                stroke="none"
                legendType="none"
                tooltipType="none"
                dot={(props) => (props.value == null ? <g /> : <BuyMark cx={props.cx} cy={props.cy} />)}
                activeDot={false}
                isAnimationActive={false}
              />
              <Line
                yAxisId="strategy"
                dataKey="sellMark"
                name="Sell"
                stroke="none"
                legendType="none"
                tooltipType="none"
                dot={(props) => (props.value == null ? <g /> : <SellMark cx={props.cx} cy={props.cy} />)}
                activeDot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
