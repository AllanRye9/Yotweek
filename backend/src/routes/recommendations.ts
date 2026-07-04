import { Router } from "express";
import { prisma } from "../utils/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/recommendations/events/:eventId/similar - "people who saved or
// booked this also liked" - item-based collaborative filtering computed
// directly in SQL from SavedEvent + Booking co-occurrence, no external
// model or API required.
router.get("/events/:eventId/similar", async (req, res, next) => {
  try {
    const similar = await prisma.$queryRaw<any[]>`
      WITH interested_users AS (
        SELECT "userId" FROM "SavedEvent" WHERE "eventId" = ${req.params.eventId}
        UNION
        SELECT "userId" FROM "Booking" WHERE "eventId" = ${req.params.eventId} AND status = 'CONFIRMED'
      ),
      co_occurring AS (
        SELECT e.id, e.title, e.slug, e.city, e.country, e."coverImageUrl", COUNT(*) AS score
        FROM "SavedEvent" se
        JOIN "Event" e ON e.id = se."eventId"
        WHERE se."userId" IN (SELECT "userId" FROM interested_users)
          AND se."eventId" != ${req.params.eventId}
          AND e.status = 'APPROVED'
        GROUP BY e.id, e.title, e.slug, e.city, e.country, e."coverImageUrl"
      )
      SELECT * FROM co_occurring ORDER BY score DESC LIMIT 6
    `;

    // Cold-start fallback: if nobody has co-saved/booked yet, just show
    // other approved events in the same category/city.
    if (similar.length === 0) {
      const event = await prisma.event.findUnique({ where: { id: req.params.eventId } });
      if (event) {
        const fallback = await prisma.event.findMany({
          where: {
            status: "APPROVED",
            id: { not: event.id },
            OR: [{ category: event.category }, { city: event.city }],
          },
          take: 6,
          orderBy: { viewCount: "desc" },
        });
        return res.json({ events: fallback, source: "fallback" });
      }
    }

    res.json({ events: similar, source: "collaborative" });
  } catch (err) {
    next(err);
  }
});

// GET /api/recommendations/for-you - personalized picks for the logged-in
// user, based on the categories/cities of things they've already saved or
// booked (a lightweight content-based signal, no external AI dependency).
router.get("/for-you", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const [savedEvents, bookings] = await Promise.all([
      prisma.savedEvent.findMany({ where: { userId: req.user!.userId }, include: { event: true } }),
      prisma.booking.findMany({ where: { userId: req.user!.userId }, include: { event: true } }),
    ]);

    const seenEventIds = new Set([...savedEvents.map((s) => s.eventId), ...bookings.map((b) => b.eventId)]);
    const categories = [...new Set([...savedEvents, ...bookings].map((x) => x.event.category))];
    const cities = [...new Set([...savedEvents, ...bookings].map((x) => x.event.city))];

    if (categories.length === 0 && cities.length === 0) {
      // No signal yet - just return the most popular upcoming events.
      const popular = await prisma.event.findMany({
        where: { status: "APPROVED", startDate: { gte: new Date() } },
        orderBy: { viewCount: "desc" },
        take: 8,
      });
      return res.json({ events: popular, source: "popular" });
    }

    const events = await prisma.event.findMany({
      where: {
        status: "APPROVED",
        startDate: { gte: new Date() },
        id: { notIn: [...seenEventIds] },
        OR: [{ category: { in: categories } }, { city: { in: cities } }],
      },
      orderBy: { startDate: "asc" },
      take: 8,
    });

    res.json({ events, source: "personalized" });
  } catch (err) {
    next(err);
  }
});

export default router;
