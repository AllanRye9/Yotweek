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

// GET /api/admin/events/all - full listing management view (not just the
// pending/flagged review queues above), so the admin can edit, feature, or
// remove any event regardless of status.
router.get("/events/all", async (req, res, next) => {
  try {
    const { q, status } = req.query as { q?: string; status?: string };
    const events = await prisma.event.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      include: { organizer: { select: { id: true, name: true, email: true, organizationName: true } } },
      take: 100,
    });
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/events/:id - edit core listing fields and/or toggle the
// homepage "featured" flag. Separate from /approve /reject /hide above,
// which only ever change `status`.
router.put("/events/:id", async (req, res, next) => {
  try {
    const { title, description, category, price, capacity, isFeatured } = req.body;
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(price !== undefined ? { price } : {}),
        ...(capacity !== undefined ? { capacity } : {}),
        ...(isFeatured !== undefined ? { isFeatured: Boolean(isFeatured) } : {}),
      },
    });
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

router.delete("/events/:id", async (req, res, next) => {
  try {
    await prisma.event.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err: any) {
    if (err?.code === "P2003" || err?.code === "P2014") {
      return res.status(409).json({ error: "This event has bookings/reviews attached and can't be hard-deleted. Use Hide instead." });
    }
    next(err);
  }
});

// GET /api/admin/users - list/search all users for the admin's user
// management page (verify organizers, suspend accounts, etc).
router.get("/users", async (req, res, next) => {
  try {
    const { q, role } = req.query as { q?: string; role?: string };
    const users = await prisma.user.findMany({
      where: {
        ...(role ? { role: role as any } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { organizationName: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, role: true, organizationName: true,
        country: true, city: true, isVerifiedOrganizer: true, isSuspended: true, createdAt: true,
      },
    });
    res.json({ users });
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

const ASSIGNABLE_ROLES = ["USER", "AGENT", "COMPANY", "ORGANIZATION", "ADMIN"];
router.put("/users/:id/role", async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!ASSIGNABLE_ROLES.includes(role)) return res.status(400).json({ error: "Invalid role" });
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { role } });
    res.json({ user: { id: user.id, role: user.role } });
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

// DELETE /api/admin/users/:id - permanently remove a user. Guards against
// self-deletion and removing the last remaining admin. If the user still
// owns content (events, businesses, bookings, reviews, ...) the DB's
// foreign-key constraints will reject the delete rather than silently
// cascading — in that case we surface a clear message pointing at suspend
// as the safer alternative, instead of a raw Postgres error.
router.delete("/users/:id", async (req: AuthRequest, res, next) => {
  try {
    if (req.params.id === req.user!.userId) {
      return res.status(400).json({ error: "You can't delete your own account." });
    }
    const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { role: true } });
    if (!target) return res.status(404).json({ error: "User not found." });
    if (target.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) return res.status(400).json({ error: "Can't delete the last remaining admin." });
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err: any) {
    if (err?.code === "P2003" || err?.code === "P2014") {
      return res.status(409).json({
        error: "This user still owns listings, bookings, or reviews and can't be deleted outright. Suspend the account instead, or reassign/remove their content first.",
      });
    }
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

router.put("/reviews/:id", async (req, res, next) => {
  try {
    const { status } = req.body;
    const review = await prisma.review.update({ where: { id: req.params.id }, data: { status } });
    res.json({ review });
  } catch (err) {
    next(err);
  }
});

router.delete("/reviews/:id", async (req, res, next) => {
  try {
    await prisma.review.delete({ where: { id: req.params.id } });
    res.status(204).send();
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

// GET /api/admin/businesses/all - full searchable directory for the admin's
// "All businesses" management view, mirroring /events/all.
router.get("/businesses/all", async (req, res, next) => {
  try {
    const { q, status } = req.query as { q?: string; status?: string };
    const businesses = await prisma.business.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { id: true, name: true, email: true, organizationName: true } } },
      take: 100,
    });
    res.json({ businesses });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/businesses/:id - edit core listing fields, separate from
// /approve /reject /hide above which only ever change `status`.
router.put("/businesses/:id", async (req, res, next) => {
  try {
    const { name, description, priceRange } = req.body;
    const business = await prisma.business.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(priceRange !== undefined ? { priceRange } : {}),
      },
    });
    res.json({ business });
  } catch (err) {
    next(err);
  }
});

router.delete("/businesses/:id", async (req, res, next) => {
  try {
    await prisma.business.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err: any) {
    if (err?.code === "P2003" || err?.code === "P2014") {
      return res.status(409).json({ error: "This business has reviews/bookings attached and can't be hard-deleted. Use Hide instead." });
    }
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

router.put("/business-reviews/:id", async (req, res, next) => {
  try {
    const { status } = req.body;
    const review = await prisma.businessReview.update({ where: { id: req.params.id }, data: { status } });
    res.json({ review });
  } catch (err) {
    next(err);
  }
});

router.delete("/business-reviews/:id", async (req, res, next) => {
  try {
    await prisma.businessReview.delete({ where: { id: req.params.id } });
    res.status(204).send();
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

// GET /api/admin/analytics - lightweight platform analytics for the admin
// overview dashboard: signups & bookings trend (last 30 days), category
// mix, and top-performing listings. Bucketed in JS rather than raw SQL so
// this stays portable across whatever Postgres version is running.
router.get("/analytics", async (_req, res, next) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [signups, bookings, categoryCounts, topEvents, topBusinesses, payments, totalBookings, totalReviews] = await Promise.all([
      prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.booking.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, totalAmount: true } }),
      prisma.event.groupBy({ by: ["category"], _count: { _all: true } }),
      prisma.event.findMany({ orderBy: { viewCount: "desc" }, take: 5, select: { id: true, title: true, viewCount: true, ticketsSold: true } }),
      prisma.business.findMany({ orderBy: { viewCount: "desc" }, take: 5, select: { id: true, name: true, viewCount: true } }),
      prisma.payment.findMany({ where: { paidAt: { gte: since } }, select: { paidAt: true, commissionAmount: true } }),
      prisma.booking.count(),
      prisma.review.count(),
    ]);

    const bucket = (rows: { createdAt: Date }[]) => {
      const days: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        days[d.toISOString().slice(0, 10)] = 0;
      }
      rows.forEach(r => {
        const key = r.createdAt.toISOString().slice(0, 10);
        if (key in days) days[key] += 1;
      });
      return Object.entries(days).map(([date, count]) => ({ date, count }));
    };

    const revenueByDay: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      revenueByDay[d.toISOString().slice(0, 10)] = 0;
    }
    payments.forEach(p => {
      if (!p.paidAt) return;
      const key = p.paidAt.toISOString().slice(0, 10);
      if (key in revenueByDay) revenueByDay[key] += Number(p.commissionAmount);
    });

    res.json({
      signupsTrend: bucket(signups),
      bookingsTrend: bucket(bookings),
      revenueTrend: Object.entries(revenueByDay).map(([date, amount]) => ({ date, amount })),
      categoryMix: categoryCounts.map(c => ({ category: c.category, count: c._count._all })),
      topEvents, topBusinesses,
      totalBookings, totalReviews,
      newSignupsLast30d: signups.length,
      newBookingsLast30d: bookings.length,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/overview", async (_req, res, next) => {
  try {
    const [
      pendingEvents, flaggedEvents, pendingReports, totalUsers, totalEvents,
      pendingBusinesses, flaggedBusinesses, totalBusinesses,
      pendingReviews, pendingBusinessReviews, pendingTestimonials,
    ] = await Promise.all([
      prisma.event.count({ where: { status: "PENDING" } }),
      prisma.event.count({ where: { OR: [{ isFlagged: true }, { reportCount: { gt: 0 } }] } }),
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.user.count(),
      prisma.event.count(),
      prisma.business.count({ where: { status: "PENDING" } }),
      prisma.business.count({ where: { OR: [{ isFlagged: true }, { reportCount: { gt: 0 } }] } }),
      prisma.business.count(),
      prisma.review.count({ where: { status: "PENDING" } }),
      prisma.businessReview.count({ where: { status: "PENDING" } }),
      prisma.testimonial.count({ where: { status: "PENDING" } }),
    ]);
    res.json({
      pendingEvents, flaggedEvents, pendingReports, totalUsers, totalEvents,
      pendingBusinesses, flaggedBusinesses, totalBusinesses,
      pendingReviews, pendingBusinessReviews, pendingTestimonials,
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

// ─── Homepage event videos (past/upcoming events slider) ─────────────────
// Submission (POST /api/event-videos) lives outside this admin-only router
// since verified organizers, not just admins, are allowed to submit; these
// routes cover the admin review/approval queue and full management.

router.get("/event-videos", async (_req, res, next) => {
  try {
    const videos = await prisma.eventVideo.findMany({
      orderBy: [{ status: "asc" }, { sortOrder: "asc" }],
      include: { uploader: { select: { id: true, name: true, email: true, role: true, isVerifiedOrganizer: true } } },
    });
    res.json({ videos });
  } catch (err) {
    next(err);
  }
});

router.put("/event-videos/:id", async (req, res, next) => {
  try {
    const { title, caption, videoUrl, thumbnailUrl, timing, eventId, status, sortOrder, isActive } = req.body;
    const video = await prisma.eventVideo.update({
      where: { id: req.params.id },
      data: { title, caption, videoUrl, thumbnailUrl, timing, eventId, status, sortOrder, isActive },
    });
    res.json({ video });
  } catch (err) {
    next(err);
  }
});

router.delete("/event-videos/:id", async (req, res, next) => {
  try {
    await prisma.eventVideo.delete({ where: { id: req.params.id } });
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

// ─── Site-wide settings ───────────────────────────────────────────────
// Singleton row, created on first read if it doesn't exist yet.

router.get("/settings", async (_req, res, next) => {
  try {
    const settings = await prisma.platformSetting.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

router.put("/settings", async (req: AuthRequest, res, next) => {
  try {
    const {
      siteName, supportEmail, maintenanceMode, announcementBanner,
      requireEventApproval, requireBusinessApproval, defaultCommissionPct, autoApproveVerified,
    } = req.body;
    const settings = await prisma.platformSetting.upsert({
      where: { id: "singleton" },
      update: {
        ...(siteName !== undefined ? { siteName } : {}),
        ...(supportEmail !== undefined ? { supportEmail } : {}),
        ...(maintenanceMode !== undefined ? { maintenanceMode: Boolean(maintenanceMode) } : {}),
        ...(announcementBanner !== undefined ? { announcementBanner } : {}),
        ...(requireEventApproval !== undefined ? { requireEventApproval: Boolean(requireEventApproval) } : {}),
        ...(requireBusinessApproval !== undefined ? { requireBusinessApproval: Boolean(requireBusinessApproval) } : {}),
        ...(defaultCommissionPct !== undefined ? { defaultCommissionPct: Number(defaultCommissionPct) } : {}),
        ...(autoApproveVerified !== undefined ? { autoApproveVerified: Boolean(autoApproveVerified) } : {}),
        updatedBy: req.user!.userId,
      },
      create: { id: "singleton", updatedBy: req.user!.userId },
    });
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

export default router;
