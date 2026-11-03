import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney, formatNumber } from "../lib/format";
import type { BacktestResult } from "../types";

interface PriceChartProps {
  result: BacktestResult;
}

export default function PriceChart({ result }: PriceChartProps) {
  const bars = result.bars ?? [];
  if (bars.length === 0) return null;
  const events = result.events ?? [];
  const data = bars.map((bar) => {
    const dayEvents = events.filter((event) => event.date === bar.date);
    return {
      date: bar.date,
      close: bar.close,
      shortMa: bar.indicators.shortMa,
      longMa: bar.indicators.longMa,
      rsi: bar.indicators.rsi,
      macd: bar.indicators.macd,
      signal: bar.indicators.signal,
      bbUpper: bar.indicators.bbUpper,
      bbLower: bar.indicators.bbLower,
      donchianHigh: bar.indicators.donchianHigh,
      donchianLow: bar.indicators.donchianLow,
      buyMark: dayEvents.some((event) => event.side === "BUY") ? bar.close : null,
      sellMark: dayEvents.some((event) => event.side === "SELL") ? bar.close : null,
    };
  });
  const hasRsi = data.some((row) => row.rsi != null);
  const hasMacd = data.some((row) => row.macd != null);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Price</p>
      <h3 className="text-sm font-semibold text-white">Close with indicators and fills</h3>
      <div className="mt-3 h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 9 }} minTickGap={40} tickLine={false} />
            <YAxis
              yAxisId="price"
              tick={{ fill: "#94a3b8", fontSize: 9 }}
              width={44}
              tickFormatter={(value) => formatNumber(Number(value), 0)}
            />
            <Tooltip
              content={({ active, label }) => {
                if (!active || label == null) return null;
                const point = data.find((row) => row.date === String(label));
                if (!point) return null;
                return (
                  <div className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-[10px] text-slate-100">
                    <p className="font-medium text-slate-300">{point.date}</p>
                    <p>Close {formatMoney(point.close, 2)}</p>
                    {point.buyMark != null ? <p className="text-emerald-400">Buy fill</p> : null}
                    {point.sellMark != null ? <p className="text-rose-400">Sell fill</p> : null}
                  </div>
                );
              }}
            />
            <Line yAxisId="price" type="monotone" dataKey="close" stroke="#e2e8f0" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line yAxisId="price" type="monotone" dataKey="shortMa" stroke="#34d399" strokeWidth={1} dot={false} isAnimationActive={false} />
            <Line yAxisId="price" type="monotone" dataKey="longMa" stroke="#60a5fa" strokeWidth={1} dot={false} isAnimationActive={false} />
            <Line yAxisId="price" type="monotone" dataKey="bbUpper" stroke="#a78bfa" strokeDasharray="3 3" strokeWidth={1} dot={false} isAnimationActive={false} />
            <Line yAxisId="price" type="monotone" dataKey="bbLower" stroke="#a78bfa" strokeDasharray="3 3" strokeWidth={1} dot={false} isAnimationActive={false} />
            <Line yAxisId="price" type="monotone" dataKey="donchianHigh" stroke="#fbbf24" strokeDasharray="4 4" strokeWidth={1} dot={false} isAnimationActive={false} />
            <Line yAxisId="price" type="monotone" dataKey="donchianLow" stroke="#fbbf24" strokeDasharray="4 4" strokeWidth={1} dot={false} isAnimationActive={false} />
            <Line
              yAxisId="price"
              dataKey="buyMark"
              stroke="none"
              dot={(props) =>
                props.value == null ? <g /> : <circle cx={props.cx} cy={props.cy} r={3} fill="#34d399" />
              }
              isAnimationActive={false}
            />
            <Line
              yAxisId="price"
              dataKey="sellMark"
              stroke="none"
              dot={(props) =>
                props.value == null ? <g /> : <circle cx={props.cx} cy={props.cy} r={3} fill="#f43f5e" />
              }
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {hasRsi || hasMacd ? (
        <div className="mt-3 h-[120px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 9 }} minTickGap={40} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} width={44} />
              <Line type="monotone" dataKey={hasRsi ? "rsi" : "macd"} stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              {hasMacd ? (
                <Line type="monotone" dataKey="signal" stroke="#94a3b8" strokeWidth={1} dot={false} isAnimationActive={false} />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}
