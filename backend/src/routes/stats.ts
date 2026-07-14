import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../utils/prisma";

const router = Router();

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + (process.env.JWT_SECRET || "salt")).digest("hex");
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// Coarse device category only — "mobile" | "tablet" | "desktop" — never the
// raw User-Agent string, which is itself a fairly identifying fingerprint.
function deviceTypeFromUA(ua: string | undefined): string {
  if (!ua) return "desktop";
  const s = ua.toLowerCase();
  if (/ipad|tablet(?!.*mobile)/.test(s)) return "tablet";
  if (/mobi|android|iphone/.test(s)) return "mobile";
  return "desktop";
}

// POST /api/stats/visit - call once per page load from the frontend.
// Dedupes per IP-hash per day for "daily visitors"; every call increments
// the lifetime "total visitors" counter.
router.post("/visit", async (req, res, next) => {
  try {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
    const ipHash = hashIp(ip);
    const day = startOfDay(new Date());
    const deviceType = deviceTypeFromUA(req.headers["user-agent"]);

    await prisma.siteCounter.upsert({
      where: { key: "total_visitors" },
      create: { key: "total_visitors", value: 1 },
      update: { value: { increment: 1 } },
    });

    try {
      await prisma.visitorLog.create({ data: { ipHash, day, country: req.body?.country, deviceType } });
    } catch {
      // unique constraint on (ipHash, day) means this visitor was already
      // counted today - that's expected and fine, not an error.
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/stats/landing - the headline numbers shown on the homepage.
router.get("/landing", async (_req, res, next) => {
  try {
    const day = startOfDay(new Date());
    const [totalVisitorsCounter, dailyVisitors, totalEventsHeld, activeEvents, totalUsers] = await Promise.all([
      prisma.siteCounter.findUnique({ where: { key: "total_visitors" } }),
      prisma.visitorLog.count({ where: { day } }),
      prisma.event.count({ where: { status: "COMPLETED" } }),
      prisma.event.count({ where: { status: "APPROVED", startDate: { gte: new Date() } } }),
      prisma.user.count({ where: { role: { in: ["USER", "AGENT", "COMPANY", "ORGANIZATION"] } } }),
    ]);

    res.json({
      totalVisitors: totalVisitorsCounter?.value ?? 0,
      dailyVisitors,
      totalEventsHeld,
      activeEvents,
      totalRegisteredUsers: totalUsers,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
