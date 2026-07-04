import { Router, Response, NextFunction } from "express";
import slugify from "../utils/slugify";
import rateLimit from "express-rate-limit";
import { body, validationResult } from "express-validator";
import { prisma } from "../utils/prisma";
import { requireAuth, optionalAuth, canPostListings, AuthRequest } from "../middleware/auth";
import { distanceKm } from "../utils/geo";
import {
  containsSuspiciousKeywords,
  findLikelyDuplicateBusiness,
  isPostingBusinessesTooFrequently,
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

// GET /api/businesses - search & browse, with optional geo-proximity sort/filter.
router.get("/", optionalAuth, async (req, res, next) => {
  try {
    const {
      lat,
      lng,
      radiusKm,
      city,
      country,
      categoryId,
      priceRange,
      search,
      page = "1",
      pageSize = "20",
    } = req.query as Record<string, string>;

    const where: any = { status: "APPROVED" };
    if (city) where.city = { equals: city, mode: "insensitive" };
    if (country) where.country = { equals: country, mode: "insensitive" };
    if (categoryId) where.categoryId = categoryId;
    if (priceRange) where.priceRange = priceRange;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { has: search.toLowerCase() } },
      ];
    }

    const take = Math.min(parseInt(pageSize, 10) || 20, 50);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const businesses = await prisma.business.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        owner: { select: { id: true, name: true, organizationName: true, isVerifiedOrganizer: true } },
        _count: { select: { reviews: true } },
      },
      skip,
      take,
    });

    let withDistance = businesses.map((b) => ({
      ...b,
      distanceKm:
        lat && lng && b.latitude && b.longitude
          ? Math.round(distanceKm(parseFloat(lat), parseFloat(lng), b.latitude, b.longitude) * 10) / 10
          : null,
    }));

    if (lat && lng && radiusKm) {
      withDistance = withDistance.filter(
        (b) => b.distanceKm === null || b.distanceKm <= parseFloat(radiusKm)
      );
    }
    if (lat && lng) {
      withDistance.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }

    const total = await prisma.business.count({ where });
    res.json({ businesses: withDistance, total, page: Number(page), pageSize: take });
  } catch (err) {
    next(err);
  }
});

// GET /api/businesses/owner/mine - the logged-in owner's own listings.
router.get("/owner/mine", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const businesses = await prisma.business.findMany({
      where: { ownerId: req.user!.userId },
      orderBy: { createdAt: "desc" },
      include: { category: { select: { name: true, slug: true } }, _count: { select: { reviews: true } } },
    });
    res.json({ businesses });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const business = await prisma.business.findUnique({
      where: { id: req.params.id },
      include: {
        category: { select: { id: true, name: true, slug: true, parentId: true } },
        owner: { select: { id: true, name: true, organizationName: true, isVerifiedOrganizer: true, avatarUrl: true } },
        reviews: {
          where: { status: "APPROVED" },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { reviews: true } },
      },
    });
    if (!business) return res.status(404).json({ error: "Business not found" });

    const isOwnerOrAdmin =
      req.user && (req.user.userId === business.ownerId || req.user.role === "ADMIN");
    if (business.status !== "APPROVED" && !isOwnerOrAdmin) {
      return res.status(404).json({ error: "Business not found" });
    }

    if (business.status === "APPROVED") {
      await prisma.business.update({ where: { id: business.id }, data: { viewCount: { increment: 1 } } });
    }

    res.json({ business });
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
    body("name").trim().isLength({ min: 2, max: 150 }),
    body("description").trim().isLength({ min: 20 }),
    body("categoryId").notEmpty(),
    body("city").notEmpty(),
    body("country").notEmpty(),
    body("email").optional().isEmail(),
    body("website").optional().isURL(),
    body("priceRange").optional().isIn(["BUDGET", "MODERATE", "EXPENSIVE", "LUXURY"]),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const category = await prisma.category.findUnique({ where: { id: req.body.categoryId } });
      if (!category) return res.status(400).json({ error: "Invalid categoryId" });

      const tooFrequent = await isPostingBusinessesTooFrequently(req.user!.userId);
      if (tooFrequent) {
        return res.status(429).json({ error: "You're posting too many listings too quickly. Please slow down." });
      }

      const data = req.body;
      const combinedText = `${data.name} ${data.description}`;
      const suspiciousHit = containsSuspiciousKeywords(combinedText);

      const duplicateOfId = await findLikelyDuplicateBusiness({
        name: data.name,
        city: data.city,
        country: data.country,
      });

      const slug = `${slugify(data.name)}-${Date.now().toString(36)}`;

      const business = await prisma.business.create({
        data: {
          name: data.name,
          slug,
          description: data.description,
          categoryId: data.categoryId,
          phone: data.phone,
          email: data.email,
          website: data.website,
          priceRange: data.priceRange,
          address: data.address,
          city: data.city,
          country: data.country,
          latitude: data.latitude,
          longitude: data.longitude,
          coverImageUrl: data.coverImageUrl,
          galleryUrls: data.galleryUrls || [],
          tags: (data.tags || []).map((t: string) => t.toLowerCase()),
          hours: data.hours ?? undefined,
          ownerId: req.user!.userId,
          // Every listing still requires admin approval regardless of flags -
          // flags simply surface it more prominently in the review queue.
          status: "PENDING",
          isFlagged: Boolean(suspiciousHit || duplicateOfId),
          flagReason: suspiciousHit
            ? `Suspicious phrase detected: "${suspiciousHit}"`
            : duplicateOfId
            ? "Possible duplicate of an existing business listing"
            : null,
        },
      });

      res.status(201).json({ business, message: "Submitted for admin review" });
    } catch (err) {
      next(err);
    }
  }
);

router.put("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.business.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Business not found" });
    if (existing.ownerId !== req.user!.userId && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to edit this listing" });
    }

    const {
      name, description, categoryId, phone, email, website, priceRange,
      address, city, country, latitude, longitude, coverImageUrl, galleryUrls, tags, hours,
    } = req.body;

    // Edits to a live listing go back to PENDING so admins can re-verify.
    const business = await prisma.business.update({
      where: { id: req.params.id },
      data: {
        name, description, categoryId, phone, email, website, priceRange,
        address, city, country, latitude, longitude,
        coverImageUrl, galleryUrls, tags, hours,
        status: req.user!.role === "ADMIN" ? existing.status : "PENDING",
      },
    });
    res.json({ business });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.business.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Business not found" });
    if (existing.ownerId !== req.user!.userId && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to delete this listing" });
    }
    await prisma.business.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
