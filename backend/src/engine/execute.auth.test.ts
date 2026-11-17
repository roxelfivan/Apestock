import assert from "node:assert/strict";
import { test } from "node:test";
import { authorizeParsedRequest, parseBacktestRequest } from "./execute.js";

test("authorizeParsedRequest does not require a live Yahoo universe", async () => {
  const parsed = parseBacktestRequest({
    ticker: "NVDA",
    assetType: "STOCK",
    strategy: "BUY_HOLD",
    startingCapital: 10_000,
    timeframe: "1Y",
  });
  const next = await authorizeParsedRequest(parsed);
  assert.equal(next.ticker, "NVDA");
});
