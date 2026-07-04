import { Router, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../utils/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/testimonials - approved testimonials for public display
// (homepage / trust section). Featured ones first.
router.get("/", async (req, res, next) => {
  try {
    const { featuredOnly } = req.query as Record<string, string>;
    const testimonials = await prisma.testimonial.findMany({
      where: { status: "APPROVED", ...(featuredOnly === "true" ? { isFeatured: true } : {}) },
      include: { user: { select: { name: true, avatarUrl: true, country: true } } },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 30,
    });
    res.json({ testimonials });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  requireAuth,
  [body("content").trim().isLength({ min: 10, max: 1000 }), body("rating").optional().isInt({ min: 1, max: 5 })],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const testimonial = await prisma.testimonial.create({
        data: {
          userId: req.user!.userId,
          content: req.body.content,
          rating: req.body.rating,
          status: "PENDING",
        },
      });
      res.status(201).json({ testimonial, message: "Thanks for sharing! Your testimonial is awaiting review." });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
