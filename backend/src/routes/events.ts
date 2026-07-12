import { Router, Response, NextFunction } from "express";
import slugify from "../utils/slugify";
import rateLimit from "express-rate-limit";
import { body, validationResult } from "express-validator";
import { prisma } from "../utils/prisma";
import { requireAuth, optionalAuth, canPostListings, AuthRequest } from "../middleware/auth";
import { distanceKm } from "../utils/geo";
import {
  containsSuspiciousKeywords,
  findLikelyDuplicate,
  isPostingTooFrequently,
} from "../utils/spamDetection";

const router = Router();

// Slow down rapid-fire listing creation - a common spam pattern.
const createListingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many listings submitted. Please try again later." },
});

// GET /api/events - search & browse, with optional geo-proximity sort/filter.
router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const {
      lat,
      lng,
      radiusKm,
      city,
      country,
      category,
      scope,
      priceType,
      search,
      startAfter,
      startBefore,
      language,
      when, // "past" | "upcoming" (default: upcoming)
      page = "1",
      pageSize = "20",
    } = req.query as Record<string, string>;

    const where: any = { status: when === "past" ? { in: ["APPROVED", "COMPLETED"] } : "APPROVED" };
    if (city) where.city = { equals: city, mode: "insensitive" };
    if (country) where.country = { equals: country, mode: "insensitive" };
    if (category) where.category = category;
    if (scope) where.scope = scope;
    if (priceType) where.priceType = priceType;
    if (language) where.languages = { has: language };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { has: search.toLowerCase() } },
      ];
    }
    if (startAfter || startBefore) {
      where.startDate = {};
      if (startAfter) where.startDate.gte = new Date(startAfter);
      if (startBefore) where.startDate.lte = new Date(startBefore);
    } else if (when === "past") {
      where.startDate = { lt: new Date() };
    } else {
      // Default browse view only shows what's still upcoming - a past
      // event cluttering the top of the list (sorted oldest-first) was a
      // real gap before the dedicated "when=past" view existed.
      where.startDate = { gte: new Date() };
    }

    const take = Math.min(parseInt(pageSize, 10) || 20, 50);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    let events = await prisma.event.findMany({
      where,
      orderBy: { startDate: when === "past" ? "desc" : "asc" },
      include: {
        organizer: { select: { id: true, name: true, organizationName: true, isVerifiedOrganizer: true } },
        _count: { select: { reviews: true, bookings: true } },
      },
      skip,
      take,
    });

    let withDistance = events.map((e) => ({
      ...e,
      distanceKm:
        lat && lng && e.latitude && e.longitude
          ? Math.round(distanceKm(parseFloat(lat), parseFloat(lng), e.latitude, e.longitude) * 10) / 10
          : null,
    }));

    if (lat && lng && radiusKm) {
      withDistance = withDistance.filter(
        (e) => e.distanceKm === null || e.distanceKm <= parseFloat(radiusKm)
      );
    }
    if (lat && lng) {
      withDistance.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }

    const total = await prisma.event.count({ where });
    res.json({ events: withDistance, total, page: Number(page), pageSize: take });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        organizer: { select: { id: true, name: true, organizationName: true, isVerifiedOrganizer: true, avatarUrl: true } },
        reviews: { where: { status: "APPROVED" }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
        _count: { select: { bookings: true, reviews: true } },
      },
    });
    if (!event) return res.status(404).json({ error: "Event not found" });

    // Only the organizer, an admin, or an approved event is visible to the public.
    const isOwnerOrAdmin =
      req.user && (req.user.userId === event.organizerId || req.user.role === "ADMIN");
    if (event.status !== "APPROVED" && !isOwnerOrAdmin) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (event.status === "APPROVED") {
      await prisma.event.update({ where: { id: event.id }, data: { viewCount: { increment: 1 } } });
    }

    res.json({ event });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  requireAuth,
  canPostListings,
  createListingLimiter,
  [
    body("title").trim().isLength({ min: 4, max: 150 }),
    body("description").trim().isLength({ min: 20 }),
    body("category").notEmpty(),
    body("priceType").isIn(["FREE", "PAID"]),
    body("price").if(body("priceType").equals("PAID")).isFloat({ gt: 0 }),
    body("city").notEmpty(),
    body("country").notEmpty(),
    body("startDate").isISO8601(),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const tooFrequent = await isPostingTooFrequently(req.user!.userId);
      if (tooFrequent) {
        return res.status(429).json({ error: "You're posting too many listings too quickly. Please slow down." });
      }

      const data = req.body;
      const combinedText = `${data.title} ${data.description}`;
      const suspiciousHit = containsSuspiciousKeywords(combinedText);

      const duplicateOfId = await findLikelyDuplicate({
        title: data.title,
        city: data.city,
        country: data.country,
        startDate: new Date(data.startDate),
      });

      const isFlagged = Boolean(suspiciousHit || duplicateOfId);

      // Honor the admin's site-wide approval settings (/const/settings):
      // flagged submissions always go to review regardless, since those
      // settings are about trust, not about skipping fraud checks.
      const settings = await prisma.platformSetting.findUnique({ where: { id: "singleton" } });
      const organizer = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { isVerifiedOrganizer: true } });
      const skipReview =
        !isFlagged &&
        ((settings && settings.requireEventApproval === false) ||
          (settings?.autoApproveVerified && organizer?.isVerifiedOrganizer));

      const slug = `${slugify(data.title)}-${Date.now().toString(36)}`;

      const event = await prisma.event.create({
        data: {
          title: data.title,
          slug,
          description: data.description,
          category: data.category,
          scope: data.scope || "LOCAL",
          priceType: data.priceType,
          price: data.priceType === "PAID" ? data.price : null,
          currency: data.currency || "UGX",
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
          timezone: data.timezone || "Africa/Kampala",
          venueName: data.venueName,
          address: data.address,
          city: data.city,
          country: data.country,
          latitude: data.latitude,
          longitude: data.longitude,
          coverImageUrl: data.coverImageUrl,
          communityId: data.communityId || undefined,
          galleryUrls: data.galleryUrls || [],
          languages: data.languages || ["en"],
          tags: (data.tags || []).map((t: string) => t.toLowerCase()),
          capacity: data.capacity,
          organizerId: req.user!.userId,
          // Every listing goes through review by default - flags simply
          // surface it more prominently in the queue. Admins can relax this
          // globally (skip review entirely, or auto-approve verified
          // organizers) from /const/settings; flagged submissions still
          // always land in the queue regardless of that setting.
          status: skipReview ? "APPROVED" : "PENDING",
          ...(skipReview ? { approvedAt: new Date() } : {}),
          isFlagged,
          flagReason: suspiciousHit
            ? `Suspicious phrase detected: "${suspiciousHit}"`
            : duplicateOfId
            ? "Possible duplicate of an existing listing"
            : null,
          duplicateOfId: duplicateOfId,
        },
      });

      res.status(201).json({ event, message: skipReview ? "Listing published" : "Submitted for admin review" });
    } catch (err) {
      next(err);
    }
  }
);

router.put("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Event not found" });
    if (existing.organizerId !== req.user!.userId && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to edit this listing" });
    }

    const { title, description, category, priceType, price, currency, startDate, endDate,
      venueName, address, city, country, latitude, longitude, coverImageUrl, galleryUrls,
      languages, tags, capacity, scope } = req.body;

    // Edits to a live listing go back to PENDING so admins can re-verify.
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        title, description, category, priceType,
        price: priceType === "PAID" ? price : null,
        currency, startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        venueName, address, city, country, latitude, longitude,
        coverImageUrl, galleryUrls, languages, tags, capacity, scope,
        status: req.user!.role === "ADMIN" ? existing.status : "PENDING",
      },
    });
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Event not found" });
    if (existing.organizerId !== req.user!.userId && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to delete this listing" });
    }
    await prisma.event.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/events/organizer/mine - the logged-in organizer's own listings
router.get("/organizer/mine", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const events = await prisma.event.findMany({
      where: { organizerId: req.user!.userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { bookings: true, reviews: true } } },
    });
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

export default router;
