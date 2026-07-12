"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import { EventItem, Business, Post } from "../lib/types";
import { EventCard } from "../components/EventCard";
import { BusinessCard } from "../components/BusinessCard";
import { SkeletonCard } from "../components/SkeletonCard";
import { HighlightSlider } from "../components/HighlightSlider";
import { EventVideoSlider } from "../components/EventVideoSlider";
import { LocationSelector } from "../components/LocationSelector";
import { useLocation } from "../lib/geolocation";
import { useAuth } from "../context/AuthContext";
import { buildProfile, recordSignal } from "../lib/preferences";
import { format } from "date-fns";

const CATS = [
  { key:"FESTIVAL",         label:"Festivals",        icon:"🎪", grad:"from-orange-400 to-rose-500" },
  { key:"WILDLIFE_SAFARI",  label:"Safari",           icon:"🦁", grad:"from-green-400 to-emerald-600" },
  { key:"CULTURAL_HERITAGE",label:"Culture",          icon:"🏛️", grad:"from-amber-400 to-orange-500" },
  { key:"ADVENTURE_OUTDOOR",label:"Adventure",        icon:"⛰️", grad:"from-teal-400 to-cyan-600" },
  { key:"CONCERT",          label:"Concerts",         icon:"🎵", grad:"from-violet-400 to-purple-600" },
  { key:"FOOD_DRINK",       label:"Food & Drink",     icon:"🍲", grad:"from-red-400 to-rose-500" },
  { key:"GUIDED_TOUR",      label:"Guided Tours",     icon:"🗺️", grad:"from-sky-400 to-blue-500" },
  { key:"CONFERENCE",       label:"Conferences",      icon:"🎤", grad:"from-indigo-400 to-violet-600" },
];

function SectionTitle({ children, link, linkLabel = "View all →" }: { children: React.ReactNode; link?: string; linkLabel?: string }) {
  return (
    <div className="section-row">
      <h2 className="section-title">{children}</h2>
      {link && <Link href={link} className="text-sm font-semibold text-sky-600 hover:text-sky-700 transition-colors">{linkLabel}</Link>}
    </div>
  );
}

export default function HomePage() {
  const { location, detectGps } = useLocation();
  const { user } = useAuth();

  const [forYou, setForYou] = useState<{ events: EventItem[]; source: string }>({ events: [], source: "popular" });
  const [nearby, setNearby] = useState<EventItem[]>([]);
  const [nearbyBiz, setNearbyBiz] = useState<Business[]>([]);
  const [international, setInternational] = useState<EventItem[]>([]);
  const [trending, setTrending] = useState<EventItem[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [bizLoading, setBizLoading] = useState(true);
  const hasFiredGps = useRef(false);

  useEffect(() => {
    if (!hasFiredGps.current) { detectGps(); hasFiredGps.current = true; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // For-you feed: server personalization if logged in, else profile-driven client signal
  useEffect(() => {
    if (user) {
      api.get("/recommendations/for-you")
        .then(r => setForYou({ events: r.data.events, source: r.data.source }))
        .catch(() => {});
    } else {
      const profile = buildProfile();
      if (profile.hasData) {
        const params: any = { pageSize: 8, status: "APPROVED" };
        if (profile.categories.length) params.category = profile.categories[0].key;
        if (profile.cities.length) params.city = profile.cities[0].key;
        api.get("/events", { params })
          .then(r => setForYou({ events: r.data.events, source: "personalized" }))
          .catch(() => {});
      }
    }
  }, [user]);

  // Location-based and trending feeds
  useEffect(() => {
    const params: any = { pageSize: 8 };
    if (location.latitude && location.longitude) {
      params.lat = location.latitude; params.lng = location.longitude; params.radiusKm = 200;
    }
    setLoading(true);
    Promise.all([
      api.get("/events", { params }),
      api.get("/events", { params: { scope: "INTERNATIONAL", pageSize: 6 } }),
      api.get("/events", { params: { pageSize: 8, sortBy: "viewCount" } }),
      api.get("/posts", { params: { pageSize: 3 } }),
    ]).then(([near, intl, trend, blog]) => {
      setNearby(near.data.events);
      setInternational(intl.data.events);
      setTrending(trend.data.posts || trend.data.events || []);
      setPosts(blog.data.posts || []);
    }).finally(() => setLoading(false));

    // Nearby businesses
    const bizParams: any = { pageSize: 8 };
    if (location.latitude && location.longitude) {
      bizParams.lat = location.latitude; bizParams.lng = location.longitude; bizParams.radiusKm = 50;
    }
    setBizLoading(true);
    api.get("/businesses", { params: bizParams })
      .then(r => setNearbyBiz(r.data.businesses))
      .finally(() => setBizLoading(false));
  }, [location.latitude, location.longitude]);

  const showForYou = forYou.events.length > 0;

  return (
    <div className="animate-fade-in">
      {/* ── VIDEO SLIDESHOW ──────────────────────────────────── */}
      <EventVideoSlider />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-700 via-blue-700 to-indigo-800">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 animate-float pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-sky-400/10 animate-float pointer-events-none" style={{animationDelay:"2s"}} />

        <div className="relative max-w-3xl mx-auto px-6 sm:px-9 pt-[4.5rem] pb-24 sm:pt-24 sm:pb-[7.5rem] text-center">
          <p className="text-sky-200 text-xs font-bold uppercase tracking-widest mb-3">Events · Businesses · Destinations</p>
          <h1 className="font-extrabold text-white text-3xl sm:text-4xl md:text-5xl leading-tight mb-4">
            Discover<span className="text-sky-300"> what&apos;s happening</span><br className="hidden sm:block" />
            around you — and the world
          </h1>
          <p className="text-white/70 text-sm sm:text-base max-w-xl mx-auto mb-6 leading-relaxed">
            Verified events, local businesses, and tourism destinations. Smart recommendations that learn from your interests — the more you explore, the better it gets.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <LocationSelector />
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/events" className="btn-primary !px-7 !py-3 !text-base !rounded-xl shadow-glow-lg">Browse events</Link>
            <Link href="/businesses" className="btn-secondary !px-7 !py-3 !text-base !rounded-xl !bg-white/10 !border-white/30 !text-white hover:!bg-white/20">Find businesses</Link>
            <Link href="/search" className="btn-secondary !px-7 !py-3 !text-base !rounded-xl !bg-white/10 !border-white/30 !text-white hover:!bg-white/20">🔍 Search</Link>
          </div>
        </div>
      </section>

      {/* ── HIGHLIGHT SLIDER ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 sm:px-9 -mt-6 relative z-10 mb-10">
        <HighlightSlider />
      </section>

      {/* ── FOR YOU (personalized) ─────────────────────────── */}
      {showForYou && (
        <section className="max-w-7xl mx-auto px-6 sm:px-9 mb-[4.5rem]">
          <div className="section-row">
            <div className="flex items-center gap-2.5">
              <h2 className="section-title">
                {user ? `✨ For you, ${user.name.split(" ")[0]}` : "✨ Based on your interests"}
              </h2>
              <span className="algo-chip">
                {forYou.source === "personalized" ? "🎯 Personalized" : forYou.source === "collaborative" ? "👥 Collaborative" : "🔥 Popular"}
              </span>
            </div>
            <Link href="/events" className="text-sm font-semibold text-sky-600 hover:text-sky-700">View all →</Link>
          </div>
          <div className="listing-grid stagger">
            {forYou.events.map(e => <EventCard key={e.id} event={e} algoSource={forYou.source} />)}
          </div>
        </section>
      )}

      {/* ── CATEGORIES ───────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 sm:px-9 mb-[4.5rem]">
        <SectionTitle>Browse by category</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CATS.map(c => (
            <Link key={c.key} href={`/events?category=${c.key}`}
              className="card-base card-hover shine group flex flex-col items-center gap-2.5 p-5 text-center cursor-pointer">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${c.grad} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`} style={{fontSize:"1.6rem"}}>{c.icon}</div>
              <span className="text-sm font-semibold text-gray-800">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── NEAR YOU ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 sm:px-9 mb-[4.5rem]">
        <SectionTitle link="/events">📍 Events near you</SectionTitle>
        {loading ? (
          <div className="listing-grid">{[...Array(8)].map((_,i) => <SkeletonCard key={i} />)}</div>
        ) : nearby.length ? (
          <div className="listing-grid stagger">{nearby.map(e => <EventCard key={e.id} event={e} />)}</div>
        ) : (
          <div className="card-base p-8 text-center">
            <p className="text-2xl mb-2">🗺️</p>
            <p className="text-gray-600 font-semibold mb-1">No nearby events yet</p>
            <p className="text-gray-400 text-sm">Try <button onClick={detectGps} className="text-sky-600 underline font-semibold">enabling location</button> or <Link href="/events" className="text-sky-600 underline font-semibold">browse all events</Link>.</p>
          </div>
        )}
      </section>

      {/* ── FREE EVENTS BANNER ───────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 sm:px-9 mb-[4.5rem]">
        <Link href="/events?priceType=FREE"
          className="block card-base shine overflow-hidden hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-7 sm:px-12 py-12 flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1.5">Explore at no cost</p>
              <h3 className="font-extrabold text-white text-2xl sm:text-3xl mb-1">Free Events Near You</h3>
              <p className="text-white/80 text-sm">Festivals, cultural experiences, tours and more — completely free to attend.</p>
            </div>
            <span className="text-6xl hidden sm:block group-hover:scale-110 transition-transform">🎟️</span>
          </div>
        </Link>
      </section>

      {/* ── NEARBY BUSINESSES ────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 sm:px-9 mb-[4.5rem]">
        <SectionTitle link="/businesses">🏪 Businesses & places near you</SectionTitle>
        {bizLoading ? (
          <div className="listing-grid">{[...Array(4)].map((_,i) => <SkeletonCard key={i} />)}</div>
        ) : nearbyBiz.length ? (
          <div className="listing-grid stagger">{nearbyBiz.map(b => <BusinessCard key={b.id} business={b} />)}</div>
        ) : (
          <div className="card-base p-8 text-center">
            <p className="text-gray-400 text-sm">No businesses listed near you yet. <Link href="/businesses/create" className="text-sky-600 underline font-semibold">Be the first →</Link></p>
          </div>
        )}
      </section>

      {/* ── INTERNATIONAL ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 sm:px-9 mb-[4.5rem]">
        <SectionTitle link="/events?scope=INTERNATIONAL">🌍 International opportunities</SectionTitle>
        {international.length ? (
          <div className="listing-grid-3 stagger">{international.map(e => <EventCard key={e.id} event={e} />)}</div>
        ) : (
          <div className="listing-grid">{[...Array(3)].map((_,i) => <SkeletonCard key={i} />)}</div>
        )}
      </section>

      {/* ── TRENDING ─────────────────────────────────────────── */}
      {trending.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 sm:px-9 mb-[4.5rem]">
          <SectionTitle link="/events?sortBy=viewCount">🔥 Trending events</SectionTitle>
          <div className="listing-grid-3 stagger">{trending.map(e => <EventCard key={e.id} event={e} />)}</div>
        </section>
      )}

      {/* ── TRAVEL BLOG ──────────────────────────────────────── */}
      {posts.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 sm:px-9 mb-[4.5rem]">
          <SectionTitle link="/blog">✍️ From the travel blog</SectionTitle>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map(p => (
              <Link key={p.id} href={`/blog/${p.slug}`}
                onClick={() => recordSignal({ postId:p.id, action:"view", tags:p.tags })}
                className="card-base card-hover shine group overflow-hidden flex flex-col">
                <div className="aspect-[16/9] overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 relative">
                  {p.coverImageUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.coverImageUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    : <div className="absolute inset-0 flex items-center justify-center text-4xl">✍️</div>}
                </div>
                <div className="p-4 flex-1">
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-2 mb-1.5 group-hover:text-sky-600 transition-colors">{p.title}</h3>
                  {p.excerpt && <p className="text-xs text-gray-500 line-clamp-2 mb-2">{p.excerpt}</p>}
                  <p className="text-[10px] text-gray-400">By {p.author.name} {p.publishedAt ? `· ${format(new Date(p.publishedAt), "d MMM yyyy")}` : ""}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── ORGANIZER CTA ────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 sm:px-9 mb-14">
        <div className="card-base p-8 sm:p-12 text-center bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 border border-sky-100">
          <h2 className="font-extrabold text-2xl sm:text-3xl text-gray-900 mb-3">Are you an organizer or business owner?</h2>
          <p className="text-gray-600 text-sm sm:text-base max-w-lg mx-auto mb-7">
            Individuals, companies, agents, and organizations can all list events and businesses. Every submission is reviewed by our team before going live.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/events/create" className="btn-primary !px-8 !py-3 !rounded-xl">Post an event</Link>
            <Link href="/businesses/create" className="btn-secondary !px-8 !py-3 !rounded-xl">List a business</Link>
            <Link href="/auth/register" className="btn-ghost !px-8 !py-3 !rounded-xl">Create account</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
