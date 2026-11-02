import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { runBacktest } from "./controllers/backtestController.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "apestock-backend" });
});

app.post("/api/backtest", runBacktest);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error." });
};

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Apestock backend listening on http://localhost:${PORT}`);
});
