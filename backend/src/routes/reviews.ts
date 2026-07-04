import { Router, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../utils/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/reviews/event/:eventId - approved reviews for an event
router.get("/event/:eventId", async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { eventId: req.params.eventId, status: "APPROVED" },
      include: { user: { select: { name: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/event/:eventId",
  requireAuth,
  [body("rating").isInt({ min: 1, max: 5 }), body("comment").optional().isLength({ max: 2000 })],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const event = await prisma.event.findUnique({ where: { id: req.params.eventId } });
      if (!event) return res.status(404).json({ error: "Event not found" });

      const review = await prisma.review.upsert({
        where: { eventId_userId: { eventId: req.params.eventId, userId: req.user!.userId } },
        create: {
          eventId: req.params.eventId,
          userId: req.user!.userId,
          rating: req.body.rating,
          comment: req.body.comment,
          status: "PENDING",
        },
        update: {
          rating: req.body.rating,
          comment: req.body.comment,
          status: "PENDING", // re-moderate on edit
        },
      });

      res.status(201).json({ review, message: "Thanks! Your review is awaiting moderation." });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/reviews/business/:businessId - approved reviews for a business
router.get("/business/:businessId", async (req, res, next) => {
  try {
    const reviews = await prisma.businessReview.findMany({
      where: { businessId: req.params.businessId, status: "APPROVED" },
      include: { user: { select: { name: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ reviews });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/business/:businessId",
  requireAuth,
  [body("rating").isInt({ min: 1, max: 5 }), body("comment").optional().isLength({ max: 2000 })],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const business = await prisma.business.findUnique({ where: { id: req.params.businessId } });
      if (!business) return res.status(404).json({ error: "Business not found" });

      const review = await prisma.businessReview.upsert({
        where: { businessId_userId: { businessId: req.params.businessId, userId: req.user!.userId } },
        create: {
          businessId: req.params.businessId,
          userId: req.user!.userId,
          rating: req.body.rating,
          comment: req.body.comment,
          status: "PENDING",
        },
        update: {
          rating: req.body.rating,
          comment: req.body.comment,
          status: "PENDING", // re-moderate on edit
        },
      });

      res.status(201).json({ review, message: "Thanks! Your review is awaiting moderation." });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
