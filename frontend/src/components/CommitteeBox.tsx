import { useMemo, useState } from "react";
import { formatNumber, formatPct, toneFor } from "../lib/format";
import type { CommitteeMember, CommitteeResult, CommitteeVote, StrategyName, StrategyParams } from "../types";

const VOTE_LABEL: Record<CommitteeVote, string> = {
  BUY: "Buy",
  SELL: "Sell",
  HOLD: "Hold",
};

function voteClass(vote: CommitteeVote, ready = true): string {
  if (!ready) return "border-slate-700 bg-slate-800 text-slate-400";
  if (vote === "BUY") return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  if (vote === "SELL") return "border-rose-500/40 bg-rose-500/15 text-rose-300";
  return "border-slate-600 bg-slate-800 text-slate-300";
}

function lastValueSummary(member: CommitteeMember): string {
  const entries = Object.entries(member.lastValues).filter(([, value]) => value != null);
  if (entries.length === 0) return "No reading";
  return entries
    .slice(0, 3)
    .map(([name, value]) => `${name} ${formatNumber(value as number, 2)}`)
    .join(" · ");
}

function voteOrder(vote: CommitteeVote): number {
  if (vote === "BUY") return 0;
  if (vote === "SELL") return 1;
  return 2;
}

type SortKey = "vote" | "return" | "sharpe" | "trades";

const SORT_LABELS: Record<SortKey, string> = {
  vote: "Vote",
  return: "Return",
  sharpe: "Sharpe",
  trades: "Trades",
};

interface CommitteeBoxProps {
  committee: CommitteeResult;
  onSelect?: (strategy: StrategyName, params: StrategyParams) => void;
  busy?: boolean;
}

export default function CommitteeBox({ committee, onSelect, busy = false }: CommitteeBoxProps) {
  const [sort, setSort] = useState<SortKey>("vote");

  const members = useMemo(() => {
    const sorted = [...committee.members].sort((a, b) => {
      if (sort === "return") return b.totalReturn - a.totalReturn;
      if (sort === "sharpe") return b.sharpe - a.sharpe;
      if (sort === "trades") return b.totalTrades - a.totalTrades;
      const ready = Number(b.ready) - Number(a.ready);
      if (ready !== 0) return ready;
      const vote = voteOrder(a.vote) - voteOrder(b.vote);
      if (vote !== 0) return vote;
      return b.sharpe - a.sharpe;
    });
    return sorted;
  }, [committee.members, sort]);

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Committee</p>
          <h3 className="text-sm font-semibold text-white">Indicator votes</h3>
          <p className="mt-1 max-w-2xl text-[11px] text-slate-500">
            Each vote is the indicator’s current zone: buy or sell only at an extreme or established trend, hold in
            the middle. That is not a fill. Last buy/sell is the last crossover used by the backtest.{" "}
            {committee.asOf ? `As of ${committee.asOf}.` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 p-0.5"
            role="group"
            aria-label="Sort indicator cards"
          >
            <span className="px-1.5 text-[10px] uppercase tracking-[0.14em] text-slate-500">Sort</span>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                aria-pressed={sort === key}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  sort === key
                    ? "bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/40"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {SORT_LABELS[key]}
              </button>
            ))}
          </div>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${voteClass(committee.majority)}`}>
            Majority {VOTE_LABEL[committee.majority]}
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-xs ${voteClass(committee.weighted)}`}>
            Sharpe-weighted {VOTE_LABEL[committee.weighted]}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-400/80">Buy</p>
          <p className="text-lg font-semibold text-emerald-300">{committee.buyVotes}</p>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-rose-400/80">Sell</p>
          <p className="text-lg font-semibold text-rose-300">{committee.sellVotes}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Hold</p>
          <p className="text-lg font-semibold text-slate-200">{committee.holdVotes}</p>
        </div>
      </div>

      <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {members.map((member, index) => (
          <article
            key={member.strategy}
            className={`group relative min-w-0 rounded-xl border p-3 transition-colors ${
              member.selected
                ? "border-emerald-400/50 bg-slate-950/80 ring-1 ring-emerald-400/30"
                : "border-slate-800 bg-slate-950/40 hover:border-slate-600 hover:bg-slate-950/70"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => onSelect?.(member.strategy, member.params)}
                  disabled={!onSelect || busy}
                  aria-pressed={member.selected}
                  title={`Show every chart for ${member.label}`}
                  className="block max-w-full truncate text-left text-sm font-medium text-white outline-none after:absolute after:inset-0 after:content-[''] hover:text-emerald-300 focus-visible:rounded focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-default disabled:hover:text-white"
                >
                  <span className="mr-1.5 text-[10px] font-normal tabular-nums text-slate-600">
                    {index + 1}
                  </span>
                  {member.label}
                  {member.selected ? (
                    <span className="ml-2 text-[10px] font-normal text-emerald-400">this run</span>
                  ) : null}
                </button>
                <p className="mt-0.5 truncate text-[10px] text-slate-500">{lastValueSummary(member)}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${voteClass(member.vote, member.ready)}`}>
                {member.ready ? VOTE_LABEL[member.vote] : "Cold"}
              </span>
            </div>
            <p className="mt-2 text-[10px] text-slate-500">
              {member.voteReason ?? "No zone reading"}
              {member.lastAction && member.lastActionDate
                ? ` · last ${VOTE_LABEL[member.lastAction].toLowerCase()} event ${member.lastActionDate}`
                : " · no crossover yet"}
              {member.latestSignal !== "HOLD" ? ` · new ${VOTE_LABEL[member.latestSignal].toLowerCase()} event today` : null}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-300">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Return</dt>
                <dd className={toneFor(member.totalReturn) === "positive" ? "text-emerald-400" : toneFor(member.totalReturn) === "negative" ? "text-rose-400" : ""}>
                  {formatPct(member.totalReturn)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Sharpe</dt>
                <dd>{formatNumber(member.sharpe, 2)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Win rate</dt>
                <dd>{formatPct(member.winRate)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Trades</dt>
                <dd>{member.totalTrades}</dd>
              </div>
            </dl>
            <p className="mt-2 text-[10px] text-slate-600 transition-colors group-hover:text-slate-400">
              {member.selected ? "Every chart below uses this strategy" : "Click to load this strategy"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
