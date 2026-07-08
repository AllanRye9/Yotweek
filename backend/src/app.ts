import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth";
import eventRoutes from "./routes/events";
import adminRoutes from "./routes/admin";
import statsRoutes from "./routes/stats";
import reviewRoutes from "./routes/reviews";
import reportRoutes from "./routes/reports";
import itineraryRoutes from "./routes/itineraries";
import bookingRoutes from "./routes/bookings";
import weatherRoutes from "./routes/weather";
import notificationRoutes from "./routes/notifications";
import userRoutes from "./routes/users";
import categoryRoutes from "./routes/categories";
import businessRoutes from "./routes/businesses";
import testimonialRoutes from "./routes/testimonials";
import highlightRoutes from "./routes/highlights";
import postRoutes from "./routes/posts";
import searchRoutes from "./routes/search";
import recommendationRoutes from "./routes/recommendations";
import uploadRoutes from "./routes/uploads";
import { UPLOAD_DIR } from "./utils/uploadDir";

import { errorHandler, notFound } from "./middleware/errorHandler";

const app = express();

// Trust Railway's (or any) reverse proxy so req.protocol/req.ip reflect the
// real client, not the proxy hop. This matters for: rate-limiting by IP,
// the SHA-256 visitor-hash analytics, and building correct https:// upload
// URLs in routes/uploads.ts.
app.set("trust proxy", 1);

// ── CORS ────────────────────────────────────────────────────────────────
// Accept localhost dev + any domains listed in FRONTEND_URL (comma-separated)
// plus the hardcoded production domain. Add your Railway URL to FRONTEND_URL.
const extraOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://yotweek.com",
  "https://www.yotweek.com",
  ...extraOrigins,
]);

app.use(
  cors({
    origin: (origin, cb) => {
      // No origin = curl / Postman / server-to-server — allow it.
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
      cb(new Error(`CORS: origin "${origin}" not in allowlist`));
    },
    credentials: true,
  })
);

app.use(helmet({
  // Default helmet blocks cross-origin loading of same-server resources
  // (Cross-Origin-Resource-Policy: same-origin). The frontend lives on a
  // different domain than this API, and it needs to load uploaded images
  // directly via <img src>, so this is relaxed for the whole app — every
  // resource here is public content anyway (listings, highlights, uploads).
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(compression());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("tiny"));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/itineraries", itineraryRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api/highlights", highlightRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/uploads", uploadRoutes);

// Uploaded images are served straight off disk. `immutable` is safe because
// filenames are content-addressed with a random suffix (see routes/uploads.ts)
// — a given filename's bytes never change, so it can be cached forever.
app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "30d", immutable: true }));

app.use(notFound);
app.use(errorHandler);

export default app;
