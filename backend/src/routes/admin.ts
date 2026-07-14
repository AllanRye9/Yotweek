import { Router } from "express";
import { prisma } from "../utils/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { sendEmail, emailTemplates } from "../utils/email";
import { logAdminAction } from "../utils/auditLog";

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
    logAdminAction({ adminId: req.user!.userId, action: "approve", targetType: "event", targetId: event.id, targetLabel: event.title });
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
    logAdminAction({ adminId: req.user!.userId, action: "reject", targetType: "event", targetId: event.id, targetLabel: event.title, details: event.rejectedReason || undefined });
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

router.post("/events/:id/hide", async (req: AuthRequest, res, next) => {
  try {
    const event = await prisma.event.update({ where: { id: req.params.id }, data: { status: "HIDDEN" } });
    logAdminAction({ adminId: req.user!.userId, action: "hide", targetType: "event", targetId: event.id, targetLabel: event.title });
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
router.put("/events/:id", async (req: AuthRequest, res, next) => {
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
    logAdminAction({ adminId: req.user!.userId, action: "edit", targetType: "event", targetId: event.id, targetLabel: event.title });
    res.json({ event });
  } catch (err) {
    next(err);
  }
});

router.delete("/events/:id", async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.event.findUnique({ where: { id: req.params.id }, select: { title: true } });
    await prisma.event.delete({ where: { id: req.params.id } });
    logAdminAction({ adminId: req.user!.userId, action: "delete", targetType: "event", targetId: req.params.id, targetLabel: existing?.title });
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
router.post("/users/:id/verify", async (req: AuthRequest, res, next) => {
  try {
    const { verified } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isVerifiedOrganizer: Boolean(verified) },
    });
    logAdminAction({ adminId: req.user!.userId, action: verified ? "verify" : "unverify", targetType: "user", targetId: user.id, targetLabel: user.name });
    res.json({ user: { id: user.id, name: user.name, isVerifiedOrganizer: user.isVerifiedOrganizer } });
  } catch (err) {
    next(err);
  }
});

const ASSIGNABLE_ROLES = ["USER", "AGENT", "COMPANY", "ORGANIZATION", "ADMIN"];
router.put("/users/:id/role", async (req: AuthRequest, res, next) => {
  try {
    const { role } = req.body;
    if (!ASSIGNABLE_ROLES.includes(role)) return res.status(400).json({ error: "Invalid role" });
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { role } });
    logAdminAction({ adminId: req.user!.userId, action: "change_role", targetType: "user", targetId: user.id, targetLabel: user.name, details: `→ ${role}` });
    res.json({ user: { id: user.id, role: user.role } });
  } catch (err) {
    next(err);
  }
});

router.post("/users/:id/suspend", async (req: AuthRequest, res, next) => {
  try {
    const { suspended } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isSuspended: Boolean(suspended) },
    });
    logAdminAction({ adminId: req.user!.userId, action: suspended ? "suspend" : "unsuspend", targetType: "user", targetId: user.id, targetLabel: user.name });
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
    const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { role: true, name: true } });
    if (!target) return res.status(404).json({ error: "User not found." });
    if (target.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) return res.status(400).json({ error: "Can't delete the last remaining admin." });
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    logAdminAction({ adminId: req.user!.userId, action: "delete", targetType: "user", targetId: req.params.id, targetLabel: target.name });
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

// ─── Community moderation & admin authority ──────────────────────────────
// Mirrors the events/businesses review-queue pattern: pending queue,
// flagged-equivalent (none yet - communities don't have a report flow),
// full searchable list, edit, feature, delete.

router.get("/communities/pending", async (_req, res, next) => {
  try {
    const communities = await prisma.community.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { creator: { select: { id: true, name: true, email: true, organizationName: true, isVerifiedOrganizer: true } } },
    });
    res.json({ communities });
  } catch (err) {
    next(err);
  }
});

router.get("/communities/all", async (req, res, next) => {
  try {
    const { q, status } = req.query as { q?: string; status?: string };
    const communities = await prisma.community.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { id: true, name: true, email: true, organizationName: true } },
        _count: { select: { members: true, events: true, businesses: true, posts: true } },
      },
      take: 100,
    });
    res.json({ communities });
  } catch (err) {
    next(err);
  }
});

router.post("/communities/:id/approve", async (req, res, next) => {
  try {
    const community = await prisma.community.update({ where: { id: req.params.id }, data: { status: "APPROVED", rejectedReason: null } });
    res.json({ community });
  } catch (err) {
    next(err);
  }
});

router.post("/communities/:id/reject", async (req, res, next) => {
  try {
    const { reason } = req.body;
    const community = await prisma.community.update({ where: { id: req.params.id }, data: { status: "REJECTED", rejectedReason: reason || null } });
    res.json({ community });
  } catch (err) {
    next(err);
  }
});

router.post("/communities/:id/hide", async (req, res, next) => {
  try {
    const community = await prisma.community.update({ where: { id: req.params.id }, data: { status: "HIDDEN" } });
    res.json({ community });
  } catch (err) {
    next(err);
  }
});

router.put("/communities/:id", async (req, res, next) => {
  try {
    const { name, description, isFeatured } = req.body;
    const community = await prisma.community.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(isFeatured !== undefined ? { isFeatured } : {}),
      },
    });
    res.json({ community });
  } catch (err) {
    next(err);
  }
});

router.delete("/communities/:id", async (req, res, next) => {
  try {
    await prisma.$transaction([
      prisma.event.updateMany({ where: { communityId: req.params.id }, data: { communityId: null } }),
      prisma.business.updateMany({ where: { communityId: req.params.id }, data: { communityId: null } }),
      prisma.community.delete({ where: { id: req.params.id } }),
    ]);
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
    logAdminAction({ adminId: req.user!.userId, action: "approve", targetType: "business", targetId: business.id, targetLabel: business.name });
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
    logAdminAction({ adminId: req.user!.userId, action: "reject", targetType: "business", targetId: business.id, targetLabel: business.name, details: business.rejectedReason || undefined });
    res.json({ business });
  } catch (err) {
    next(err);
  }
});

router.post("/businesses/:id/hide", async (req: AuthRequest, res, next) => {
  try {
    const business = await prisma.business.update({ where: { id: req.params.id }, data: { status: "HIDDEN" } });
    logAdminAction({ adminId: req.user!.userId, action: "hide", targetType: "business", targetId: business.id, targetLabel: business.name });
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
router.put("/businesses/:id", async (req: AuthRequest, res, next) => {
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
    logAdminAction({ adminId: req.user!.userId, action: "edit", targetType: "business", targetId: business.id, targetLabel: business.name });
    res.json({ business });
  } catch (err) {
    next(err);
  }
});

router.delete("/businesses/:id", async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.business.findUnique({ where: { id: req.params.id }, select: { name: true } });
    await prisma.business.delete({ where: { id: req.params.id } });
    logAdminAction({ adminId: req.user!.userId, action: "delete", targetType: "business", targetId: req.params.id, targetLabel: existing?.name });
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
      pendingCommunities, totalCommunities, totalPosts,
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
      prisma.community.count({ where: { status: "PENDING" } }),
      prisma.community.count(),
      prisma.post.count(),
    ]);
    res.json({
      pendingEvents, flaggedEvents, pendingReports, totalUsers, totalEvents,
      pendingBusinesses, flaggedBusinesses, totalBusinesses,
      pendingReviews, pendingBusinessReviews, pendingTestimonials,
      pendingCommunities, totalCommunities, totalPosts,
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
// Full edit/delete access for any post on the platform, not just a
// spot-review queue — every mutating action here is written to the audit
// trail (AdminActionLog) with the admin's id and a timestamp.

// GET /api/admin/posts - searchable list across every status, for the
// admin's general post-management view.
router.get("/posts", async (req, res, next) => {
  try {
    const { q, status } = req.query as { q?: string; status?: string };
    const posts = await prisma.post.findMany({
      where: {
        ...(status ? { status: status as any } : {}),
        ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { author: { select: { id: true, name: true, email: true } } },
    });
    res.json({ posts });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/posts/:id - edit any field an author could set, plus
// status (so an admin can also publish/unpublish/archive from here).
router.put("/posts/:id", async (req: AuthRequest, res, next) => {
  try {
    const { title, excerpt, body, coverImageUrl, tags, status } = req.body;
    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(excerpt !== undefined ? { excerpt } : {}),
        ...(body !== undefined ? { body } : {}),
        ...(coverImageUrl !== undefined ? { coverImageUrl } : {}),
        ...(tags !== undefined ? { tags } : {}),
        ...(status !== undefined ? { status } : {}),
      },
    });
    logAdminAction({ adminId: req.user!.userId, action: "edit", targetType: "post", targetId: post.id, targetLabel: post.title });
    res.json({ post });
  } catch (err) {
    next(err);
  }
});

router.post("/posts/:id/unpublish", async (req: AuthRequest, res, next) => {
  try {
    const post = await prisma.post.update({ where: { id: req.params.id }, data: { status: "ARCHIVED" } });
    logAdminAction({ adminId: req.user!.userId, action: "unpublish", targetType: "post", targetId: post.id, targetLabel: post.title });
    res.json({ post });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/posts/:id - permanent removal, with confirmation
// expected client-side before this is ever called.
router.delete("/posts/:id", async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.post.findUnique({ where: { id: req.params.id }, select: { title: true } });
    if (!existing) return res.status(404).json({ error: "Post not found." });
    await prisma.post.delete({ where: { id: req.params.id } });
    logAdminAction({ adminId: req.user!.userId, action: "delete", targetType: "post", targetId: req.params.id, targetLabel: existing.title });
    res.status(204).send();
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

// ─── Traffic analytics ────────────────────────────────────────────────
// Distinct from GET /analytics above (which powers the dashboard's
// signups/bookings/revenue overview) — this is visit-level traffic:
// geography, device mix, and peak hours. Built entirely on VisitorLog
// (hashed IP + day + country + device category) and the content tables'
// own createdAt fields. Deliberately never surfaces a raw IP address to
// the admin UI — the hashed value is enough to dedupe/spot abuse
// patterns, and displaying real IPs would turn this dashboard into a
// store of personal data (IP is treated as PII under GDPR and similar
// laws) for very little actual analytical benefit over what's already
// shown. If genuine abuse investigation ever needs the real IP, that's a
// server-log lookup, not an admin-panel feature.

router.get("/analytics/traffic", async (req, res, next) => {
  try {
    const days = Math.min(parseInt((req.query.days as string) || "30", 10), 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [visits, eventsCreated, businessesCreated, communitiesCreated, totalUsers] = await Promise.all([
      prisma.visitorLog.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, day: true, country: true, deviceType: true } }),
      prisma.event.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.business.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.community.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.user.count(),
    ]);

    // Daily visits series
    const dayBuckets = new Map<string, number>();
    for (const v of visits) {
      const key = v.day.toISOString().slice(0, 10);
      dayBuckets.set(key, (dayBuckets.get(key) || 0) + 1);
    }
    const dailyVisits = Array.from(dayBuckets.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));

    // Country breakdown
    const countryBuckets = new Map<string, number>();
    for (const v of visits) {
      const key = v.country || "Unknown";
      countryBuckets.set(key, (countryBuckets.get(key) || 0) + 1);
    }
    const countries = Array.from(countryBuckets.entries()).sort(([, a], [, b]) => b - a).map(([country, count]) => ({ country, count }));

    // Device breakdown
    const deviceBuckets = new Map<string, number>();
    for (const v of visits) {
      const key = v.deviceType || "desktop";
      deviceBuckets.set(key, (deviceBuckets.get(key) || 0) + 1);
    }
    const devices = Array.from(deviceBuckets.entries()).map(([device, count]) => ({ device, count }));

    // Peak hour-of-day (0-23), using each visit's exact createdAt timestamp
    const hourBuckets = new Array(24).fill(0);
    for (const v of visits) hourBuckets[v.createdAt.getHours()]++;
    const peakHours = hourBuckets.map((count, hour) => ({ hour, count }));

    // Content creation activity per day, for the same window
    function toDailySeries(rows: { createdAt: Date }[]) {
      const buckets = new Map<string, number>();
      for (const r of rows) {
        const key = r.createdAt.toISOString().slice(0, 10);
        buckets.set(key, (buckets.get(key) || 0) + 1);
      }
      return Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
    }

    res.json({
      windowDays: days,
      totalVisits: visits.length,
      totalUsers,
      dailyVisits,
      countries,
      devices,
      peakHours,
      contentActivity: {
        events: toDailySeries(eventsCreated),
        businesses: toDailySeries(businessesCreated),
        communities: toDailySeries(communitiesCreated),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/analytics/traffic/export - CSV of daily visit counts +
// country breakdown for the same window, for offline analysis or
// record-keeping.
router.get("/analytics/traffic/export", async (req, res, next) => {
  try {
    const days = Math.min(parseInt((req.query.days as string) || "30", 10), 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const visits = await prisma.visitorLog.findMany({ where: { createdAt: { gte: since } }, select: { day: true, country: true, deviceType: true } });

    const rows = [["date", "country", "device"].join(",")];
    for (const v of visits) {
      rows.push([v.day.toISOString().slice(0, 10), v.country || "Unknown", v.deviceType || "desktop"].join(","));
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="yotweek-analytics-${days}d.csv"`);
    res.send(rows.join("\n"));
  } catch (err) {
    next(err);
  }
});

// ─── Admin activity log ──────────────────────────────────────────────
// GET /api/admin/activity-log - the audit trail written by logAdminAction
// across every moderation route. Filterable by admin, action, target type,
// and date range.
router.get("/activity-log", async (req, res, next) => {
  try {
    const { adminId, action, targetType, since, page = "1", pageSize = "50" } = req.query as Record<string, string>;
    const where: any = {};
    if (adminId) where.adminId = adminId;
    if (action) where.action = action;
    if (targetType) where.targetType = targetType;
    if (since) where.createdAt = { gte: new Date(since) };

    const take = Math.min(parseInt(pageSize, 10) || 50, 200);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const [logs, total] = await Promise.all([
      prisma.adminActionLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { admin: { select: { id: true, name: true } } },
        skip,
        take,
      }),
      prisma.adminActionLog.count({ where }),
    ]);

    res.json({ logs, total });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/activity-log/export - CSV of the (optionally filtered)
// audit trail.
router.get("/activity-log/export", async (req, res, next) => {
  try {
    const { adminId, action, targetType, since } = req.query as Record<string, string>;
    const where: any = {};
    if (adminId) where.adminId = adminId;
    if (action) where.action = action;
    if (targetType) where.targetType = targetType;
    if (since) where.createdAt = { gte: new Date(since) };

    const logs = await prisma.adminActionLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { admin: { select: { name: true } } },
      take: 5000,
    });

    const rows = [["timestamp", "admin", "action", "targetType", "targetId", "targetLabel", "details"].join(",")];
    for (const l of logs) {
      const esc = (s: string) => `"${(s || "").replace(/"/g, '""')}"`;
      rows.push([l.createdAt.toISOString(), esc(l.admin.name), l.action, l.targetType, l.targetId, esc(l.targetLabel || ""), esc(l.details || "")].join(","));
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="yotweek-activity-log.csv"`);
    res.send(rows.join("\n"));
  } catch (err) {
    next(err);
  }
});

export default router;
