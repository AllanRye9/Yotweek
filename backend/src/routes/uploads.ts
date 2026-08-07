import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { requireAuth, canUploadEventVideos, AuthRequest } from "../middleware/auth";
import { UPLOAD_DIR } from "../utils/uploadDir";
import { s3Client, bucketConfigured, BUCKET_NAME } from "../utils/s3";

const router = Router();

// ── Storage: Railway Bucket (S3-compatible) when configured, else local ────
// disk. Uploads used to always go to local disk, which Railway (and most
// hosts) wipe on every redeploy/restart — that's what made listing images
// "disappear at random timings". Every upload now goes through this one
// choke point, and it's the same choke point that serves files back out
// (see `serveUploads` below), so storage is consistent regardless of which
// container instance handled the original upload or is serving it now.
async function persistUpload(filename: string, buffer: Buffer, contentType: string): Promise<void> {
  if (bucketConfigured && s3Client) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME!,
        Key: filename,
        Body: buffer,
        ContentType: contentType,
        CacheControl: "public, max-age=2592000, immutable",
      })
    );
    return;
  }
  // Local dev fallback — no bucket configured.
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
}

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB

// multer keeps the file in memory instead of writing straight to disk, so
// the same buffer can go to either the bucket or disk depending on config.
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME[file.mimetype]) {
      return cb(new Error("Only JPEG, PNG, WEBP, or GIF images are allowed."));
    }
    cb(null, true);
  },
});

function buildFilename(mimetype: string, originalname: string, allowed: Record<string, string>, fallbackExt: string) {
  const ext = allowed[mimetype] || path.extname(originalname).toLowerCase() || fallbackExt;
  return `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
}

// POST /api/uploads/image - any signed-in user can upload one image (a
// listing's cover photo, or a single gallery photo — the frontend calls
// this once per file for the gallery too). Requires auth so only account
// holders can write to storage; it does not additionally require the upload
// to belong to a specific listing since listing ownership is enforced when
// the returned URL is later saved onto an event/business record.
router.post("/image", requireAuth, (req: AuthRequest, res: Response, next: NextFunction) => {
  uploadImage.single("image")(req, res, async (err: any) => {
    if (err) {
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "Image is too large (max 8MB)."
          : err.message || "Upload failed.";
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: "No image file provided." });

    try {
      const filename = buildFilename(req.file.mimetype, req.file.originalname, ALLOWED_MIME, ".jpg");
      await persistUpload(filename, req.file.buffer, req.file.mimetype);

      // PUBLIC_UPLOAD_BASE_URL lets you point at a CDN/proxy in front of this
      // server; otherwise this falls back to the request's own host, which is
      // correct behind Railway/any reverse proxy as long as `trust proxy` is
      // set (it is, in app.ts) so req.protocol reflects the real https scheme.
      const base = (process.env.PUBLIC_UPLOAD_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
      res.status(201).json({ url: `${base}/uploads/${filename}` });
    } catch (e) {
      next(e);
    }
  });
});

const ALLOWED_VIDEO_MIME: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

const uploadVideo = multer({
  storage: multer.memoryStorage(),
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
  uploadVideo.single("video")(req, res, async (err: any) => {
    if (err) {
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "Video is too large (max 50MB)."
          : err.message || "Upload failed.";
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: "No video file provided." });

    try {
      const filename = buildFilename(req.file.mimetype, req.file.originalname, ALLOWED_VIDEO_MIME, ".mp4");
      await persistUpload(filename, req.file.buffer, req.file.mimetype);

      const base = (process.env.PUBLIC_UPLOAD_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
      res.status(201).json({ url: `${base}/uploads/${filename}` });
    } catch (e) {
      next(e);
    }
  });
});

// POST /api/uploads/listing-video - any signed-in user, for videos attached
// to their own event/business listing gallery (mirrors /image's access
// model). Kept separate from /video above, which stays restricted to the
// homepage past/upcoming-events slider.
router.post("/listing-video", requireAuth, (req: AuthRequest, res: Response, next: NextFunction) => {
  uploadVideo.single("video")(req, res, async (err: any) => {
    if (err) {
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "Video is too large (max 50MB)."
          : err.message || "Upload failed.";
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: "No video file provided." });

    try {
      const filename = buildFilename(req.file.mimetype, req.file.originalname, ALLOWED_VIDEO_MIME, ".mp4");
      await persistUpload(filename, req.file.buffer, req.file.mimetype);

      const base = (process.env.PUBLIC_UPLOAD_BASE_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
      res.status(201).json({ url: `${base}/uploads/${filename}` });
    } catch (e) {
      next(e);
    }
  });
});

export default router;

// ── Serving uploaded files back out ─────────────────────────────────────────
// Railway Buckets are private — there is no public bucket URL — so files are
// proxied back through this backend rather than served by a CDN pointed
// straight at the bucket. Mounted at "/uploads" in app.ts (replacing the old
// `express.static(UPLOAD_DIR)`), so every previously-issued
// `${base}/uploads/<filename>` URL keeps working unchanged.
const filenamePattern = /^[a-zA-Z0-9._-]+$/;

export const serveUploads = Router();

serveUploads.get("/:filename", async (req: Request, res: Response, next: NextFunction) => {
  const { filename } = req.params;
  if (!filenamePattern.test(filename)) return res.status(400).end();

  if (bucketConfigured && s3Client) {
    try {
      const object = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET_NAME!, Key: filename }));
      res.setHeader("Content-Type", object.ContentType || "application/octet-stream");
      res.setHeader("Cache-Control", "public, max-age=2592000, immutable");

      const body = object.Body as NodeJS.ReadableStream | undefined;
      if (body && typeof (body as any).pipe === "function") {
        body.pipe(res);
      } else if (object.Body) {
        // Non-Node runtimes return a web ReadableStream instead of a Node
        // stream — buffer it in that case.
        const bytes = await (object.Body as any).transformToByteArray();
        res.end(Buffer.from(bytes));
      } else {
        res.status(404).end();
      }
    } catch (err: any) {
      if (err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) {
        return res.status(404).end();
      }
      next(err);
    }
    return;
  }

  // Local dev fallback — no bucket configured, read straight off disk.
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!filePath.startsWith(path.resolve(UPLOAD_DIR))) return res.status(400).end();
  res.sendFile(filePath, { maxAge: "30d", immutable: true }, (err) => {
    if (err) next(err);
  });
});
