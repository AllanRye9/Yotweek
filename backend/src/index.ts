import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { logger } from "./utils/logger";
import { startReminderCron } from "./utils/reminderCron";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  logger.info(`yotweek API listening on port ${PORT}`);
  startReminderCron();
});
