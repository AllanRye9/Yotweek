import { Router, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import slugify from "../utils/slugify";
import { prisma } from "../utils/prisma";
import { requireAuth, optionalAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/communities - browse/search. Optional ?city=, ?country=,
// ?interestTag=, ?search=. Public - communities are a discovery surface,
// not gated content.
router.get("/", optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { city, country, interestTag, search, page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const where: any = {};
    if (city) where.city = { equals: city, mode: "insensitive" };
    if (country) where.country = { equals: country, mode: "insensitive" };
    if (interestTag) where.interestTag = { equals: interestTag, mode: "insensitive" };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { interestTag: { contains: search, mode: "insensitive" } },
      ];
    }

    const take = Math.min(parseInt(pageSize, 10) || 20, 50);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const [communities, total] = await Promise.all([
      prisma.community.findMany({
        where,
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        include: {
          creator: { select: { id: true, name: true } },
          _count: { select: { members: true, events: true, businesses: true } },
        },
        skip,
        take,
      }),
      prisma.community.count({ where }),
    ]);

    res.json({ communities, total, page: Number(page), pageSize: take });
  } catch (err) {
    next(err);
  }
});

// GET /api/communities/:slug
router.get("/:slug", optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const community = await prisma.community.findUnique({
      where: { slug: req.params.slug },
      include: {
        creator: { select: { id: true, name: true, organizationName: true } },
        _count: { select: { members: true, events: true, businesses: true } },
      },
    });
    if (!community) return res.status(404).json({ error: "Community not found" });

    let isMember = false;
    if (req.user) {
      const membership = await prisma.communityMember.findUnique({
        where: { communityId_userId: { communityId: community.id, userId: req.user.userId } },
      });
      isMember = !!membership;
    }

    res.json({ community, isMember });
  } catch (err) {
    next(err);
  }
});

// GET /api/communities/:slug/events - approved events posted within this community.
router.get("/:slug/events", async (req, res, next) => {
  try {
    const community = await prisma.community.findUnique({ where: { slug: req.params.slug } });
    if (!community) return res.status(404).json({ error: "Community not found" });
    const events = await prisma.event.findMany({
      where: { communityId: community.id, status: "APPROVED" },
      orderBy: { startDate: "asc" },
      take: 24,
    });
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

// GET /api/communities/:slug/businesses - approved businesses posted within this community.
router.get("/:slug/businesses", async (req, res, next) => {
  try {
    const community = await prisma.community.findUnique({ where: { slug: req.params.slug } });
    if (!community) return res.status(404).json({ error: "Community not found" });
    const businesses = await prisma.business.findMany({
      where: { communityId: community.id, status: "APPROVED" },
      orderBy: { name: "asc" },
      take: 24,
    });
    res.json({ businesses });
  } catch (err) {
    next(err);
  }
});

// POST /api/communities - create a community. Any signed-in user can start
// one (this is meant to be a low-friction, community-driven feature, not
// an admin-gated one) - the creator is automatically its first ADMIN member.
router.post(
  "/",
  requireAuth,
  [
    body("name").trim().isLength({ min: 3, max: 80 }),
    body("description").trim().isLength({ min: 10, max: 2000 }),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name, description, coverImageUrl, city, country, interestTag } = req.body;
      if (!city && !interestTag) {
        return res.status(400).json({ error: "Give your community a place, an interest, or both." });
      }

      const slug = `${slugify(name)}-${Date.now().toString(36)}`;
      const community = await prisma.community.create({
        data: {
          name, description, slug,
          coverImageUrl: coverImageUrl || null,
          city: city || null,
          country: country || null,
          interestTag: interestTag || null,
          creatorId: req.user!.userId,
          members: { create: { userId: req.user!.userId, role: "ADMIN" } },
        },
      });

      res.status(201).json({ community });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/communities/:id/join
router.post("/:id/join", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const community = await prisma.community.findUnique({ where: { id: req.params.id } });
    if (!community) return res.status(404).json({ error: "Community not found" });

    await prisma.communityMember.upsert({
      where: { communityId_userId: { communityId: community.id, userId: req.user!.userId } },
      update: {},
      create: { communityId: community.id, userId: req.user!.userId, role: "MEMBER" },
    });
    res.json({ message: "Joined community" });
  } catch (err) {
    next(err);
  }
});

// POST /api/communities/:id/leave
router.post("/:id/leave", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const community = await prisma.community.findUnique({ where: { id: req.params.id } });
    if (!community) return res.status(404).json({ error: "Community not found" });
    if (community.creatorId === req.user!.userId) {
      return res.status(400).json({ error: "The creator can't leave their own community. Transfer or delete it instead." });
    }
    await prisma.communityMember.deleteMany({ where: { communityId: community.id, userId: req.user!.userId } });
    res.json({ message: "Left community" });
  } catch (err) {
    next(err);
  }
});

export default router;
