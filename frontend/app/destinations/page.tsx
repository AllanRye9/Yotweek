"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { EventItem } from "../../lib/types";

const FEATURED_DESTINATIONS = [
  {
    city: "Gulu",
    country: "Uganda",
    tagline: "Northern Uganda's cultural heart",
    blurb: "Acholi heritage sites, craft markets, and a growing festival scene make Gulu a rewarding base for cultural travel.",
    image: "https://images.unsplash.com/photo-1509233725247-49e657c54213?q=80&w=1200",
  },
  {
    city: "Kampala",
    country: "Uganda",
    tagline: "Uganda's vibrant capital",
    blurb: "Nightlife, museums, markets, and easy day-trips to Lake Victoria's shoreline.",
    image: "https://images.unsplash.com/photo-1523805009345-7448845a9e53?q=80&w=1200",
  },
  {
    city: "Nairobi",
    country: "Kenya",
    tagline: "Gateway to East African safaris",
    blurb: "Wildlife conservancies within city limits, plus a launchpad for the Maasai Mara.",
    image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?q=80&w=1200",
  },
];

export default function DestinationsPage() {
  const [byCity, setByCity] = useState<Record<string, EventItem[]>>({});

  useEffect(() => {
    api.get("/events", { params: { pageSize: 50 } }).then((res) => {
      const grouped: Record<string, EventItem[]> = {};
      for (const e of res.data.events as EventItem[]) {
        grouped[e.city] = grouped[e.city] || [];
        grouped[e.city].push(e);
      }
      setByCity(grouped);
    });
  }, []);

  return (
    <div className="container-page py-10">
      <h1 className="mb-2 font-display text-3xl font-bold">Destination guides</h1>
      <p className="mb-8 max-w-2xl text-sm text-savanna-900/60">
        Curated recommendations for popular destinations, with live events and tourism opportunities happening there right now.
      </p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURED_DESTINATIONS.map((d) => (
          <div key={d.city} className="card overflow-hidden">
            <div className="h-40 w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.image} alt={d.city} className="h-full w-full object-cover" />
            </div>
            <div className="p-5">
              <h2 className="font-display text-xl font-semibold">{d.city}, {d.country}</h2>
              <p className="mb-2 text-sm font-medium text-sunset-600">{d.tagline}</p>
              <p className="mb-3 text-sm text-savanna-900/70">{d.blurb}</p>
              <p className="mb-3 text-xs text-savanna-900/50">
                {byCity[d.city]?.length ?? 0} live event{(byCity[d.city]?.length ?? 0) === 1 ? "" : "s"} right now
              </p>
              <Link href={`/events?city=${d.city}`} className="text-sm font-semibold text-sunset-600">
                Explore {d.city} events →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
