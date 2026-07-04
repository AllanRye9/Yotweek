"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import { EventItem } from "../lib/types";
import { EventCard } from "../components/EventCard";
import { StatsBar } from "../components/StatsBar";
import { LocationSelector } from "../components/LocationSelector";
import { HighlightSlider } from "../components/HighlightSlider";
import { TestimonialsSection } from "../components/TestimonialsSection";
import { useLocation } from "../lib/geolocation";

const CATEGORIES: { key: string; label: string; icon: string }[] = [
  { key: "FESTIVAL", label: "Festivals", icon: "🎪" },
  { key: "CULTURAL_HERITAGE", label: "Culture & Heritage", icon: "🏛️" },
  { key: "WILDLIFE_SAFARI", label: "Wildlife & Safari", icon: "🦁" },
  { key: "ADVENTURE_OUTDOOR", label: "Adventure & Outdoor", icon: "⛰️" },
  { key: "CONCERT", label: "Concerts", icon: "🎵" },
  { key: "FOOD_DRINK", label: "Food & Drink", icon: "🍲" },
  { key: "CONFERENCE", label: "Conferences", icon: "🎤" },
  { key: "GUIDED_TOUR", label: "Guided Tours", icon: "🗺️" },
];

export default function HomePage() {
  const { location, detectGps } = useLocation();
  const [nearby, setNearby] = useState<EventItem[]>([]);
  const [international, setInternational] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detectGps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params: any = { pageSize: 6 };
    if (location.latitude && location.longitude) {
      params.lat = location.latitude;
      params.lng = location.longitude;
      params.radiusKm = 150;
    }
    setLoading(true);
    api
      .get("/events", { params })
      .then((res) => setNearby(res.data.events))
      .finally(() => setLoading(false));

    api
      .get("/events", { params: { scope: "INTERNATIONAL", pageSize: 6 } })
      .then((res) => setInternational(res.data.events));
  }, [location.latitude, location.longitude]);

  return (
    <div>
      <section className="bg-gradient-to-b from-sunset-100 to-transparent py-14">
        <div className="container-page">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-sunset-600">
            Events, places & businesses — near and far
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight text-savanna-900 sm:text-5xl">
            Discover what&apos;s happening around you — and around the world
          </h1>
          <p className="mt-4 max-w-2xl text-savanna-900/70">
            Verified events and local businesses from registered users, companies, agents, and organizations.
            Every listing is clearly marked free or paid, and reviewed by our team before it goes live.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <LocationSelector />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/events" className="btn-primary">
              Browse all events
            </Link>
            <Link href="/events/create" className="btn-secondary">
              List your event
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page -mt-4 mb-14">
        <HighlightSlider />
      </section>

      <section className="container-page mb-14">
        <StatsBar />
      </section>

      <section className="container-page mb-14">
        <h2 className="mb-4 font-display text-2xl font-bold">Browse by category</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link
              key={c.key}
              href={`/events?category=${c.key}`}
              className="card flex flex-col items-center gap-2 px-3 py-5 text-center transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="text-2xl">{c.icon}</span>
              <span className="text-sm font-medium">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page mb-14">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">Near you</h2>
          <Link href="/events" className="text-sm font-semibold text-sunset-600">
            View all →
          </Link>
        </div>
        {loading ? (
          <p className="text-sm text-savanna-900/50">Finding events near you…</p>
        ) : nearby.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nearby.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-savanna-900/50">
            No nearby events yet — try setting your location, or browse international opportunities below.
          </p>
        )}
      </section>

      <section className="container-page mb-14">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">International opportunities</h2>
          <Link href="/events?scope=INTERNATIONAL" className="text-sm font-semibold text-sunset-600">
            View all →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {international.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      </section>

      <TestimonialsSection />
    </div>
  );
}
