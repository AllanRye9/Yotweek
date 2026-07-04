import { Router, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../utils/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();

const AUTO_HIDE_THRESHOLD = 5; // reports before a listing is auto-hidden pending review

router.post(
  "/",
  requireAuth,
  [
    body("eventId").notEmpty(),
    body("reason").isIn(["SPAM", "DUPLICATE", "SCAM_OR_FRAUD", "MISLEADING_INFO", "INAPPROPRIATE", "OTHER"]),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { eventId, reason, details } = req.body;
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) return res.status(404).json({ error: "Event not found" });

      const report = await prisma.report.create({
        data: { eventId, reporterId: req.user!.userId, reason, details },
      });

      const updated = await prisma.event.update({
        where: { id: eventId },
        data: { reportCount: { increment: 1 } },
      });

      if (updated.reportCount >= AUTO_HIDE_THRESHOLD && updated.status === "APPROVED") {
        await prisma.event.update({ where: { id: eventId }, data: { status: "HIDDEN", isFlagged: true } });
      }

      res.status(201).json({ report, message: "Thanks for the report — our team will review it." });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const status = (req.query.status as string) || "PENDING";
    const reports = await prisma.report.findMany({
      where: { status: status as any },
      include: {
        event: { select: { id: true, title: true, status: true, reportCount: true } },
        reporter: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ reports });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/resolve", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const { action } = req.body; // "dismiss" | "hide_event"
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: { status: action === "hide_event" ? "ACTIONED" : "DISMISSED", resolvedAt: new Date() },
    });
    if (action === "hide_event") {
      await prisma.event.update({ where: { id: report.eventId }, data: { status: "HIDDEN" } });
    }
    res.json({ report });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/business",
  requireAuth,
  [
    body("businessId").notEmpty(),
    body("reason").isIn(["SPAM", "DUPLICATE", "SCAM_OR_FRAUD", "MISLEADING_INFO", "INAPPROPRIATE", "OTHER"]),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { businessId, reason, details } = req.body;
      const business = await prisma.business.findUnique({ where: { id: businessId } });
      if (!business) return res.status(404).json({ error: "Business not found" });

      const report = await prisma.businessReport.create({
        data: { businessId, reporterId: req.user!.userId, reason, details },
      });

      const updated = await prisma.business.update({
        where: { id: businessId },
        data: { reportCount: { increment: 1 } },
      });

      if (updated.reportCount >= AUTO_HIDE_THRESHOLD && updated.status === "APPROVED") {
        await prisma.business.update({ where: { id: businessId }, data: { status: "HIDDEN", isFlagged: true } });
      }

      res.status(201).json({ report, message: "Thanks for the report — our team will review it." });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/business", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const status = (req.query.status as string) || "PENDING";
    const reports = await prisma.businessReport.findMany({
      where: { status: status as any },
      include: {
        business: { select: { id: true, name: true, status: true, reportCount: true } },
        reporter: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ reports });
  } catch (err) {
    next(err);
  }
});

router.post("/business/:id/resolve", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const { action } = req.body; // "dismiss" | "hide_business"
    const report = await prisma.businessReport.update({
      where: { id: req.params.id },
      data: { status: action === "hide_business" ? "ACTIONED" : "DISMISSED", resolvedAt: new Date() },
    });
    if (action === "hide_business") {
      await prisma.business.update({ where: { id: report.businessId }, data: { status: "HIDDEN" } });
    }
    res.json({ report });
  } catch (err) {
    next(err);
  }
});

export default router;
