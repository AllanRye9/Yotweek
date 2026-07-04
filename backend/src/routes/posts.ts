import { Router, Response, NextFunction } from "express";
import slugify from "../utils/slugify";
import { body, validationResult } from "express-validator";
import { prisma } from "../utils/prisma";
import { requireAuth, optionalAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/posts - published posts, newest first, optional tag filter.
router.get("/", async (req, res, next) => {
  try {
    const { tag, authorId, page = "1", pageSize = "12" } = req.query as Record<string, string>;
    const where: any = { status: "PUBLISHED" };
    if (tag) where.tags = { has: tag.toLowerCase() };
    if (authorId) where.authorId = authorId;

    const take = Math.min(parseInt(pageSize, 10) || 12, 30);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        include: { author: { select: { name: true, avatarUrl: true, organizationName: true } } },
        skip,
        take,
      }),
      prisma.post.count({ where }),
    ]);

    res.json({ posts, total, page: Number(page), pageSize: take });
  } catch (err) {
    next(err);
  }
});

router.get("/mine", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const posts = await prisma.post.findMany({
      where: { authorId: req.user!.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ posts });
  } catch (err) {
    next(err);
  }
});

router.get("/:slug", optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const post = await prisma.post.findUnique({
      where: { slug: req.params.slug },
      include: { author: { select: { id: true, name: true, avatarUrl: true, organizationName: true } } },
    });
    if (!post) return res.status(404).json({ error: "Post not found" });

    const isOwnerOrAdmin = req.user && (req.user.userId === post.authorId || req.user.role === "ADMIN");
    if (post.status !== "PUBLISHED" && !isOwnerOrAdmin) return res.status(404).json({ error: "Post not found" });

    if (post.status === "PUBLISHED") {
      await prisma.post.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } });
    }
    res.json({ post });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  requireAuth,
  [
    body("title").trim().isLength({ min: 4, max: 150 }),
    body("body").trim().isLength({ min: 50 }),
    body("status").optional().isIn(["DRAFT", "PUBLISHED"]),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { title, excerpt, body: content, coverImageUrl, images, tags, status } = req.body;
      const slug = `${slugify(title)}-${Date.now().toString(36)}`;
      const publish = status === "PUBLISHED";

      const post = await prisma.post.create({
        data: {
          authorId: req.user!.userId,
          title,
          slug,
          excerpt,
          body: content,
          coverImageUrl,
          images: images || [],
          tags: (tags || []).map((t: string) => t.toLowerCase()),
          status: publish ? "PUBLISHED" : "DRAFT",
          publishedAt: publish ? new Date() : null,
        },
      });
      res.status(201).json({ post });
    } catch (err) {
      next(err);
    }
  }
);

router.put("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Post not found" });
    if (existing.authorId !== req.user!.userId && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to edit this post" });
    }

    const { title, excerpt, body: content, coverImageUrl, images, tags, status } = req.body;
    const publishing = status === "PUBLISHED" && existing.status !== "PUBLISHED";

    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: {
        title, excerpt, body: content, coverImageUrl, images, tags,
        status,
        publishedAt: publishing ? new Date() : existing.publishedAt,
      },
    });
    res.json({ post });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Post not found" });
    if (existing.authorId !== req.user!.userId && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to delete this post" });
    }
    await prisma.post.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
