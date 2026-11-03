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

function BuyMark({ cx = 0, cy = 0 }: { cx?: number; cy?: number }) {
  return <polygon points={`${cx},${cy - 5} ${cx - 3.5},${cy + 1} ${cx + 3.5},${cy + 1}`} fill="#34d399" />;
}

function SellMark({ cx = 0, cy = 0 }: { cx?: number; cy?: number }) {
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
  const chartData = equityCurve.map((point) => {
    const dayEvents = eventsOnDate(events, point.date);
    return {
      ...point,
      buyMark: dayEvents.some((event) => event.side === "BUY") ? 0 : null,
      sellMark: dayEvents.some((event) => event.side === "SELL") ? 0 : null,
    };
  });

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
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Equity</p>
            <h3 className="text-base font-semibold text-white">Strategy vs buy & hold</h3>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
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
            <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 10 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                minTickGap={40}
                axisLine={{ stroke: "#334155" }}
                tickLine={false}
              />
              <YAxis
                yAxisId="value"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) => formatMoney(value)}
                width={72}
              />
              <YAxis yAxisId="events" hide domain={[-0.08, 1]} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0]?.payload as {
                    portfolioValue: number;
                    benchmarkValue: number;
                    buyMark: number | null;
                    sellMark: number | null;
                  };
                  return (
                    <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100">
                      <p className="mb-1 font-medium text-slate-300">{String(label)}</p>
                      <p>Portfolio {formatMoney(toNumber(point.portfolioValue))}</p>
                      <p>Benchmark {formatMoney(toNumber(point.benchmarkValue))}</p>
                      {point.buyMark != null ? <p className="text-emerald-400">Buy fill</p> : null}
                      {point.sellMark != null ? <p className="text-rose-400">Sell fill</p> : null}
                    </div>
                  );
                }}
              />
              <Line
                yAxisId="value"
                type="monotone"
                dataKey="portfolioValue"
                name="Portfolio"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="value"
                type="monotone"
                dataKey="benchmarkValue"
                name="Benchmark"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
              <Scatter yAxisId="events" dataKey="buyMark" name="Buy" fill="#34d399" shape={<BuyMark />} />
              <Scatter yAxisId="events" dataKey="sellMark" name="Sell" fill="#f43f5e" shape={<SellMark />} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
