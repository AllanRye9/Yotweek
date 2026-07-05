"use client";
import Link from "next/link";
import { useState } from "react";
import { format } from "date-fns";
import { EventItem } from "../lib/types";
import { recordSignal } from "../lib/preferences";

const CAT_ICON: Record<string, string> = {
  FESTIVAL:"🎪", CONFERENCE:"🎤", CONCERT:"🎵", SPORTS:"⚽",
  CULTURAL_HERITAGE:"🏛️", NIGHTLIFE:"🌙", WORKSHOP:"🛠️", GUIDED_TOUR:"🗺️",
  ADVENTURE_OUTDOOR:"⛰️", WILDLIFE_SAFARI:"🦁", FOOD_DRINK:"🍲",
  RELIGIOUS:"🕌", EXHIBITION:"🖼️", OTHER:"🌍",
};
const CAT_GRAD: Record<string, string> = {
  FESTIVAL:"from-orange-400 to-rose-500", CONCERT:"from-violet-400 to-purple-600",
  WILDLIFE_SAFARI:"from-green-400 to-emerald-600", ADVENTURE_OUTDOOR:"from-teal-400 to-cyan-600",
  CULTURAL_HERITAGE:"from-amber-400 to-orange-500", FOOD_DRINK:"from-red-400 to-rose-500",
  GUIDED_TOUR:"from-sky-400 to-blue-500", CONFERENCE:"from-indigo-400 to-violet-600",
  NIGHTLIFE:"from-purple-600 to-pink-600", SPORTS:"from-green-500 to-teal-600",
  WORKSHOP:"from-yellow-400 to-orange-500", RELIGIOUS:"from-amber-500 to-yellow-500",
  EXHIBITION:"from-pink-400 to-fuchsia-600", OTHER:"from-slate-400 to-slate-600",
};

export function EventCard({ event, algoSource }: { event: EventItem; algoSource?: string }) {
  const [imgFailed, setImgFailed] = useState(!event.coverImageUrl);
  const grad = CAT_GRAD[event.category] || "from-sky-400 to-indigo-500";
  const icon = CAT_ICON[event.category] || "🌍";

  const handleClick = () => {
    recordSignal({
      eventId: event.id, action: "view",
      category: event.category, city: event.city, tags: event.tags,
    });
  };

  return (
    <Link href={`/events/${event.id}`} onClick={handleClick}
      className="card-base card-hover shine group flex flex-col overflow-hidden">
      {/* Image / fallback */}
      <div className={`relative aspect-[4/3] overflow-hidden bg-gradient-to-br ${grad}`}>
        {!imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.coverImageUrl!} alt={event.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgFailed(true)} loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{fontSize:"3rem"}}>{icon}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Top badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <span className={event.priceType === "FREE" ? "badge-free" : "badge-paid"}>
            {event.priceType === "FREE" ? "FREE" : `${event.currency} ${Number(event.price).toLocaleString()}`}
          </span>
          {event.scope === "INTERNATIONAL" && <span className="badge-intl">🌍 Intl</span>}
          {event.organizer?.isVerifiedOrganizer && <span className="badge-verif">✓ Verified</span>}
        </div>

        {/* Algo source chip */}
        {algoSource && algoSource !== "default" && (
          <div className="absolute top-2 right-2">
            <span className="algo-chip">{algoSource === "personalized" ? "🎯 For you" : algoSource === "collaborative" ? "👥 Trending" : "✨ Popular"}</span>
          </div>
        )}

        {/* Distance */}
        {typeof event.distanceKm === "number" && (
          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">{event.distanceKm} km</span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-sky-600 mb-0.5">{event.category.replace(/_/g," ")}</span>
        <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 mb-1.5 group-hover:text-sky-600 transition-colors">{event.title}</h3>
        <p className="text-[11px] text-gray-500 flex items-center gap-1">📅 {format(new Date(event.startDate), "EEE d MMM yyyy")}</p>
        <p className="text-[11px] text-gray-500 flex items-center gap-1">📍 {event.city}, {event.country}</p>
        {event._count && (
          <p className="text-[10px] text-gray-400 mt-1.5">⭐ {event._count.reviews} review{event._count.reviews !== 1 ? "s" : ""} · 👀 {event.viewCount}</p>
        )}
      </div>
    </Link>
  );
}
