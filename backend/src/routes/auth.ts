import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import { prisma } from "../utils/prisma";
import { signToken } from "../utils/jwt";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const ALLOWED_SIGNUP_ROLES = ["USER", "AGENT", "COMPANY", "ORGANIZATION"];

router.post(
  "/register",
  [
    body("name").trim().isLength({ min: 2 }),
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }),
    body("role").optional().isIn(ALLOWED_SIGNUP_ROLES),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { name, email, password, role, organizationName, country, city } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(409).json({ error: "Email already registered" });

      if ((role === "COMPANY" || role === "AGENT" || role === "ORGANIZATION") && !organizationName) {
        return res.status(400).json({ error: "organizationName is required for that role" });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      // The very first person to ever register becomes the platform admin,
      // regardless of what role they selected on the sign-up form.
      const isFirstUser = (await prisma.user.count()) === 0;

      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: isFirstUser ? "ADMIN" : (role as any) || "USER",
          organizationName: organizationName || null,
          country,
          city,
        },
      });

      const token = signToken({ userId: user.id, role: user.role });
      res.status(201).json({ token, user: sanitize(user) });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      if (user.isSuspended) return res.status(403).json({ error: "Account suspended" });

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });

      const token = signToken({ userId: user.id, role: user.role });
      res.json({ token, user: sanitize(user) });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: sanitize(user) });
  } catch (err) {
    next(err);
  }
});

function sanitize(user: any) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export default router;
