import { formatNumber, formatPct, toneFor } from "../lib/format";
import type { CommitteeMember, CommitteeResult, CommitteeVote } from "../types";

const VOTE_LABEL: Record<CommitteeVote, string> = {
  BUY: "Buy",
  SELL: "Sell",
  HOLD: "Keep",
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

interface CommitteeBoxProps {
  committee: CommitteeResult;
}

export default function CommitteeBox({ committee }: CommitteeBoxProps) {
  const members = [...committee.members].sort((a, b) => {
    const ready = Number(b.ready) - Number(a.ready);
    if (ready !== 0) return ready;
    const vote = voteOrder(a.vote) - voteOrder(b.vote);
    if (vote !== 0) return vote;
    return b.sharpe - a.sharpe;
  });

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Committee</p>
          <h3 className="text-sm font-semibold text-white">Indicator votes</h3>
          <p className="mt-1 max-w-xl text-[11px] text-slate-500">
            Each rule is a member. The vote is its last buy or sell (keep if it has not flipped). Returns use this
            window, costs, and sizing. {committee.asOf ? `As of ${committee.asOf}.` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">Keep</p>
          <p className="text-lg font-semibold text-slate-200">{committee.holdVotes}</p>
        </div>
      </div>

      <div className="mt-4 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
        {members.map((member) => (
          <article
            key={member.strategy}
            className={`min-w-0 rounded-xl border p-3 ${
              member.selected ? "border-emerald-400/40 bg-slate-950/80" : "border-slate-800 bg-slate-950/40"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {member.label}
                  {member.selected ? <span className="ml-2 text-[10px] font-normal text-emerald-400">this run</span> : null}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-slate-500">{lastValueSummary(member)}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${voteClass(member.vote, member.ready)}`}>
                {member.ready ? VOTE_LABEL[member.vote] : "Cold"}
              </span>
            </div>
            <p className="mt-2 text-[10px] text-slate-500">
              {member.lastAction && member.lastActionDate
                ? `Last ${VOTE_LABEL[member.lastAction].toLowerCase()} on ${member.lastActionDate}`
                : "No buy/sell yet in this history"}
              {member.latestSignal === "HOLD" && member.vote !== "HOLD" ? " · today keep" : null}
              {member.latestSignal !== "HOLD" ? ` · today ${VOTE_LABEL[member.latestSignal].toLowerCase()}` : null}
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
          </article>
        ))}
      </div>
    </section>
  );
}
