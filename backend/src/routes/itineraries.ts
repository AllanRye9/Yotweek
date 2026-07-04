import { Router } from "express";
import { prisma } from "../utils/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { distanceKm } from "../utils/geo";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res, next) => {
  try {
    const itineraries = await prisma.itinerary.findMany({
      where: { userId: req.user!.userId },
      include: { items: { include: { event: true }, orderBy: [{ day: "asc" }, { sortOrder: "asc" }] } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ itineraries });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req: AuthRequest, res, next) => {
  try {
    const { title, startDate, endDate } = req.body;
    const itinerary = await prisma.itinerary.create({
      data: { userId: req.user!.userId, title, startDate: new Date(startDate), endDate: new Date(endDate) },
    });
    res.status(201).json({ itinerary });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/items", async (req: AuthRequest, res, next) => {
  try {
    const itinerary = await prisma.itinerary.findUnique({ where: { id: req.params.id } });
    if (!itinerary || itinerary.userId !== req.user!.userId) {
      return res.status(404).json({ error: "Itinerary not found" });
    }
    const { eventId, customTitle, day, startTime, notes, sortOrder } = req.body;
    const item = await prisma.itineraryItem.create({
      data: { itineraryId: itinerary.id, eventId, customTitle, day, startTime, notes, sortOrder: sortOrder || 0 },
    });
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

router.delete("/items/:itemId", async (req: AuthRequest, res, next) => {
  try {
    const item = await prisma.itineraryItem.findUnique({
      where: { id: req.params.itemId },
      include: { itinerary: true },
    });
    if (!item || item.itinerary.userId !== req.user!.userId) {
      return res.status(404).json({ error: "Item not found" });
    }
    await prisma.itineraryItem.delete({ where: { id: req.params.itemId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/itineraries/suggest-nearby?lat=&lng=&excludeEventId= - quick
// "nearby attractions" suggestions (landmarks/hotels/restaurants are just
// approved events tagged accordingly, or other events close by) to help
// fill out a day's plan.
router.get("/suggest-nearby", async (req, res, next) => {
  try {
    const { lat, lng, radiusKm = "25", excludeEventId } = req.query as Record<string, string>;
    if (!lat || !lng) return res.status(400).json({ error: "lat and lng are required" });

    const candidates = await prisma.event.findMany({
      where: { status: "APPROVED", id: excludeEventId ? { not: excludeEventId } : undefined },
      take: 100,
    });

    const nearby = candidates
      .filter((e) => e.latitude && e.longitude)
      .map((e) => ({
        ...e,
        distanceKm: Math.round(distanceKm(parseFloat(lat), parseFloat(lng), e.latitude!, e.longitude!) * 10) / 10,
      }))
      .filter((e) => e.distanceKm <= parseFloat(radiusKm))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 10);

    res.json({ suggestions: nearby });
  } catch (err) {
    next(err);
  }
});

export default router;
