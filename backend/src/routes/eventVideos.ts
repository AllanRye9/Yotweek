import { Router } from "express";
import { prisma } from "../utils/prisma";
import { requireAuth, canUploadEventVideos, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/event-videos - approved, active clips for the homepage
// past/upcoming events video slider. Optional ?timing=PAST|UPCOMING filter.
router.get("/", async (req, res, next) => {
  try {
    const { timing } = req.query;
    const where: any = { status: "APPROVED", isActive: true };
    if (timing === "PAST" || timing === "UPCOMING") where.timing = timing;

    const videos = await prisma.eventVideo.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });
    res.json({ videos });
  } catch (err) {
    next(err);
  }
});

// POST /api/event-videos - submit a clip for the homepage slider. Restricted
// to admins and admin-approved (isVerifiedOrganizer) organizers. ADMIN
// submissions go live immediately; everyone else's start PENDING and wait
// for an admin to approve them from the /admin/event-videos review queue.
router.post("/", requireAuth, canUploadEventVideos, async (req: AuthRequest, res, next) => {
  try {
    const { title, caption, videoUrl, thumbnailUrl, timing, eventId } = req.body;
    if (!title || !videoUrl || !timing) {
      return res.status(400).json({ error: "title, videoUrl, and timing are required" });
    }
    if (timing !== "PAST" && timing !== "UPCOMING") {
      return res.status(400).json({ error: "timing must be PAST or UPCOMING" });
    }
    const video = await prisma.eventVideo.create({
      data: {
        title,
        caption,
        videoUrl,
        thumbnailUrl,
        timing,
        eventId: eventId || null,
        uploaderId: req.user!.userId,
        status: req.user!.role === "ADMIN" ? "APPROVED" : "PENDING",
      },
    });
    res.status(201).json({ video });
  } catch (err) {
    next(err);
  }
});

export default router;
