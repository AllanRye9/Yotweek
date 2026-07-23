"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import { EventItem, Business, Post } from "../lib/types";
import { EventCard } from "../components/EventCard";
import { BusinessCard } from "../components/BusinessCard";
import { SkeletonCard } from "../components/SkeletonCard";
import { HeroVideoUnit } from "../components/HeroVideoUnit";
import { useLocation } from "../lib/geolocation";
import { useAuth } from "../context/AuthContext";
import { buildProfile, recordSignal } from "../lib/preferences";
import { format } from "date-fns";
import { SafeImage } from "../components/SafeImage";

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

const WHY_YOTWEEK = [
  { icon:"🔒", title:"Verified Listings", desc:"Every event and business is reviewed by our team before it goes live.", color:"from-emerald-500 to-teal-600" },
  { icon:"🧠", title:"Smart Recommendations", desc:"The more you explore, the better yotweek gets at showing you what fits.", color:"from-violet-500 to-purple-600" },
  { icon:"🤝", title:"Community-Driven", desc:"Built around communities — join, discuss, and organize with people who share your interests.", color:"from-amber-500 to-orange-500" },
  { icon:"🌍", title:"Local & Global", desc:"From your neighborhood to international opportunities — all in one place.", color:"from-sky-500 to-blue-600" },
];

function SectionTitle({ children, subtitle, link, linkLabel = "View all", accent = "bg-sky-500" }:
  { children: React.ReactNode; subtitle?: string; link?: string; linkLabel?: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <div className="flex items-center gap-2">
          <span className={`w-1 h-6 ${accent} rounded-full inline-block`} />
          <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">{children}</h2>
        </div>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5 pl-3">{subtitle}</p>}
      </div>
      {link && (
        <Link href={link} className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 shrink-0 transition-colors">
          {linkLabel}
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </Link>
      )}
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
    <div className="animate-fade-in pb-4">
      {/* ── HERO (video slideshow + text, merged) ───────────────── */}
      <HeroVideoUnit />

      <div className="max-w-7xl mx-auto px-6 sm:px-9 py-3 space-y-5 sm:space-y-6">
        {/* ── FOR YOU (personalized) ─────────────────────────── */}
        {showForYou && (
          <section className="animate-fade-up">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-1 h-6 bg-violet-500 rounded-full inline-block" />
                  <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">
                    {user ? `✨ For you, ${user.name.split(" ")[0]}` : "✨ Based on your interests"}
                  </h2>
                  <span className="algo-chip">
                    {forYou.source === "personalized" ? "🎯 Personalized" : forYou.source === "collaborative" ? "👥 Collaborative" : "🔥 Popular"}
                  </span>
                </div>
              </div>
              <Link href="/events" className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 shrink-0">
                View all
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
              </Link>
            </div>
            <div className="listing-grid stagger">
              {forYou.events.map(e => <EventCard key={e.id} event={e} algoSource={forYou.source} />)}
            </div>
          </section>
        )}

        {/* ── CATEGORIES ───────────────────────────────────────── */}
        <section className="animate-fade-up">
          <SectionTitle accent="bg-amber-500" subtitle="Jump straight to what you're into">Browse by category</SectionTitle>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
            {CATS.map(c => (
              <Link key={c.key} href={`/events?category=${c.key}`}
                className="card-base card-hover shine group flex flex-col items-center gap-1.5 p-3 text-center cursor-pointer">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.grad} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`} style={{fontSize:"1.1rem"}}>{c.icon}</div>
                <span className="text-xs font-semibold text-gray-800 leading-tight">{c.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── NEAR YOU ─────────────────────────────────────────── */}
        <section className="animate-fade-up">
          <SectionTitle link="/events" accent="bg-sky-500">📍 Events near you</SectionTitle>
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
        <section className="animate-fade-up">
          <Link href="/events?priceType=FREE"
            className="group block rounded-xl overflow-hidden relative hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300">
            <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-600 px-7 sm:px-12 py-8 flex items-center justify-between">
              <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              </div>
              <div className="relative">
                <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1.5">Explore at no cost</p>
                <h3 className="font-extrabold text-white text-xl sm:text-2xl mb-1">Free Events Near You</h3>
                <p className="text-white/80 text-sm">Festivals, cultural experiences, tours and more — completely free to attend.</p>
              </div>
              <span className="relative text-5xl hidden sm:block group-hover:scale-110 transition-transform">🎟️</span>
            </div>
          </Link>
        </section>

        {/* ── NEARBY BUSINESSES ────────────────────────────────── */}
        <section className="animate-fade-up">
          <SectionTitle link="/businesses" accent="bg-teal-500">🏪 Businesses & places near you</SectionTitle>
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
        <section className="animate-fade-up">
          <SectionTitle link="/events?scope=INTERNATIONAL" accent="bg-indigo-500">🌍 International opportunities</SectionTitle>
          {international.length ? (
            <div className="listing-grid-3 stagger">{international.map(e => <EventCard key={e.id} event={e} />)}</div>
          ) : (
            <div className="listing-grid">{[...Array(3)].map((_,i) => <SkeletonCard key={i} />)}</div>
          )}
        </section>

        {/* ── TRENDING ─────────────────────────────────────────── */}
        {trending.length > 0 && (
          <section className="animate-fade-up">
            <SectionTitle link="/events?sortBy=viewCount" accent="bg-rose-500">🔥 Trending events</SectionTitle>
            <div className="listing-grid-3 stagger">{trending.map(e => <EventCard key={e.id} event={e} />)}</div>
          </section>
        )}

        {/* ── TRAVEL BLOG ──────────────────────────────────────── */}
        {posts.length > 0 && (
          <section className="animate-fade-up">
            <SectionTitle link="/blog" accent="bg-fuchsia-500">✍️ From the travel blog</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map(p => (
                <Link key={p.id} href={`/blog/${p.slug}`}
                  onClick={() => recordSignal({ postId:p.id, action:"view", tags:p.tags })}
                  className="card-base card-hover shine group overflow-hidden flex flex-col">
                  <div className="aspect-[16/9] overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300 relative">
                    <SafeImage src={p.coverImageUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      fallback={<div className="absolute inset-0 flex items-center justify-center text-4xl">✍️</div>} />
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

        {/* ── WHY YOTWEEK ──────────────────────────────────────── */}
        <section className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 sm:p-8 animate-fade-up">
          <div className="text-center mb-5">
            <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">Why yotweek?</h2>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">Promote active and engaging living</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger">
            {WHY_YOTWEEK.map(f => (
              <div key={f.title} className="text-center group">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-xl sm:text-2xl shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                  <span>{f.icon}</span>
                </div>
                <h3 className="font-bold text-gray-900 text-xs sm:text-sm mb-0.5">{f.title}</h3>
                <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── ORGANIZER CTA ────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 rounded-xl px-6 sm:px-10 py-8 sm:py-10 text-white animate-fade-up">
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          </div>
          <div className="relative text-center">
            <h2 className="font-extrabold text-xl sm:text-2xl mb-2">Are you an organizer or business owner?</h2>
            <p className="text-white/80 text-sm max-w-lg mx-auto mb-6">
              Individuals, companies, agents, and organizations can all list events and businesses. Every submission is reviewed by our team before going live.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/events/create" className="bg-white text-sky-700 font-bold px-6 py-2.5 rounded-xl hover:bg-yellow-300 hover:text-sky-900 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-sm">Post an event</Link>
              <Link href="/businesses/create" className="border-2 border-white/70 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-white/10 transition-all text-sm">List a business</Link>
              <Link href="/auth/register" className="text-white/90 font-semibold px-6 py-2.5 rounded-xl hover:bg-white/10 transition-all text-sm">Create account</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
