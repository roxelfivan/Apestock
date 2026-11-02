import { isValidTicker, universeFor } from "../data/universes";

export default function AssetSelector({ assetType, ticker, onAssetTypeChange, onTickerChange }) {
  const universe = universeFor(assetType);
  const normalized = ticker.trim().toUpperCase();
  const valid = !normalized || isValidTicker(normalized, assetType);
  const matches = normalized
    ? universe.filter((symbol) => symbol.includes(normalized)).slice(0, 8)
    : universe.slice(0, 8);

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
      <input
        id="ticker"
        value={ticker}
        onChange={(event) => onTickerChange(event.target.value.toUpperCase())}
        placeholder={assetType === "CRYPTO" ? "BTC-USD" : "AAPL"}
        className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none ring-emerald-400/0 transition placeholder:text-slate-600 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20"
        autoComplete="off"
        spellCheck="false"
      />
      <p className={`mt-2 text-xs ${valid ? "text-slate-500" : "text-rose-400"}`}>
        {valid
          ? `Validated against ${assetType === "CRYPTO" ? "top 50 crypto" : "S&P 100"} tickers.`
          : `${normalized} is not in the ${assetType === "CRYPTO" ? "crypto" : "S&P 100"} universe.`}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {matches.map((symbol) => (
          <button
            key={symbol}
            type="button"
            onClick={() => onTickerChange(symbol)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              normalized === symbol
                ? "border-emerald-400/70 bg-emerald-400/10 text-emerald-300"
                : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-white"
            }`}
          >
            {symbol}
          </button>
        ))}
      </div>
    </section>
  );
}
