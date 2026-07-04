import nodemailer, { Transporter } from "nodemailer";
import { logger } from "./logger";

const SMTP_HOST = process.env.SMTP_HOST;
const EMAIL_FROM = process.env.EMAIL_FROM || "yotweek <no-reply@yotweek.com>";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!SMTP_HOST) return null; // not configured - caller falls back to a log line
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Sends an email if SMTP is configured; otherwise logs it so nothing is
// silently lost during local development or before env vars are set.
export async function sendEmail({ to, subject, html }: EmailOptions): Promise<void> {
  const t = getTransporter();
  if (!t) {
    logger.info(`[email:not-configured] would send "${subject}" to ${to}`);
    return;
  }
  try {
    await t.sendMail({ from: EMAIL_FROM, to, subject, html });
  } catch (err) {
    // Email failures should never break the request that triggered them
    // (e.g. a booking must still succeed even if the receipt email fails).
    logger.error(`Failed to send email "${subject}" to ${to}: ${err}`);
  }
}

const wrapper = (title: string, body: string) => `
  <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
    <h2 style="color:#c2410c">yotweek</h2>
    <h3>${title}</h3>
    <div style="color:#333;line-height:1.6">${body}</div>
    <p style="color:#999;font-size:12px;margin-top:32px">
      This is an automated message from yotweek. If you didn't expect this, you can ignore it.
    </p>
  </div>`;

export const emailTemplates = {
  eventReminder: (eventTitle: string, city: string, startDate: Date) => ({
    subject: `Reminder: "${eventTitle}" is coming up`,
    html: wrapper(
      "Your event is coming up",
      `<p><strong>${eventTitle}</strong> in ${city} starts on ${startDate.toDateString()}.</p>`
    ),
  }),
  bookingConfirmed: (eventTitle: string, quantity: number, totalAmount: string, currency: string) => ({
    subject: `Booking confirmed: ${eventTitle}`,
    html: wrapper(
      "Booking confirmed",
      `<p>Your booking for <strong>${eventTitle}</strong> (${quantity} ticket${quantity > 1 ? "s" : ""}) is confirmed.</p>
       <p>Total paid: <strong>${totalAmount} ${currency}</strong></p>`
    ),
  }),
  paymentReceipt: (eventTitle: string, amount: string, currency: string, transactionRef: string | null) => ({
    subject: `Payment receipt: ${eventTitle}`,
    html: wrapper(
      "Payment receipt",
      `<p>We've received your payment of <strong>${amount} ${currency}</strong> for <strong>${eventTitle}</strong>.</p>
       ${transactionRef ? `<p>Reference: ${transactionRef}</p>` : ""}`
    ),
  }),
  listingApproved: (listingName: string) => ({
    subject: `"${listingName}" has been approved`,
    html: wrapper("Listing approved", `<p><strong>${listingName}</strong> is now live on yotweek.</p>`),
  }),
  listingRejected: (listingName: string, reason: string) => ({
    subject: `"${listingName}" was not approved`,
    html: wrapper(
      "Listing not approved",
      `<p><strong>${listingName}</strong> was rejected: ${reason}</p>`
    ),
  }),
  promotional: (subject: string, bodyHtml: string) => ({
    subject,
    html: wrapper(subject, bodyHtml),
  }),
};
