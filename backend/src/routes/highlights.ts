import { Router } from "express";
import { prisma } from "../utils/prisma";

const router = Router();

// GET /api/highlights - active image/video slider items for the homepage,
// ordered for display.
router.get("/", async (_req, res, next) => {
  try {
    const highlights = await prisma.highlight.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    res.json({ highlights });
  } catch (err) {
    next(err);
  }
});

export default router;
