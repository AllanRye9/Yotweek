import Link from "next/link";
import { format } from "date-fns";
import { EventItem } from "../lib/types";
import { PriceBadge } from "./PriceBadge";
import { VerifiedBadge } from "./VerifiedBadge";

export function EventCard({ event }: { event: EventItem }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative h-40 w-full bg-gradient-to-br from-sunset-400 to-sunset-600">
        {event.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.coverImageUrl} alt={event.title} className="h-full w-full object-cover" />
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          <PriceBadge priceType={event.priceType} price={event.price} currency={event.currency} />
          {event.scope === "INTERNATIONAL" && (
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-savanna-900">
              🌍 International
            </span>
          )}
        </div>
        {typeof event.distanceKm === "number" && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
            {event.distanceKm} km away
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-sunset-600">
          {event.category.replace(/_/g, " ")}
        </span>
        <h3 className="font-display text-lg font-semibold leading-snug text-savanna-900 group-hover:text-sunset-700">
          {event.title}
        </h3>
        <p className="text-sm text-savanna-900/70">
          {format(new Date(event.startDate), "EEE, d MMM yyyy")} · {event.city}, {event.country}
        </p>
        {event.organizer?.isVerifiedOrganizer && (
          <div>
            <VerifiedBadge />
          </div>
        )}
      </div>
    </Link>
  );
}
