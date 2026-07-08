import path from "path";
import fs from "fs";

// Where uploaded images actually live on disk. Configurable via UPLOAD_DIR
// so a Railway Volume (or any mounted persistent disk) can be pointed here
// in production — without it, uploads are wiped on every redeploy since
// container filesystems are ephemeral. See README "Image uploads" section.
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
