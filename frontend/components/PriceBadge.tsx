"use client";
import { PriceType } from "../lib/types";
import { useCurrency } from "../context/CurrencyContext";
import { formatMoney } from "../lib/currency";

export function PriceBadge({
  priceType,
  price,
  currency,
  size = "md",
}: {
  priceType: PriceType;
  price?: string | number | null;
  currency?: string;
  size?: "sm" | "md";
}) {
  const { currency: displayCurrency, convert } = useCurrency();

  if (priceType === "FREE") {
    return (
      <span className={`inline-flex items-center rounded-full bg-green-100 px-3 py-1 font-bold uppercase tracking-wide text-green-700 ${size === "sm" ? "text-[10px]" : "text-xs"}`}>
        Free
      </span>
    );
  }

  const amount = Number(price) || 0;
  const from = currency || "USD";
  const converted = from !== displayCurrency ? convert(amount, from) : amount;
  const showsConverted = converted !== null && from !== displayCurrency;

  return (
    <span className={`inline-flex flex-col items-start rounded-xl bg-sunset-100 px-3 py-1 font-bold uppercase tracking-wide text-sunset-700 ${size === "sm" ? "text-[10px]" : "text-xs"}`}>
      <span>{formatMoney(showsConverted ? (converted as number) : amount, showsConverted ? displayCurrency : from)}</span>
      {showsConverted && (
        <span className="font-normal normal-case tracking-normal opacity-60 text-[9px] -mt-0.5">
          {formatMoney(amount, from)}
        </span>
      )}
    </span>
  );
}
