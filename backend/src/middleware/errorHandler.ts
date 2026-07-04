import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error(err?.stack || err?.message || String(err));
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Internal server error",
  });
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}
