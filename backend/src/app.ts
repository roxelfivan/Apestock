import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { getUniverse, runBacktest, runSweep, runWalkForward, syncPrices } from "./controllers/backtestController.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "apestock-backend" });
});

app.post("/api/backtest", runBacktest);
app.post("/api/backtest/sweep", runSweep);
app.post("/api/backtest/walk-forward", runWalkForward);
app.get("/api/universe", getUniverse);
app.post("/api/prices/sync", syncPrices);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error." });
};

app.use(errorHandler);

export default app;
