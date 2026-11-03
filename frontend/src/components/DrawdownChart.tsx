import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPct } from "../lib/format";
import type { BacktestResult } from "../types";

export default function DrawdownChart({ result }: { result: BacktestResult }) {
  const data = result.drawdownCurve ?? [];
  if (data.length === 0) return null;
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Risk</p>
      <h3 className="text-sm font-semibold text-white">Underwater drawdown</h3>
      <div className="mt-3 h-[160px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 9 }} minTickGap={40} tickLine={false} />
            <YAxis tick={{ fill: "#fda4af", fontSize: 9 }} width={40} tickFormatter={(value) => `${value}%`} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const point = payload[0].payload as { date: string; drawdown: number };
                return (
                  <div className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-[10px]">
                    {point.date}: {formatPct(point.drawdown)}
                  </div>
                );
              }}
            />
            <Area type="monotone" dataKey="drawdown" stroke="#f43f5e" fill="#881337" fillOpacity={0.35} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
