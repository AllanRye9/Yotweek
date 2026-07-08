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

      // Public sign-up never grants ADMIN — admin accounts are created only
      // through the dedicated bootstrap flow at POST /auth/admin/setup (see
      // below) or by an existing admin promoting a user from /const/users.
      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: (role as any) || "USER",
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

// ─────────────────────────────────────────────────────────────────────────
// Admin authentication — intentionally separate from the ordinary
// USER/AGENT/COMPANY/ORGANIZATION sign-up and login above. Regular
// registration can never produce an ADMIN account; the only ways to become
// one are (1) the one-time bootstrap below, when the platform has no admin
// yet, or (2) being promoted by an existing admin from /const/users.
// ─────────────────────────────────────────────────────────────────────────

// GET /api/auth/admin/exists - lets the /const/register page decide whether
// to show the bootstrap form or turn people away. Safe to expose publicly:
// it reveals only a boolean, not who the admin is.
router.get("/admin/exists", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.user.count({ where: { role: "ADMIN" } });
    res.json({ exists: count > 0 });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/admin/setup - creates the platform's very first admin
// account. Locked forever the moment one admin exists, so this can't be
// used to mint extra admins later — that goes through /const/users instead.
router.post(
  "/admin/setup",
  [
    body("name").trim().isLength({ min: 2 }),
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount > 0) {
        return res.status(409).json({ error: "An admin account already exists. Ask an existing admin to grant you access from the Users panel." });
      }

      const { name, email, password } = req.body;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(409).json({ error: "Email already registered" });

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { name, email, passwordHash, role: "ADMIN" },
      });

      const token = signToken({ userId: user.id, role: user.role });
      res.status(201).json({ token, user: sanitize(user) });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/admin/login - same credential check as ordinary login, but
// additionally requires the account to hold the ADMIN role. A correct
// password on a non-admin account is rejected here, so admin sessions can
// only ever start from this endpoint.
router.post(
  "/admin/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(401).json({ error: "Invalid admin credentials" });
      if (user.isSuspended) return res.status(403).json({ error: "Account suspended" });

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ error: "Invalid admin credentials" });

      if (user.role !== "ADMIN") {
        return res.status(403).json({ error: "This account does not have admin access." });
      }

      const token = signToken({ userId: user.id, role: user.role });
      res.json({ token, user: sanitize(user) });
    } catch (err) {
      next(err);
    }
  }
);

function sanitize(user: any) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export default router;
