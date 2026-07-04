import cron from "node-cron";
import { prisma } from "./prisma";
import { logger } from "./logger";
import { sendEmail, emailTemplates } from "./email";

// Runs every hour: finds bookings for events starting in the next 24-26h
// window and creates an in-app "event reminder" notification for each
// attendee that hasn't already been reminded. A push/SMS provider can be
// wired in here later - this creates the Notification row the frontend
// polls for now.
export function startReminderCron() {
  cron.schedule("0 * * * *", async () => {
    try {
      const windowStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const windowEnd = new Date(Date.now() + 26 * 60 * 60 * 1000);

      const upcoming = await prisma.event.findMany({
        where: {
          status: "APPROVED",
          startDate: { gte: windowStart, lte: windowEnd },
        },
        include: {
          bookings: { where: { status: "CONFIRMED" }, select: { userId: true, user: { select: { email: true } } } },
        },
      });

      for (const event of upcoming) {
        for (const booking of event.bookings) {
          const already = await prisma.notification.findFirst({
            where: {
              userId: booking.userId,
              type: "EVENT_REMINDER",
              message: { contains: event.id },
            },
          });
          if (already) continue;
          await prisma.notification.create({
            data: {
              userId: booking.userId,
              type: "EVENT_REMINDER",
              message: `Reminder: "${event.title}" starts tomorrow in ${event.city}. [event:${event.id}]`,
            },
          });
          const tpl = emailTemplates.eventReminder(event.title, event.city, event.startDate);
          sendEmail({ to: booking.user.email, ...tpl }).catch(() => {});
        }
      }
    } catch (err) {
      logger.error(`Reminder cron failed: ${err}`);
    }
  });
}
