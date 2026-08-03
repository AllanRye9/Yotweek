-- Add Botim, MTN MoMo, and Airtel Money as selectable payment methods,
-- alongside the existing CARD / MOBILE_MONEY / BANK_TRANSFER values.
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'BOTIM';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'MTN_MOMO';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'AIRTEL_MONEY';
