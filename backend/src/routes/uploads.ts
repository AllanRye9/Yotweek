import { Router, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { requireAuth, canUploadEventVideos, AuthRequest } from "../middleware/auth";
import { UPLOAD_DIR } from "../utils/uploadDir";

const router = Router();

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIME[file.mimetype] || path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME[file.mimetype]) {
      return cb(new Error("Only JPEG, PNG, WEBP, or GIF images are allowed."));
    }
    cb(null, true);
  },
});

// POST /api/uploads/image - any signed-in user can upload one image (a
// listing's cover photo, or a single gallery photo — the frontend calls
// this once per file for the gallery too). Requires auth so only account
// holders can write to disk; it does not additionally require the upload
// to belong to a specific listing since listing ownership is enforced when
// the returned URL is later saved onto an event/business record.
router.post("/image", requireAuth, (req: AuthRequest, res: Response, next: NextFunction) => {
  upload.single("image")(req, res, (err: any) => {
    if (err) {
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "Image is too large (max 8MB)."
          : err.message || "Upload failed.";
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: "No image file provided." });

    // PUBLIC_UPLOAD_BASE_URL lets you point at a CDN/proxy in front of this
    // server; otherwise this falls back to the request's own host, which is
    // correct behind Railway/any reverse proxy as long as `trust proxy` is
    // set (it is, in app.ts) so req.protocol reflects the real https scheme.
    const base = (process.env.PUBLIC_UPLOAD_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
    res.status(201).json({ url: `${base}/uploads/${req.file.filename}` });
  });
});

const ALLOWED_VIDEO_MIME: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = ALLOWED_VIDEO_MIME[file.mimetype] || path.extname(file.originalname).toLowerCase() || ".mp4";
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`);
  },
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: MAX_VIDEO_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_VIDEO_MIME[file.mimetype]) {
      return cb(new Error("Only MP4, WEBM, or MOV videos are allowed."));
    }
    cb(null, true);
  },
});

// POST /api/uploads/video - restricted to admins and admin-approved
// (isVerifiedOrganizer) organizers, since video storage is heavier than the
// image path above. Used for the homepage past/upcoming events slider.
router.post("/video", requireAuth, canUploadEventVideos, (req: AuthRequest, res: Response, next: NextFunction) => {
  uploadVideo.single("video")(req, res, (err: any) => {
    if (err) {
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "Video is too large (max 50MB)."
          : err.message || "Upload failed.";
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: "No video file provided." });

    const base = (process.env.PUBLIC_UPLOAD_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
    res.status(201).json({ url: `${base}/uploads/${req.file.filename}` });
  });
});

export default router;
