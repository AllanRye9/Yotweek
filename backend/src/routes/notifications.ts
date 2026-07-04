import { Router } from "express";
import { prisma } from "../utils/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/read", async (req: AuthRequest, res, next) => {
  try {
    const notif = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!notif || notif.userId !== req.user!.userId) return res.status(404).json({ error: "Not found" });
    await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
