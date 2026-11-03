import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BacktestResult, TradeEvent } from "../types";

function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatAxisPct(value: number): string {
  if (!Number.isFinite(value)) return "";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)}%`;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  return Number(value);
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function BuyMark({ cx, cy }: { cx?: number; cy?: number }) {
  if (cx == null || cy == null || !Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  return <polygon points={`${cx},${cy - 5} ${cx - 3.5},${cy + 1} ${cx + 3.5},${cy + 1}`} fill="#34d399" />;
}

function SellMark({ cx, cy }: { cx?: number; cy?: number }) {
  if (cx == null || cy == null || !Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  return <polygon points={`${cx},${cy + 5} ${cx - 3.5},${cy - 1} ${cx + 3.5},${cy - 1}`} fill="#f43f5e" />;
}

function eventsOnDate(events: TradeEvent[], date: string): TradeEvent[] {
  return events.filter((event) => event.date === date);
}

interface MetricsDashboardProps {
  result: BacktestResult | null;
}

export default function MetricsDashboard({ result }: MetricsDashboardProps) {
  if (!result) {
    return (
      <section className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
        <div>
          <p className="text-sm font-medium text-slate-300">No backtest yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Choose a top-50 S&P, Nasdaq, or US ETF name, or a crypto pair, then run a daily EOD simulation.
          </p>
        </div>
      </section>
    );
  }

  const { totalReturn, maxDrawdown, winRate, totalTrades, equityCurve } = result;
  const events = result.events ?? [];
  const basePortfolio = equityCurve[0]?.portfolioValue || 1;
  const baseBenchmark = equityCurve[0]?.benchmarkValue || 1;

  const chartData = equityCurve.map((point) => {
    const dayEvents = eventsOnDate(events, point.date);
    const portfolioPct = ((point.portfolioValue / basePortfolio) - 1) * 100;
    const benchmarkPct = ((point.benchmarkValue / baseBenchmark) - 1) * 100;
    return {
      date: point.date,
      portfolioValue: point.portfolioValue,
      benchmarkValue: point.benchmarkValue,
      portfolioPct,
      benchmarkPct,
      hasBuy: dayEvents.some((event) => event.side === "BUY"),
      hasSell: dayEvents.some((event) => event.side === "SELL"),
    };
  });

  const markY = Math.min(...chartData.flatMap((point) => [point.portfolioPct, point.benchmarkPct]));
  const buyDots = chartData.filter((point) => point.hasBuy).map((point) => ({ date: point.date, mark: markY }));
  const sellDots = chartData.filter((point) => point.hasSell).map((point) => ({ date: point.date, mark: markY }));

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="Total return"
          value={formatPct(totalReturn)}
          tone={totalReturn >= 0 ? "positive" : "negative"}
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
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Equity</p>
            <h3 className="text-base font-semibold text-white">Strategy vs buy & hold</h3>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded bg-blue-500" /> Portfolio
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-px w-4 border-t border-dashed border-slate-400" /> Benchmark
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0 w-0 border-x-[3.5px] border-x-transparent border-b-[6px] border-b-emerald-400" /> Buy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0 w-0 border-x-[3.5px] border-x-transparent border-t-[6px] border-t-rose-500" /> Sell
            </span>
          </div>
        </div>
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 12, right: 8, left: 4, bottom: 8 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                minTickGap={40}
                axisLine={{ stroke: "#334155" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatAxisPct}
                width={48}
                domain={["auto", "auto"]}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0]?.payload as (typeof chartData)[number];
                  return (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100">
                      <p className="mb-1 font-medium text-slate-300">{String(label)}</p>
                      <p>
                        Portfolio {formatPct(toNumber(point.portfolioPct))} ({formatMoney(toNumber(point.portfolioValue))})
                      </p>
                      <p>
                        Benchmark {formatPct(toNumber(point.benchmarkPct))} ({formatMoney(toNumber(point.benchmarkValue))})
                      </p>
                      {point.hasBuy ? <p className="text-emerald-400">Buy fill</p> : null}
                      {point.hasSell ? <p className="text-rose-400">Sell fill</p> : null}
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="portfolioPct"
                name="Portfolio"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="benchmarkPct"
                name="Benchmark"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                isAnimationActive={false}
              />
              <Scatter
                data={buyDots}
                dataKey="mark"
                name="Buy"
                fill="#34d399"
                shape={<BuyMark />}
                isAnimationActive={false}
                legendType="none"
              />
              <Scatter
                data={sellDots}
                dataKey="mark"
                name="Sell"
                fill="#f43f5e"
                shape={<SellMark />}
                isAnimationActive={false}
                legendType="none"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
