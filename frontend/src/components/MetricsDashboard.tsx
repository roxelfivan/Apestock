import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BacktestResult } from "../types";

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
          </div>
        </div>
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={equityCurve} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
                tickFormatter={(value: number) => formatMoney(value)}
                width={72}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: 12,
                  color: "#f8fafc",
                }}
                formatter={(value, name) => [formatMoney(toNumber(value)), String(name)]}
              />
              <Line
                type="monotone"
                dataKey="portfolioValue"
                name="Portfolio"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="benchmarkValue"
                name="Benchmark"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
