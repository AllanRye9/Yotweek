import { Router } from "express";
import { prisma } from "../utils/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { sendEmail, emailTemplates } from "../utils/email";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

// Queue of listings awaiting review, flagged items surfaced first.
router.get("/events/pending", async (_req, res, next) => {
  try {
    const events = await prisma.event.findMany({
      where: { status: "PENDING" },
      orderBy: [{ isFlagged: "desc" }, { createdAt: "asc" }],
      include: { organizer: { select: { id: true, name: true, email: true, organizationName: true, role: true, isVerifiedOrganizer: true } } },
    });
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

router.get("/events/flagged", async (_req, res, next) => {
  try {
    const events = await prisma.event.findMany({
      where: { OR: [{ isFlagged: true }, { reportCount: { gt: 0 } }] },
      orderBy: { reportCount: "desc" },
      include: { organizer: { select: { id: true, name: true, email: true } } },
    });
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

router.post("/events/:id/approve", async (req: AuthRequest, res, next) => {
  try {
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: { status: "APPROVED", approvedAt: new Date(), approvedBy: req.user!.userId, isFlagged: false },
      include: { organizer: { select: { email: true } } },
    });
    await prisma.notification.create({
      data: {
        userId: event.organizerId,
        type: "LISTING_APPROVED",
        message: `Your listing "${event.title}" has been approved and is now live.`,
      },
    });
    sendEmail({ to: event.organizer.email, ...emailTemplates.listingApproved(event.title) }).catch(() => {});
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

router.post("/events/:id/reject", async (req: AuthRequest, res, next) => {
  try {
    const { reason } = req.body;
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: { status: "REJECTED", rejectedReason: reason || "Did not meet listing guidelines" },
      include: { organizer: { select: { email: true } } },
    });
    await prisma.notification.create({
      data: {
        userId: event.organizerId,
        type: "LISTING_REJECTED",
        message: `Your listing "${event.title}" was rejected: ${event.rejectedReason}`,
      },
    });
    sendEmail({
      to: event.organizer.email,
      ...emailTemplates.listingRejected(event.title, event.rejectedReason || "Did not meet listing guidelines"),
    }).catch(() => {});
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

router.post("/events/:id/hide", async (req, res, next) => {
  try {
    const event = await prisma.event.update({ where: { id: req.params.id }, data: { status: "HIDDEN" } });
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

// Grant/revoke the "verified organizer" trust badge.
router.post("/users/:id/verify", async (req, res, next) => {
  try {
    const { verified } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isVerifiedOrganizer: Boolean(verified) },
    });
    res.json({ user: { id: user.id, name: user.name, isVerifiedOrganizer: user.isVerifiedOrganizer } });
  } catch (err) {
    next(err);
  }
});

router.post("/users/:id/suspend", async (req, res, next) => {
  try {
    const { suspended } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isSuspended: Boolean(suspended) },
    });
    res.json({ user: { id: user.id, isSuspended: user.isSuspended } });
  } catch (err) {
    next(err);
  }
});

router.get("/reviews/pending", async (_req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { name: true } }, event: { select: { title: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
});

// ─── Business directory moderation (mirrors the event queue above) ──────

router.get("/businesses/pending", async (_req, res, next) => {
  try {
    const businesses = await prisma.business.findMany({
      where: { status: "PENDING" },
      orderBy: [{ isFlagged: "desc" }, { createdAt: "asc" }],
      include: {
        category: { select: { name: true, slug: true } },
        owner: { select: { id: true, name: true, email: true, organizationName: true, role: true, isVerifiedOrganizer: true } },
      },
    });
    res.json({ businesses });
  } catch (err) {
    next(err);
  }
});

router.get("/businesses/flagged", async (_req, res, next) => {
  try {
    const businesses = await prisma.business.findMany({
      where: { OR: [{ isFlagged: true }, { reportCount: { gt: 0 } }] },
      orderBy: { reportCount: "desc" },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    res.json({ businesses });
  } catch (err) {
    next(err);
  }
});

router.post("/businesses/:id/approve", async (req: AuthRequest, res, next) => {
  try {
    const business = await prisma.business.update({
      where: { id: req.params.id },
      data: { status: "APPROVED", approvedAt: new Date(), approvedBy: req.user!.userId, isFlagged: false },
      include: { owner: { select: { email: true } } },
    });
    await prisma.notification.create({
      data: {
        userId: business.ownerId,
        type: "LISTING_APPROVED",
        message: `Your listing "${business.name}" has been approved and is now live.`,
      },
    });
    sendEmail({ to: business.owner.email, ...emailTemplates.listingApproved(business.name) }).catch(() => {});
    res.json({ business });
  } catch (err) {
    next(err);
  }
});

router.post("/businesses/:id/reject", async (req: AuthRequest, res, next) => {
  try {
    const { reason } = req.body;
    const business = await prisma.business.update({
      where: { id: req.params.id },
      data: { status: "REJECTED", rejectedReason: reason || "Did not meet listing guidelines" },
      include: { owner: { select: { email: true } } },
    });
    await prisma.notification.create({
      data: {
        userId: business.ownerId,
        type: "LISTING_REJECTED",
        message: `Your listing "${business.name}" was rejected: ${business.rejectedReason}`,
      },
    });
    sendEmail({
      to: business.owner.email,
      ...emailTemplates.listingRejected(business.name, business.rejectedReason || "Did not meet listing guidelines"),
    }).catch(() => {});
    res.json({ business });
  } catch (err) {
    next(err);
  }
});

router.post("/businesses/:id/hide", async (req, res, next) => {
  try {
    const business = await prisma.business.update({ where: { id: req.params.id }, data: { status: "HIDDEN" } });
    res.json({ business });
  } catch (err) {
    next(err);
  }
});

router.get("/business-reviews/pending", async (_req, res, next) => {
  try {
    const reviews = await prisma.businessReview.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { name: true } }, business: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
});

// ─── Category taxonomy management ────────────────────────────────────────

router.post("/categories", async (req, res, next) => {
  try {
    const { name, slug, icon, parentId, sortOrder } = req.body;
    if (!name || !slug) return res.status(400).json({ error: "name and slug are required" });
    const category = await prisma.category.create({
      data: { name, slug, icon, parentId: parentId || null, sortOrder: sortOrder ?? 0 },
    });
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
});

router.put("/categories/:id", async (req, res, next) => {
  try {
    const { name, slug, icon, parentId, sortOrder } = req.body;
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { name, slug, icon, parentId: parentId ?? undefined, sortOrder },
    });
    res.json({ category });
  } catch (err) {
    next(err);
  }
});

router.delete("/categories/:id", async (req, res, next) => {
  try {
    const businessCount = await prisma.business.count({ where: { categoryId: req.params.id } });
    const childCount = await prisma.category.count({ where: { parentId: req.params.id } });
    if (businessCount > 0 || childCount > 0) {
      return res.status(409).json({
        error: "Cannot delete a category that still has businesses or subcategories. Reassign them first.",
      });
    }
    await prisma.category.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/overview", async (_req, res, next) => {
  try {
    const [
      pendingEvents, flaggedEvents, pendingReports, totalUsers, totalEvents,
      pendingBusinesses, flaggedBusinesses, totalBusinesses,
    ] = await Promise.all([
      prisma.event.count({ where: { status: "PENDING" } }),
      prisma.event.count({ where: { OR: [{ isFlagged: true }, { reportCount: { gt: 0 } }] } }),
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.user.count(),
      prisma.event.count(),
      prisma.business.count({ where: { status: "PENDING" } }),
      prisma.business.count({ where: { OR: [{ isFlagged: true }, { reportCount: { gt: 0 } }] } }),
      prisma.business.count(),
    ]);
    res.json({
      pendingEvents, flaggedEvents, pendingReports, totalUsers, totalEvents,
      pendingBusinesses, flaggedBusinesses, totalBusinesses,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/promotions/send - one-off promotional email blast.
// Sends synchronously in small batches; for large user bases this should
// move to a queue, but this keeps the platform's notification story
// complete without adding new infrastructure dependencies.
router.post("/promotions/send", async (req, res, next) => {
  try {
    const { subject, bodyHtml, role } = req.body as { subject: string; bodyHtml: string; role?: string };
    if (!subject || !bodyHtml) return res.status(400).json({ error: "subject and bodyHtml are required" });

    const recipients = await prisma.user.findMany({
      where: { isSuspended: false, ...(role ? { role: role as any } : {}) },
      select: { email: true },
    });

    const tpl = emailTemplates.promotional(subject, bodyHtml);
    const BATCH_SIZE = 25;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map((r) => sendEmail({ to: r.email, ...tpl }).catch(() => {})));
    }

    res.json({ message: `Queued promotional email to ${recipients.length} recipients` });
  } catch (err) {
    next(err);
  }
});

// ─── Testimonials ─────────────────────────────────────────────────────

router.get("/testimonials/pending", async (_req, res, next) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json({ testimonials });
  } catch (err) {
    next(err);
  }
});

router.post("/testimonials/:id/approve", async (req, res, next) => {
  try {
    const { isFeatured } = req.body;
    const testimonial = await prisma.testimonial.update({
      where: { id: req.params.id },
      data: { status: "APPROVED", isFeatured: Boolean(isFeatured) },
    });
    res.json({ testimonial });
  } catch (err) {
    next(err);
  }
});

router.post("/testimonials/:id/reject", async (req, res, next) => {
  try {
    const testimonial = await prisma.testimonial.update({
      where: { id: req.params.id },
      data: { status: "REJECTED" },
    });
    res.json({ testimonial });
  } catch (err) {
    next(err);
  }
});

// ─── Homepage highlights (image/video slider) ────────────────────────────

router.get("/highlights", async (_req, res, next) => {
  try {
    const highlights = await prisma.highlight.findMany({ orderBy: { sortOrder: "asc" } });
    res.json({ highlights });
  } catch (err) {
    next(err);
  }
});

router.post("/highlights", async (req, res, next) => {
  try {
    const { title, subtitle, mediaUrl, mediaType, linkUrl, sortOrder } = req.body;
    if (!title || !mediaUrl) return res.status(400).json({ error: "title and mediaUrl are required" });
    const highlight = await prisma.highlight.create({
      data: { title, subtitle, mediaUrl, mediaType: mediaType || "IMAGE", linkUrl, sortOrder: sortOrder ?? 0 },
    });
    res.status(201).json({ highlight });
  } catch (err) {
    next(err);
  }
});

router.put("/highlights/:id", async (req, res, next) => {
  try {
    const { title, subtitle, mediaUrl, mediaType, linkUrl, sortOrder, isActive } = req.body;
    const highlight = await prisma.highlight.update({
      where: { id: req.params.id },
      data: { title, subtitle, mediaUrl, mediaType, linkUrl, sortOrder, isActive },
    });
    res.json({ highlight });
  } catch (err) {
    next(err);
  }
});

router.delete("/highlights/:id", async (req, res, next) => {
  try {
    await prisma.highlight.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ─── Content moderation (PAAS posts) ─────────────────────────────────────

router.get("/posts/flagged", async (_req, res, next) => {
  try {
    // Posts don't have their own report/flag pipeline yet, so this
    // surfaces recently published posts for spot review.
    const posts = await prisma.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { author: { select: { name: true, email: true } } },
    });
    res.json({ posts });
  } catch (err) {
    next(err);
  }
});

router.post("/posts/:id/unpublish", async (req, res, next) => {
  try {
    const post = await prisma.post.update({ where: { id: req.params.id }, data: { status: "ARCHIVED" } });
    res.json({ post });
  } catch (err) {
    next(err);
  }
});

export default router;
