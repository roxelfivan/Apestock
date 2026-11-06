import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { AssetType, UniverseSnapshot } from "../types";
import { isValidTicker, universeFor, universeGroups } from "../data/universes";

interface AssetSelectorProps {
  assetType: AssetType;
  ticker: string;
  allowAnySymbol: boolean;
  universe: UniverseSnapshot | null;
  universeLoading: boolean;
  universeError: string;
  onAssetTypeChange: (assetType: AssetType) => void;
  onTickerChange: (ticker: string) => void;
  onAllowAnySymbolChange: (value: boolean) => void;
}

interface FlatOption {
  id: string;
  symbol: string;
  group: string;
}

export default function AssetSelector({
  assetType,
  ticker,
  allowAnySymbol,
  universe,
  universeLoading,
  universeError,
  onAssetTypeChange,
  onTickerChange,
  onAllowAnySymbolChange,
}: AssetSelectorProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [userHighlight, setUserHighlight] = useState<number | null>(null);
  const [seenType, setSeenType] = useState(assetType);
  const [seenQuery, setSeenQuery] = useState(ticker.trim().toUpperCase());

  const symbols = universe ? universeFor(universe, assetType) : [];
  const groups = useMemo(
    () => (universe ? universeGroups(universe, assetType) : []),
    [universe, assetType],
  );
  const normalized = ticker.trim().toUpperCase();
  const valid = allowAnySymbol || !normalized || isValidTicker(normalized, assetType, universe);
  const query = normalized;

  if (assetType !== seenType) {
    setSeenType(assetType);
    setOpen(false);
    setFiltering(false);
    setUserHighlight(null);
  }
  if (query !== seenQuery) {
    setSeenQuery(query);
    setUserHighlight(null);
  }

  const filteredGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          symbols: filtering && query
            ? group.symbols.filter((symbol) => symbol.includes(query))
            : group.symbols,
        }))
        .filter((group) => group.symbols.length > 0),
    [groups, query, filtering],
  );

  const flatOptions = useMemo<FlatOption[]>(
    () =>
      filteredGroups.flatMap((group, groupIndex) =>
        group.symbols.map((symbol, symbolIndex) => ({
          id: `${listboxId}-${groupIndex}-${symbolIndex}`,
          symbol,
          group: group.label,
        })),
      ),
    [filteredGroups, listboxId],
  );

  const matchedIndex = useMemo(() => {
    const index = flatOptions.findIndex((option) => option.symbol === normalized);
    return index >= 0 ? index : 0;
  }, [flatOptions, normalized]);

  const lastIndex = Math.max(flatOptions.length - 1, 0);
  const highlight = Math.min(userHighlight ?? matchedIndex, lastIndex);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-option-index="${highlight}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  function selectSymbol(symbol: string) {
    onTickerChange(symbol);
    setFiltering(false);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setUserHighlight(flatOptions.length === 0 ? 0 : (highlight + 1) % flatOptions.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setUserHighlight(
        flatOptions.length === 0 ? 0 : (highlight - 1 + flatOptions.length) % flatOptions.length,
      );
      return;
    }
    if (event.key === "Enter" && open) {
      const option = flatOptions[highlight];
      if (option) {
        event.preventDefault();
        selectSymbol(option.symbol);
      }
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const universeLabel =
    assetType === "CRYPTO"
      ? "top 50 crypto"
      : "top 50 S&P, top 50 Nasdaq, and top 50 US ETF";

  let optionCursor = 0;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/20">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Universe</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Asset selector</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-950 p-1 ring-1 ring-slate-800">
        <button
          type="button"
          onClick={() => onAssetTypeChange("STOCK")}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            assetType === "STOCK"
              ? "bg-slate-100 text-slate-950 shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          US STOCKS
        </button>
        <button
          type="button"
          onClick={() => onAssetTypeChange("CRYPTO")}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            assetType === "CRYPTO"
              ? "bg-slate-100 text-slate-950 shadow"
              : "text-slate-400 hover:text-white"
          }`}
        >
          CRYPTO
        </button>
      </div>

      <label className="mt-4 block text-sm font-medium text-slate-300" htmlFor="ticker">
        Ticker
      </label>
      <div className="relative mt-1" ref={rootRef}>
        <input
          id="ticker"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open && flatOptions[highlight] ? flatOptions[highlight].id : undefined}
          value={ticker}
          onChange={(event) => {
            onTickerChange(event.target.value.toUpperCase());
            setFiltering(true);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={assetType === "CRYPTO" ? "BTC-USD" : "AAPL"}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-3 pr-10 text-sm text-white outline-none ring-emerald-400/0 transition placeholder:text-slate-600 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
          autoComplete="off"
          spellCheck="false"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={open ? "Hide ticker list" : "Show ticker list"}
          onClick={() => setOpen((current) => !current)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-white"
        >
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        {open ? (
          <ul
            id={listboxId}
            ref={listRef}
            role="listbox"
            className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-700 bg-slate-950 py-1 shadow-2xl shadow-black/40"
          >
            {universeLoading && groups.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-500">Loading ranked tickers…</li>
            ) : universeError && groups.length === 0 ? (
              <li className="px-3 py-2 text-xs text-rose-400">{universeError}</li>
            ) : flatOptions.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-500">No tickers match {normalized}.</li>
            ) : (
              filteredGroups.map((group) => (
                <li key={group.label}>
                  <p className="sticky top-0 bg-slate-950 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {group.label}
                  </p>
                  <ul>
                    {group.symbols.map((symbol) => {
                      const optionIndex = optionCursor;
                      optionCursor += 1;
                      const option = flatOptions[optionIndex];
                      const active = optionIndex === highlight;
                      const selected = normalized === symbol;
                      return (
                        <li
                          key={option.id}
                          id={option.id}
                          role="option"
                          aria-selected={selected}
                          data-option-index={optionIndex}
                          onMouseEnter={() => setUserHighlight(optionIndex)}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            selectSymbol(symbol);
                          }}
                          className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-sm ${
                            active ? "bg-emerald-400/10 text-emerald-200" : "text-slate-200"
                          }`}
                        >
                          <span className="font-medium">{symbol}</span>
                          {selected ? (
                            <span className="text-[10px] uppercase tracking-wide text-emerald-400">Selected</span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs text-slate-400">
        <input
          type="checkbox"
          checked={allowAnySymbol}
          onChange={(event) => onAllowAnySymbolChange(event.target.checked)}
          className="rounded border-slate-600 bg-slate-950 text-emerald-400"
        />
        Allow any Yahoo symbol (not just the curated list)
      </label>
      <p className={`mt-2 text-xs ${valid ? "text-slate-500" : "text-rose-400"}`}>
        {universeLoading && symbols.length === 0
          ? "Loading live top-50 lists from Yahoo (cached for 6 hours)."
          : universeError && symbols.length === 0
            ? universeError
            : allowAnySymbol
              ? `Open symbol search. Lists still show ${universeLabel} names (${symbols.length} unique) as shortcuts.`
              : valid
                ? `Type a ticker or pick from the list. Live ${universeLabel} names (${symbols.length} unique${universe?.fetchedAt ? `, as of ${universe.fetchedAt.slice(0, 10)}` : ""}).`
                : `${normalized} is not in the ${universeLabel} universe.`}
      </p>
    </section>
  );
}
