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

import { errorHandler, notFound } from "./middleware/errorHandler";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("tiny"));

// Generous general limiter; a tighter limiter is applied to the write-heavy
// listing-creation route inside events.ts to slow down spam posting.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

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

app.use(notFound);
app.use(errorHandler);

export default app;
