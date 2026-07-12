import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

// Prisma throws a generic "PrismaClientKnownRequestError" for things like
// "update/delete on a record that doesn't exist" or "unique constraint
// violated" — left unhandled, these surface to the client as a raw 500 with
// Prisma's internal invocation message (e.g. "Invalid
// `prisma.highlight.update()` invocation: ... Record to update not found."),
// which is what was being reported as a bug. Translate the common ones into
// clean, correctly-coded responses instead.
function translatePrismaError(err: any): { status: number; message: string } | null {
  const code = err?.code;
  if (typeof code !== "string" || !code.startsWith("P")) return null;

  switch (code) {
    case "P2025": // record required for update/delete/connect was not found
      return { status: 404, message: "That item no longer exists — it may have already been removed or updated elsewhere. Please refresh and try again." };
    case "P2002": { // unique constraint violation
      const field = Array.isArray(err?.meta?.target) ? err.meta.target.join(", ") : (err?.meta?.target || "field");
      return { status: 409, message: `A record with that ${field} already exists.` };
    }
    case "P2003": // foreign key constraint failed
      return { status: 409, message: "This action isn't possible because other records still reference it." };
    case "P2014": // required relation violation
      return { status: 409, message: "This action would break a required relationship between records." };
    default:
      return null;
  }
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error(err?.stack || err?.message || String(err));

  const prismaError = translatePrismaError(err);
  if (prismaError) {
    return res.status(prismaError.status).json({ error: prismaError.message });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: status >= 500 ? "Something went wrong on our end. Please try again." : (err.message || "Internal server error"),
  });
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}
