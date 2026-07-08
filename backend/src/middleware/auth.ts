import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../utils/prisma";

export interface AuthRequest extends Request {
  user?: { userId: string; role: string };
}

// Attaches req.user if a valid bearer token is present; does not block the request.
export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      req.user = verifyToken(header.slice(7));
    } catch {
      // ignore invalid/expired token, treat as anonymous
    }
  }
  next();
}

// Requires a valid bearer token.
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Restricts to specific roles. Call after requireAuth.
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

// Anyone allowed to submit event/tourism listings, subject to admin approval.
export const canPostListings = requireRole("USER", "AGENT", "COMPANY", "ORGANIZATION", "ADMIN");

// Restricts the homepage event-video slider to ADMINs and organizers the
// admin has explicitly verified (isVerifiedOrganizer). Unlike requireRole,
// this needs a DB lookup because isVerifiedOrganizer isn't in the JWT
// payload. Call after requireAuth.
export async function canUploadEventVideos(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });
  if (req.user.role === "ADMIN") return next();
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { isVerifiedOrganizer: true, isSuspended: true } });
    if (!user || user.isSuspended || !user.isVerifiedOrganizer) {
      return res.status(403).json({ error: "Only admins or admin-approved organizers can upload event videos." });
    }
    next();
  } catch (err) {
    next(err);
  }
}
