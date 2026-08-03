"use client";
import { PaymentMethod } from "../lib/types";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; hint: string; badge: string; badgeClass: string }[] = [
  { value: "MTN_MOMO",      label: "MTN Mobile Money", hint: "Pay from your MTN MoMo wallet",     badge: "MTN",   badgeClass: "bg-amber-400 text-amber-950" },
  { value: "AIRTEL_MONEY",  label: "Airtel Money",      hint: "Pay from your Airtel Money wallet",  badge: "Airtel", badgeClass: "bg-red-500 text-white" },
  { value: "BOTIM",         label: "Botim",              hint: "Pay via your Botim wallet",          badge: "Botim",  badgeClass: "bg-sky-500 text-white" },
  { value: "CARD",          label: "Card",               hint: "Visa, Mastercard",                   badge: "Card",   badgeClass: "bg-slate-700 text-white" },
  { value: "BANK_TRANSFER", label: "Bank transfer",      hint: "Direct bank transfer",               badge: "Bank",   badgeClass: "bg-emerald-600 text-white" },
];

interface Props {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  className?: string;
}

// Compact payment-method picker used anywhere a paid booking/checkout needs
// the payer to choose how they're paying. Mobile-money options (the most
// commonly used methods in our markets) are surfaced first.
export function PaymentMethodSelector({ value, onChange, className = "" }: Props) {
  return (
    <div className={`grid grid-cols-1 xs:grid-cols-2 gap-2 ${className}`} role="radiogroup" aria-label="Payment method">
      {PAYMENT_METHODS.map(m => {
        const active = value === m.value;
        return (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(m.value)}
            className={`flex items-center gap-2 rounded-xl border-2 px-2.5 py-2 text-left transition-all ${
              active ? "border-sky-500 bg-sky-50" : "border-gray-200 hover:border-sky-200"
            }`}
          >
            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide ${m.badgeClass}`}>
              {m.badge}
            </span>
            <span className="min-w-0">
              <span className={`block text-xs font-semibold truncate ${active ? "text-sky-700" : "text-gray-800"}`}>{m.label}</span>
              <span className="block text-[10px] text-gray-400 truncate">{m.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
