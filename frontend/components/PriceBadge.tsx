import { PriceType } from "../lib/types";

export function PriceBadge({
  priceType,
  price,
  currency,
}: {
  priceType: PriceType;
  price?: string | number | null;
  currency?: string;
}) {
  if (priceType === "FREE") {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-green-700">
        Free
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-sunset-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sunset-700">
      {currency} {Number(price).toLocaleString()}
    </span>
  );
}
