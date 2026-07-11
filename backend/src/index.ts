import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { logger } from "./utils/logger";
import { startReminderCron } from "./utils/reminderCron";

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV === "production" && !process.env.UPLOAD_DIR) {
  logger.warn(
    "UPLOAD_DIR is not set in production. Uploaded images/videos are being written to the " +
    "container's local disk, which most hosts (Railway included) wipe on every redeploy or " +
    "restart — this is the most common cause of listing images 'disappearing' after launch. " +
    "Mount a persistent volume and set UPLOAD_DIR to it (see README 'Image uploads' section), " +
    "or switch routes/uploads.ts to S3/R2 storage."
  );
}

app.listen(PORT, () => {
  logger.info(`yotweek API listening on port ${PORT}`);
  startReminderCron();
});
