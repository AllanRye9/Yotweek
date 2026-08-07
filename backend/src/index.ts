import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { logger } from "./utils/logger";
import { startReminderCron } from "./utils/reminderCron";
import { bucketConfigured } from "./utils/s3";

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV === "production" && !bucketConfigured && !process.env.UPLOAD_DIR) {
  logger.warn(
    "No Railway Bucket credentials (AWS_ENDPOINT_URL/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY/" +
    "AWS_S3_BUCKET_NAME) and UPLOAD_DIR are both unset in production. Uploaded images/videos " +
    "are being written to the container's local disk, which most hosts (Railway included) wipe " +
    "on every redeploy, restart, or horizontal scale — this is the most common cause of listing " +
    "images 'disappearing' at random. Attach a Railway Bucket and reference its credentials on " +
    "this service (see utils/s3.ts) to fix it permanently."
  );
}

app.listen(PORT, () => {
  logger.info(`yotweek API listening on port ${PORT}`);
  startReminderCron();
});
