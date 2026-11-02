import type { Request, Response } from "express";
import { runBacktest } from "../backend/src/controllers/backtestController.js";

export default async function handler(req: Request, res: Response): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed." });
    return;
  }
  await runBacktest(req, res);
}
