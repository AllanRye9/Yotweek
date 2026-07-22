import { Router } from "express";
import { prisma } from "../utils/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.put("/me", async (req: AuthRequest, res, next) => {
  try {
    const { name, phone, country, city, organizationName, preferredLanguage, avatarUrl, bio } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { name, phone, country, city, organizationName, preferredLanguage, avatarUrl, bio },
    });
    const { passwordHash, ...safe } = user;
    res.json({ user: safe });
  } catch (err) {
    next(err);
  }
});

router.post("/me/saved-events/:eventId", async (req: AuthRequest, res, next) => {
  try {
    await prisma.savedEvent.upsert({
      where: { userId_eventId: { userId: req.user!.userId, eventId: req.params.eventId } },
      create: { userId: req.user!.userId, eventId: req.params.eventId },
      update: {},
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.delete("/me/saved-events/:eventId", async (req: AuthRequest, res, next) => {
  try {
    await prisma.savedEvent.delete({
      where: { userId_eventId: { userId: req.user!.userId, eventId: req.params.eventId } },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/me/saved-events", async (req: AuthRequest, res, next) => {
  try {
    const saved = await prisma.savedEvent.findMany({
      where: { userId: req.user!.userId },
      include: { event: true },
      orderBy: { savedAt: "desc" },
    });
    res.json({ savedEvents: saved.map((s) => s.event) });
  } catch (err) {
    next(err);
  }
});

router.post("/me/saved-businesses/:businessId", async (req: AuthRequest, res, next) => {
  try {
    await prisma.savedBusiness.upsert({
      where: { userId_businessId: { userId: req.user!.userId, businessId: req.params.businessId } },
      create: { userId: req.user!.userId, businessId: req.params.businessId },
      update: {},
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.delete("/me/saved-businesses/:businessId", async (req: AuthRequest, res, next) => {
  try {
    await prisma.savedBusiness.delete({
      where: { userId_businessId: { userId: req.user!.userId, businessId: req.params.businessId } },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/me/saved-businesses", async (req: AuthRequest, res, next) => {
  try {
    const saved = await prisma.savedBusiness.findMany({
      where: { userId: req.user!.userId },
      include: { business: true },
      orderBy: { savedAt: "desc" },
    });
    res.json({ savedBusinesses: saved.map((s) => s.business) });
  } catch (err) {
    next(err);
  }
});

export default router;
