"use client";
import Link from "next/link";
import { useState } from "react";
import { Business } from "../lib/types";
import { recordSignal } from "../lib/preferences";
import { SafeImage } from "./SafeImage";

const PRICE_LABELS: Record<string, string> = {
  BUDGET:"$", MODERATE:"$$", EXPENSIVE:"$$$", LUXURY:"$$$$",
};

export function BusinessCard({ business }: { business: Business }) {
  const [imgFailed, setImgFailed] = useState(!business.coverImageUrl);

  const handleClick = () => {
    recordSignal({
      businessId: business.id, action: "view",
      city: business.city, tags: business.tags,
      category: business.category?.slug,
    });
  };

  return (
    <Link href={`/businesses/${business.id}`} onClick={handleClick}
      className="card-base card-hover shine group flex flex-col overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300">
        {!imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={business.coverImageUrl!} alt={business.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgFailed(true)} loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl">🏪</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {business.isVerified && <span className="badge-verif">✓ Verified</span>}
          {business.priceRange && <span className="badge bg-white/90 text-gray-700">{PRICE_LABELS[business.priceRange]}</span>}
        </div>
        {typeof business.distanceKm === "number" && (
          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">{business.distanceKm} km</span>
        )}
        {business.logoUrl && (
          <div className="absolute -bottom-4 left-3 w-10 h-10 rounded-full overflow-hidden ring-2 ring-white shadow-md bg-white">
            <SafeImage src={business.logoUrl} alt={`${business.name} logo`} className="w-full h-full object-cover"
              fallback={<div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">🏪</div>} />
          </div>
        )}
      </div>
      <div className={`flex flex-col flex-1 p-3 ${business.logoUrl ? "pt-6" : ""}`}>
        {business.category && <span className="text-[10px] font-bold uppercase tracking-widest text-sky-600 mb-0.5">{business.category.name}</span>}
        <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 mb-1.5 group-hover:text-sky-600 transition-colors">{business.name}</h3>
        <p className="text-[11px] text-gray-500">📍 {business.city}, {business.country}</p>
        {business._count && <p className="text-[10px] text-gray-400 mt-1.5">⭐ {business._count.reviews} review{business._count.reviews !== 1 ? "s" : ""}</p>}
      </div>
    </Link>
  );
}
