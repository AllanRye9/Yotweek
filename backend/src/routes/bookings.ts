import { Router } from "express";
import { v4 as uuid } from "uuid";
import { prisma } from "../utils/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { splitPayment } from "../utils/commission";
import { sendEmail, emailTemplates } from "../utils/email";

const router = Router();
router.use(requireAuth);

// POST /api/bookings - register/buy a ticket for an event (free or paid).
router.post("/", async (req: AuthRequest, res, next) => {
  try {
    const { eventId, quantity = 1, paymentMethod } = req.body;
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.status !== "APPROVED") {
      return res.status(404).json({ error: "Event not available for booking" });
    }
    if (event.capacity && event.ticketsSold + quantity > event.capacity) {
      return res.status(400).json({ error: "Not enough tickets remaining" });
    }

    const totalAmount =
      event.priceType === "PAID" ? Number(event.price) * quantity : 0;

    const booking = await prisma.booking.create({
      data: {
        eventId,
        userId: req.user!.userId,
        quantity,
        totalAmount,
        currency: event.currency,
        status: event.priceType === "FREE" ? "CONFIRMED" : "PENDING",
      },
    });

    await prisma.event.update({ where: { id: eventId }, data: { ticketsSold: { increment: quantity } } });

    if (event.priceType === "FREE") {
      await prisma.notification.create({
        data: { userId: req.user!.userId, type: "BOOKING_CONFIRMED", message: `You're registered for "${event.title}".` },
      });
      const attendee = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { email: true } });
      if (attendee) {
        const tpl = emailTemplates.bookingConfirmed(event.title, quantity, "0", event.currency);
        sendEmail({ to: attendee.email, ...tpl }).catch(() => {});
      }
      return res.status(201).json({ booking, requiresPayment: false });
    }

    // For paid events, create a pending Payment record. Real card/mobile-money
    // capture happens via the provider's checkout/webhook and lands on the
    // /confirm route below - this keeps provider-specific code isolated to
    // one place.
    const { commissionAmount, organizerPayoutAmount } = splitPayment(totalAmount, Number(event.commissionPct));
    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: totalAmount,
        currency: event.currency,
        commissionAmount,
        organizerPayoutAmount,
        method: paymentMethod || "MOBILE_MONEY",
        status: "PENDING",
        transactionRef: uuid(),
      },
    });

    res.status(201).json({ booking, payment, requiresPayment: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/:bookingId/confirm-payment - called by the payment
// provider's webhook (or, in dev, manually) once funds have cleared.
router.post("/:bookingId/confirm-payment", async (req, res, next) => {
  try {
    const { transactionRef, success } = req.body;
    const payment = await prisma.payment.findUnique({ where: { bookingId: req.params.bookingId } });
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: success ? "COMPLETED" : "FAILED",
        paidAt: success ? new Date() : null,
        transactionRef: transactionRef || payment.transactionRef,
      },
    });

    const booking = await prisma.booking.update({
      where: { id: req.params.bookingId },
      data: { status: success ? "CONFIRMED" : "CANCELLED" },
      include: { event: true, user: { select: { email: true } } },
    });

    await prisma.notification.create({
      data: {
        userId: booking.userId,
        type: success ? "PAYMENT_RECEIVED" : "SYSTEM",
        message: success
          ? `Payment confirmed for "${booking.event.title}". See you there!`
          : `Payment failed for "${booking.event.title}". Please try again.`,
      },
    });

    if (success) {
      const receiptTpl = emailTemplates.paymentReceipt(
        booking.event.title,
        updatedPayment.amount.toString(),
        updatedPayment.currency,
        updatedPayment.transactionRef
      );
      const confirmTpl = emailTemplates.bookingConfirmed(
        booking.event.title,
        booking.quantity,
        updatedPayment.amount.toString(),
        updatedPayment.currency
      );
      sendEmail({ to: booking.user.email, ...receiptTpl }).catch(() => {});
      sendEmail({ to: booking.user.email, ...confirmTpl }).catch(() => {});
    }

    res.json({ booking, payment: updatedPayment });
  } catch (err) {
    next(err);
  }
});

router.get("/mine", async (req: AuthRequest, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user!.userId },
      include: { event: true, payment: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/organizer/payouts - organizer view of what they'll
// receive after the platform commission across their paid events.
router.get("/organizer/payouts", async (req: AuthRequest, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { status: "COMPLETED", booking: { event: { organizerId: req.user!.userId } } },
      include: { booking: { include: { event: { select: { title: true } } } } },
      orderBy: { paidAt: "desc" },
    });
    const totalPayout = payments.reduce((sum, p) => sum + Number(p.organizerPayoutAmount), 0);
    const totalCommission = payments.reduce((sum, p) => sum + Number(p.commissionAmount), 0);
    res.json({ payments, totalPayout, totalCommission });
  } catch (err) {
    next(err);
  }
});

export default router;
