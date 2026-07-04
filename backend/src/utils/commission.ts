// Splits a paid-event ticket total into the platform's commission and the
// organizer's payout, based on a per-event commission percentage.
export function splitPayment(totalAmount: number, commissionPct: number) {
  const commissionAmount = Math.round((totalAmount * commissionPct) / 100 * 100) / 100;
  const organizerPayoutAmount = Math.round((totalAmount - commissionAmount) * 100) / 100;
  return { commissionAmount, organizerPayoutAmount };
}
