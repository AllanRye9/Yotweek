import { Router, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import slugify from "../utils/slugify";
import { prisma } from "../utils/prisma";
import { requireAuth, optionalAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/communities - browse/search. Optional ?city=, ?country=,
// ?interestTag=, ?search=. Public - communities are a discovery surface,
// not gated content. Only approved communities are shown here; pending/
// rejected ones are only visible to their creator or an admin (see /mine
// and /admin/communities).
router.get("/", optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { city, country, interestTag, search, page = "1", pageSize = "20" } = req.query as Record<string, string>;
    const where: any = { status: "APPROVED" };
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

// GET /api/communities/mine - communities the signed-in user created,
// regardless of approval status, for their own management dashboard.
router.get("/mine", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const communities = await prisma.community.findMany({
      where: { creatorId: req.user!.userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { members: true, events: true, businesses: true, posts: true } } },
    });
    res.json({ communities, limit: 3, remaining: Math.max(0, 3 - communities.length) });
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
        _count: { select: { members: true, events: true, businesses: true, posts: true } },
      },
    });
    if (!community) return res.status(404).json({ error: "Community not found" });

    const isOwnerOrAdmin = req.user && (req.user.userId === community.creatorId || req.user.role === "ADMIN");
    if (community.status !== "APPROVED" && !isOwnerOrAdmin) {
      return res.status(404).json({ error: "Community not found" });
    }

    let isMember = false;
    let myRole: string | null = null;
    if (req.user) {
      const membership = await prisma.communityMember.findUnique({
        where: { communityId_userId: { communityId: community.id, userId: req.user.userId } },
      });
      isMember = !!membership;
      myRole = membership?.role ?? null;
    }

    res.json({ community, isMember, myRole, isCreator: req.user?.userId === community.creatorId });
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
// an admin-gated one), capped at 3 per user - the creator is automatically
// its first ADMIN member. Goes live immediately only if the platform's
// requireCommunityApproval setting is off (or the creator is a verified
// organizer and autoApproveVerified is on); otherwise it starts PENDING.
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

      const existingCount = await prisma.community.count({ where: { creatorId: req.user!.userId } });
      if (existingCount >= 3) {
        return res.status(403).json({ error: "You've reached the limit of 3 communities per account. Delete one before creating another." });
      }

      const { name, description, coverImageUrl, city, country, interestTag } = req.body;
      if (!city && !interestTag) {
        return res.status(400).json({ error: "Give your community a place, an interest, or both." });
      }

      const [settings, creator] = await Promise.all([
        prisma.platformSetting.findUnique({ where: { id: "singleton" } }),
        prisma.user.findUnique({ where: { id: req.user!.userId }, select: { isVerifiedOrganizer: true } }),
      ]);
      const autoApprove =
        (settings && (settings as any).requireCommunityApproval === false) ||
        ((settings as any)?.autoApproveVerified && creator?.isVerifiedOrganizer);

      const slug = `${slugify(name)}-${Date.now().toString(36)}`;
      const community = await prisma.community.create({
        data: {
          name, description, slug,
          coverImageUrl: coverImageUrl || null,
          city: city || null,
          country: country || null,
          interestTag: interestTag || null,
          creatorId: req.user!.userId,
          status: autoApprove ? "APPROVED" : "PENDING",
          members: { create: { userId: req.user!.userId, role: "ADMIN" } },
        },
      });

      res.status(201).json({ community });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/communities/:id - creator or platform admin only.
router.put("/:id", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const community = await prisma.community.findUnique({ where: { id: req.params.id } });
    if (!community) return res.status(404).json({ error: "Community not found" });
    if (community.creatorId !== req.user!.userId && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Only the creator or an admin can edit this community." });
    }

    const { name, description, coverImageUrl, city, country, interestTag } = req.body;
    const updated = await prisma.community.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
        ...(city !== undefined ? { city } : {}),
        ...(country !== undefined ? { country } : {}),
        ...(interestTag !== undefined ? { interestTag } : {}),
      },
    });
    res.json({ community: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/communities/:id - creator or platform admin only. Members
// cascade-delete automatically (CommunityMember.communityId onDelete:
// Cascade); events/businesses posted here just lose their community tag
// (their FK is nullable) instead of being deleted, since a listing has
// independent value outside the community; community-scoped posts
// (announcements/discussions) do cascade-delete since they only make
// sense inside that community.
router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const community = await prisma.community.findUnique({ where: { id: req.params.id } });
    if (!community) return res.status(404).json({ error: "Community not found" });
    if (community.creatorId !== req.user!.userId && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Only the creator or an admin can delete this community." });
    }
    await prisma.$transaction([
      prisma.event.updateMany({ where: { communityId: community.id }, data: { communityId: null } }),
      prisma.business.updateMany({ where: { communityId: community.id }, data: { communityId: null } }),
      prisma.community.delete({ where: { id: community.id } }),
    ]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ─── Member management ─────────────────────────────────────────────────

// GET /api/communities/:id/members - creator or platform admin only.
router.get("/:id/members", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const community = await prisma.community.findUnique({ where: { id: req.params.id } });
    if (!community) return res.status(404).json({ error: "Community not found" });
    if (community.creatorId !== req.user!.userId && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Only the creator or an admin can view the member list." });
    }
    const members = await prisma.communityMember.findMany({
      where: { communityId: community.id },
      orderBy: { joinedAt: "asc" },
      include: { user: { select: { id: true, name: true, email: true, organizationName: true, isVerifiedOrganizer: true } } },
    });
    res.json({ members });
  } catch (err) {
    next(err);
  }
});

// PUT /api/communities/:id/members/:userId - promote/demote a member.
// Creator or platform admin only; the creator's own membership can't be
// demoted (they'd lose control of a community they own).
router.put("/:id/members/:userId", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const community = await prisma.community.findUnique({ where: { id: req.params.id } });
    if (!community) return res.status(404).json({ error: "Community not found" });
    if (community.creatorId !== req.user!.userId && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Only the creator or an admin can manage members." });
    }
    if (req.params.userId === community.creatorId) {
      return res.status(400).json({ error: "The creator's role can't be changed." });
    }
    const { role } = req.body;
    if (role !== "MEMBER" && role !== "ADMIN") {
      return res.status(400).json({ error: "role must be MEMBER or ADMIN" });
    }
    const member = await prisma.communityMember.update({
      where: { communityId_userId: { communityId: community.id, userId: req.params.userId } },
      data: { role },
    });
    res.json({ member });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/communities/:id/members/:userId - remove a member. Creator
// or platform admin only; the creator can't be removed from their own
// community (delete the community instead).
router.delete("/:id/members/:userId", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const community = await prisma.community.findUnique({ where: { id: req.params.id } });
    if (!community) return res.status(404).json({ error: "Community not found" });
    if (community.creatorId !== req.user!.userId && req.user!.role !== "ADMIN") {
      return res.status(403).json({ error: "Only the creator or an admin can remove members." });
    }
    if (req.params.userId === community.creatorId) {
      return res.status(400).json({ error: "The creator can't be removed from their own community." });
    }
    await prisma.communityMember.deleteMany({ where: { communityId: community.id, userId: req.params.userId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/communities/:id/join
router.post("/:id/join", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const community = await prisma.community.findUnique({ where: { id: req.params.id } });
    if (!community) return res.status(404).json({ error: "Community not found" });
    if (community.status !== "APPROVED") {
      return res.status(400).json({ error: "This community isn't live yet." });
    }

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

// ─── Community posts (announcements / discussions) ────────────────────
// Reuses the Post model with communityId set, rather than a parallel
// model - same title/body/images shape, own feed, own moderation.

// GET /api/communities/:slug/posts - published posts in this community.
router.get("/:slug/posts", optionalAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const community = await prisma.community.findUnique({ where: { slug: req.params.slug } });
    if (!community) return res.status(404).json({ error: "Community not found" });
    const posts = await prisma.post.findMany({
      where: { communityId: community.id, status: "PUBLISHED" },
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      include: {
        author: { select: { id: true, name: true, organizationName: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, name: true, organizationName: true } },
            _count: { select: { likes: true } },
          },
        },
        _count: { select: { likes: true, comments: true } },
      },
      take: 50,
    });

    let likedByMe = new Set<string>();
    if (req.user) {
      const likes = await prisma.communityPostLike.findMany({
        where: { postId: { in: posts.map((p) => p.id) }, userId: req.user.userId },
        select: { postId: true },
      });
      likedByMe = new Set(likes.map((l) => l.postId));
    }

    const payload = posts.map((post) => ({
      ...post,
      likedByMe: likedByMe.has(post.id),
    }));
    res.json({ posts: payload });
  } catch (err) {
    next(err);
  }
});

// POST /api/communities/:id/posts - members only. Publishes immediately;
// community posts don't go through the site-wide blog approval queue,
// only a membership check - the community's own creator/admins moderate
// from here on (see DELETE below).
router.post(
  "/:id/posts",
  requireAuth,
  [
    body("title").trim().isLength({ min: 4, max: 150 }),
    body("body").trim().isLength({ min: 5 }),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const community = await prisma.community.findUnique({ where: { id: req.params.id } });
      if (!community) return res.status(404).json({ error: "Community not found" });

      const membership = await prisma.communityMember.findUnique({
        where: { communityId_userId: { communityId: community.id, userId: req.user!.userId } },
      });
      if (!membership && req.user!.role !== "ADMIN") {
        return res.status(403).json({ error: "Join this community to post here." });
      }

      const { title, body: content, coverImageUrl, images } = req.body;
      const slug = `${slugify(title)}-${Date.now().toString(36)}`;
      const post = await prisma.post.create({
        data: {
          authorId: req.user!.userId,
          title, slug, body: content,
          coverImageUrl: coverImageUrl || null,
          images: images || [],
          status: "PUBLISHED",
          publishedAt: new Date(),
          communityId: community.id,
        },
        include: {
          author: { select: { id: true, name: true, organizationName: true } },
          comments: {
            orderBy: { createdAt: "asc" },
            include: {
              author: { select: { id: true, name: true, organizationName: true } },
              _count: { select: { likes: true } },
            },
          },
          _count: { select: { likes: true, comments: true } },
        },
      });
      res.status(201).json({ post: { ...post, likedByMe: false } });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/communities/:id/posts/:postId - author/creator/admin can edit a post.
router.put("/:id/posts/:postId", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const community = await prisma.community.findUnique({ where: { id: req.params.id } });
    if (!community) return res.status(404).json({ error: "Community not found" });
    const post = await prisma.post.findUnique({ where: { id: req.params.postId } });
    if (!post || post.communityId !== community.id) return res.status(404).json({ error: "Post not found" });

    const canModerate =
      post.authorId === req.user!.userId ||
      community.creatorId === req.user!.userId ||
      req.user!.role === "ADMIN";
    if (!canModerate) return res.status(403).json({ error: "Not authorized to edit this post." });

    const { title, body: content, coverImageUrl, images, isPinned, status } = req.body;
    const updated = await prisma.post.update({
      where: { id: post.id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(content !== undefined ? { body: content } : {}),
        ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
        ...(images !== undefined ? { images } : {}),
        ...(isPinned !== undefined ? { isPinned } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(status === "PUBLISHED" && post.status !== "PUBLISHED" ? { publishedAt: new Date() } : {}),
      },
      include: {
        author: { select: { id: true, name: true, organizationName: true } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            author: { select: { id: true, name: true, organizationName: true } },
            _count: { select: { likes: true } },
          },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });
    res.json({ post: { ...updated, likedByMe: false } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/communities/:id/posts/:postId - moderation. The post's own
// author, the community's creator, or a platform admin can remove it.
router.delete("/:id/posts/:postId", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const community = await prisma.community.findUnique({ where: { id: req.params.id } });
    if (!community) return res.status(404).json({ error: "Community not found" });
    const post = await prisma.post.findUnique({ where: { id: req.params.postId } });
    if (!post || post.communityId !== community.id) return res.status(404).json({ error: "Post not found" });

    const canModerate =
      post.authorId === req.user!.userId ||
      community.creatorId === req.user!.userId ||
      req.user!.role === "ADMIN";
    if (!canModerate) return res.status(403).json({ error: "Not authorized to remove this post." });

    await prisma.post.delete({ where: { id: post.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/communities/:id/posts/:postId/comments - community members can discuss posts.
router.post("/:id/posts/:postId/comments", requireAuth, [body("body").trim().isLength({ min: 1, max: 2000 })], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const community = await prisma.community.findUnique({ where: { id: req.params.id } });
    if (!community) return res.status(404).json({ error: "Community not found" });
    const post = await prisma.post.findUnique({ where: { id: req.params.postId } });
    if (!post || post.communityId !== community.id) return res.status(404).json({ error: "Post not found" });

    const membership = await prisma.communityMember.findUnique({ where: { communityId_userId: { communityId: community.id, userId: req.user!.userId } } });
    if (!membership && req.user!.role !== "ADMIN") return res.status(403).json({ error: "Join this community to comment." });

    const comment = await prisma.communityComment.create({
      data: {
        postId: post.id,
        authorId: req.user!.userId,
        body: req.body.body.trim(),
      },
      include: {
        author: { select: { id: true, name: true, organizationName: true } },
        _count: { select: { likes: true } },
      },
    });

    if (post.authorId !== req.user!.userId) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          type: "SYSTEM",
          message: `${req.user!.userId === post.authorId ? "You" : "A member"} commented on your community post.`,
          read: false,
        },
      });
    }
    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/communities/:id/posts/:postId/comments/:commentId - author/creator/admin can remove comments.
router.delete("/:id/posts/:postId/comments/:commentId", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const community = await prisma.community.findUnique({ where: { id: req.params.id } });
    if (!community) return res.status(404).json({ error: "Community not found" });
    const comment = await prisma.communityComment.findUnique({ where: { id: req.params.commentId } });
    if (!comment || comment.postId !== req.params.postId) return res.status(404).json({ error: "Comment not found" });

    const post = await prisma.post.findUnique({ where: { id: comment.postId } });
    if (!post || post.communityId !== community.id) return res.status(404).json({ error: "Comment not found" });

    const canModerate = comment.authorId === req.user!.userId || community.creatorId === req.user!.userId || req.user!.role === "ADMIN";
    if (!canModerate) return res.status(403).json({ error: "Not authorized to remove this comment." });

    await prisma.communityComment.delete({ where: { id: comment.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/communities/:id/posts/:postId/like - toggle a like on a post.
router.post("/:id/posts/:postId/like", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const community = await prisma.community.findUnique({ where: { id: req.params.id } });
    if (!community) return res.status(404).json({ error: "Community not found" });
    const post = await prisma.post.findUnique({ where: { id: req.params.postId } });
    if (!post || post.communityId !== community.id) return res.status(404).json({ error: "Post not found" });

    const membership = await prisma.communityMember.findUnique({ where: { communityId_userId: { communityId: community.id, userId: req.user!.userId } } });
    if (!membership && req.user!.role !== "ADMIN") return res.status(403).json({ error: "Join this community to react." });

    const existing = await prisma.communityPostLike.findUnique({ where: { postId_userId: { postId: post.id, userId: req.user!.userId } } });
    if (existing) {
      await prisma.communityPostLike.delete({ where: { id: existing.id } });
      const likesCount = await prisma.communityPostLike.count({ where: { postId: post.id } });
      return res.json({ liked: false, likesCount });
    }

    await prisma.communityPostLike.create({ data: { postId: post.id, userId: req.user!.userId } });
    const likesCount = await prisma.communityPostLike.count({ where: { postId: post.id } });
    res.json({ liked: true, likesCount });
  } catch (err) {
    next(err);
  }
});

// POST /api/communities/:id/posts/:postId/comments/:commentId/like - toggle a like on a comment.
router.post("/:id/posts/:postId/comments/:commentId/like", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const community = await prisma.community.findUnique({ where: { id: req.params.id } });
    if (!community) return res.status(404).json({ error: "Community not found" });
    const comment = await prisma.communityComment.findUnique({ where: { id: req.params.commentId } });
    if (!comment || comment.postId !== req.params.postId) return res.status(404).json({ error: "Comment not found" });
    const post = await prisma.post.findUnique({ where: { id: comment.postId } });
    if (!post || post.communityId !== community.id) return res.status(404).json({ error: "Comment not found" });

    const membership = await prisma.communityMember.findUnique({ where: { communityId_userId: { communityId: community.id, userId: req.user!.userId } } });
    if (!membership && req.user!.role !== "ADMIN") return res.status(403).json({ error: "Join this community to react." });

    const existing = await prisma.communityCommentLike.findUnique({ where: { commentId_userId: { commentId: comment.id, userId: req.user!.userId } } });
    if (existing) {
      await prisma.communityCommentLike.delete({ where: { id: existing.id } });
      const likesCount = await prisma.communityCommentLike.count({ where: { commentId: comment.id } });
      return res.json({ liked: false, likesCount });
    }

    await prisma.communityCommentLike.create({ data: { commentId: comment.id, userId: req.user!.userId } });
    const likesCount = await prisma.communityCommentLike.count({ where: { commentId: comment.id } });
    res.json({ liked: true, likesCount });
  } catch (err) {
    next(err);
  }
});

export default router;
