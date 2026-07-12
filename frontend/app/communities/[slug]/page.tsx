"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";
import { Community, EventItem, Business } from "../../../lib/types";
import { EventCard } from "../../../components/EventCard";
import { BusinessCard } from "../../../components/BusinessCard";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";

export default function CommunityDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [community, setCommunity] = useState<Community | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [tab, setTab] = useState<"events" | "businesses">("events");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    api.get(`/communities/${slug}`)
      .then(r => { setCommunity(r.data.community); setIsMember(r.data.isMember); })
      .catch(() => router.push("/communities"));
  }, [slug, router]);

  useEffect(() => {
    if (!community) return;
    api.get(`/communities/${slug}/events`).then(r => setEvents(r.data.events));
    api.get(`/communities/${slug}/businesses`).then(r => setBusinesses(r.data.businesses));
  }, [community, slug]);

  async function toggleMembership() {
    if (!user) { router.push("/auth/login"); return; }
    if (!community) return;
    setJoining(true);
    try {
      if (isMember) {
        await api.post(`/communities/${community.id}/leave`);
        setIsMember(false);
        toast.info("Left the community.");
      } else {
        await api.post(`/communities/${community.id}/join`);
        setIsMember(true);
        toast.success("You're in! Welcome to the community.");
      }
      setCommunity(c => c ? { ...c, _count: { ...c._count, members: c._count.members + (isMember ? -1 : 1) } } : c);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not update membership.");
    } finally {
      setJoining(false);
    }
  }

  if (!community) return (
    <div className="page-shell py-9 space-y-4 animate-pulse">
      <div className="aspect-[3/1] shimmer rounded-2xl bg-slate-100" />
      <div className="card-base p-6 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-4 shimmer bg-slate-100 rounded w-3/4" />)}</div>
    </div>
  );

  const isCreator = user?.id === community.creator.id;

  return (
    <div className="animate-fade-in">
      <div className="relative aspect-[3/1] sm:aspect-[4/1] overflow-hidden bg-gradient-to-br from-teal-400 to-sky-600">
        {community.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={community.coverImageUrl} alt={community.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-6xl">🤝</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 page-shell pb-5">
          <h1 className="font-extrabold text-2xl sm:text-4xl text-white drop-shadow">{community.name}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-white/80 mt-1.5">
            {(community.city || community.country) && <span>📍 {[community.city, community.country].filter(Boolean).join(", ")}</span>}
            {community.interestTag && <span>🏷️ {community.interestTag}</span>}
            <span>👥 {community._count.members} member{community._count.members !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      <div className="page-shell py-9">
        <div className="grid gap-9 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <div className="card-base p-5 sm:p-7">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{community.description}</p>
              <p className="text-xs text-gray-400 mt-4">Started by {community.creator.organizationName || community.creator.name}</p>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setTab("events")} className={tab === "events" ? "tab-pill-active" : "tab-pill-inactive"}>🎪 Events ({community._count.events})</button>
              <button onClick={() => setTab("businesses")} className={tab === "businesses" ? "tab-pill-active" : "tab-pill-inactive"}>🏪 Businesses ({community._count.businesses})</button>
            </div>

            {tab === "events" ? (
              events.length === 0 ? (
                <div className="card-base p-10 text-center text-gray-400 text-sm">No events posted in this community yet.</div>
              ) : (
                <div className="listing-grid">{events.map(e => <EventCard key={e.id} event={e} />)}</div>
              )
            ) : (
              businesses.length === 0 ? (
                <div className="card-base p-10 text-center text-gray-400 text-sm">No businesses posted in this community yet.</div>
              ) : (
                <div className="listing-grid">{businesses.map(b => <BusinessCard key={b.id} business={b} />)}</div>
              )
            )}
          </div>

          <div className="space-y-4">
            <div className="card-base p-5 text-center">
              <p className="font-extrabold text-3xl text-gray-900">{community._count.members}</p>
              <p className="text-xs text-gray-400 mb-4">member{community._count.members !== 1 ? "s" : ""}</p>
              {isCreator ? (
                <p className="text-xs text-gray-400">You created this community.</p>
              ) : (
                <button onClick={toggleMembership} disabled={joining}
                  className={isMember ? "btn-secondary w-full !justify-center" : "btn-primary w-full !justify-center"}>
                  {joining ? "…" : isMember ? "✓ Member — leave" : "+ Join community"}
                </button>
              )}
            </div>
            <div className="card-base p-5">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Post here</p>
              <p className="text-xs text-gray-400 mb-3">Members can tag their events and businesses to this community when creating a listing.</p>
              <div className="flex flex-col gap-2">
                <Link href="/events/create" className="btn-secondary !text-xs !py-2 !justify-center">+ List an event</Link>
                <Link href="/businesses/create" className="btn-secondary !text-xs !py-2 !justify-center">+ List a business</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
