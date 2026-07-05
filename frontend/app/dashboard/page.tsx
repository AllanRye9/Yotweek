"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { EventCard } from "../../components/EventCard";
import { SkeletonCard } from "../../components/SkeletonCard";
import { buildProfile } from "../../lib/preferences";

const SP: Record<string,string> = {
  PENDING:"bg-amber-100 text-amber-700", APPROVED:"bg-emerald-100 text-emerald-700",
  REJECTED:"bg-red-100 text-red-700", HIDDEN:"bg-gray-100 text-gray-600",
  COMPLETED:"bg-blue-100 text-blue-700", CANCELLED:"bg-gray-100 text-gray-600",
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [savedEvents, setSavedEvents] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [tab, setTab] = useState<"listings"|"bookings"|"saved"|"interests"|"payouts">("listings");
  const profile = buildProfile();

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get("/events/organizer/mine").then(r => setMyEvents(r.data.events)),
      api.get("/bookings/mine").then(r => setBookings(r.data.bookings)),
      api.get("/users/me/saved-events").then(r => setSavedEvents(r.data.savedEvents)),
      ...(user.role !== "USER" ? [api.get("/bookings/organizer/payouts").then(r => setPayouts(r.data))] : []),
    ]).finally(() => setDataLoading(false));
  }, [user]);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-400">Loading…</div>;
  if (!user) return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="card-base p-10 text-center max-w-md">
        <div style={{fontSize:"3rem"}} className="mb-4">📊</div>
        <h1 className="font-extrabold text-2xl text-gray-900 mb-2">Sign in to view your dashboard</h1>
        <Link href="/auth/login" className="btn-primary !px-8 !py-3 !rounded-xl mt-4 inline-flex">Sign in</Link>
      </div>
    </div>
  );

  const TABS = [
    { key:"listings", label:"My Listings", icon:"🎪", count:myEvents.length },
    { key:"bookings", label:"Bookings", icon:"🎫", count:bookings.length },
    { key:"saved",    label:"Saved", icon:"❤️", count:savedEvents.length },
    { key:"interests",label:"My Interests", icon:"🎯", count:null },
    ...(user.role !== "USER" ? [{ key:"payouts", label:"Payouts", icon:"💰", count:null }] : []),
  ] as const;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white text-2xl font-black shadow-glow border border-white/20">{user.name[0]}</div>
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-0.5">Dashboard</p>
              <h1 className="font-extrabold text-2xl sm:text-3xl text-white">{user.name}</h1>
              <p className="text-white/60 text-sm">{user.email} · <span className="capitalize">{user.role.toLowerCase()}</span></p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/events/create" className="btn-secondary !bg-white/10 !border-white/30 !text-white hover:!bg-white/20 !text-sm">+ List Event</Link>
            <Link href="/businesses/create" className="btn-secondary !bg-white/10 !border-white/30 !text-white hover:!bg-white/20 !text-sm">+ List Business</Link>
          </div>
        </div>
      </div>

      {payouts && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-4 mb-4 relative z-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="card-base p-4 text-center"><p className="text-xs text-gray-400 mb-1">Total payout</p><p className="font-extrabold text-xl text-emerald-600">{Number(payouts.totalPayout).toLocaleString()}</p></div>
            <div className="card-base p-4 text-center"><p className="text-xs text-gray-400 mb-1">Platform fees</p><p className="font-extrabold text-xl text-gray-700">{Number(payouts.totalCommission).toLocaleString()}</p></div>
            <div className="card-base p-4 text-center hidden sm:block"><p className="text-xs text-gray-400 mb-1">Listings</p><p className="font-extrabold text-xl text-sky-600">{myEvents.length}</p></div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)} className={tab===t.key?"tab-pill-active":"tab-pill-inactive"}>
              <span>{t.icon}</span> {t.label} {t.count!==null && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${tab===t.key?"bg-white/20 text-white":"bg-gray-100 text-gray-500"}`}>{t.count}</span>}
            </button>
          ))}
        </div>

        {dataLoading ? (
          <div className="listing-grid">{[...Array(4)].map((_,i) => <SkeletonCard key={i} />)}</div>
        ) : (
          <>
            {tab==="listings" && (myEvents.length===0 ? (
              <div className="card-base p-12 text-center"><p className="text-4xl mb-3">🎪</p><p className="font-semibold text-gray-700 mb-4">No listings yet</p><Link href="/events/create" className="btn-primary !px-6 !py-2.5">Post your first event</Link></div>
            ) : (
              <div className="space-y-3">
                {myEvents.map(e => (
                  <div key={e.id} className="card-base p-4 flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-2 items-center mb-1">
                        <h3 className="font-bold text-gray-900 truncate">{e.title}</h3>
                        <span className={`badge ${SP[e.status]||"bg-gray-100 text-gray-600"}`}>{e.status}</span>
                      </div>
                      <p className="text-xs text-gray-400">{format(new Date(e.startDate),"d MMM yyyy")} · {e.city}, {e.country}</p>
                      {e.isFlagged && <p className="text-xs text-amber-600 mt-0.5">⚠️ {e.flagReason}</p>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 shrink-0">
                      <span>👁 {e.viewCount}</span><span>🎫 {e.ticketsSold}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {tab==="bookings" && (bookings.length===0 ? (
              <div className="card-base p-12 text-center"><p className="text-4xl mb-3">🎫</p><p className="font-semibold text-gray-700 mb-4">No bookings yet</p><Link href="/events" className="btn-primary !px-6 !py-2.5">Browse events</Link></div>
            ) : (
              <div className="space-y-3">
                {bookings.map(b => (
                  <div key={b.id} className="card-base p-4 flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <Link href={`/events/${b.event.id}`} className="font-bold text-gray-900 hover:text-sky-600 truncate block">{b.event.title}</Link>
                      <p className="text-xs text-gray-400 mt-0.5">{format(new Date(b.event.startDate),"d MMM yyyy")} · {b.quantity} ticket{b.quantity>1?"s":""} · {b.currency} {Number(b.totalAmount).toLocaleString()}</p>
                    </div>
                    <span className={`badge ${SP[b.status]||"bg-gray-100 text-gray-600"}`}>{b.status}</span>
                  </div>
                ))}
              </div>
            ))}

            {tab==="saved" && (savedEvents.length===0 ? (
              <div className="card-base p-12 text-center"><p className="text-4xl mb-3">❤️</p><p className="font-semibold text-gray-700 mb-4">No saved events</p><Link href="/events" className="btn-primary !px-6 !py-2.5">Explore events</Link></div>
            ) : (
              <div className="listing-grid stagger">{savedEvents.map(e => <EventCard key={e.id} event={e} />)}</div>
            ))}

            {tab==="interests" && (
              <div className="card-base p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-bold text-gray-900">Your Interest Profile</h2>
                  <span className="algo-chip">🎯 AI-powered</span>
                </div>
                {!profile.hasData ? (
                  <div className="text-center py-8">
                    <p className="text-4xl mb-3">🧠</p>
                    <p className="font-semibold text-gray-700 mb-1">No profile yet</p>
                    <p className="text-gray-400 text-sm max-w-sm mx-auto">Browse events and businesses to build your personalized interest profile. The more you explore, the better your recommendations get.</p>
                    <Link href="/events" className="btn-primary !px-6 !py-2.5 mt-4 inline-flex">Start exploring</Link>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-3 gap-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Top categories</h3>
                      <div className="space-y-2">
                        {profile.categories.map(c => (
                          <div key={c.key} className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full" style={{width:`${Math.min(100,(c.score/profile.categories[0].score)*100)}%`}} />
                            </div>
                            <span className="text-xs text-gray-600 font-medium w-32 text-right">{c.key.replace(/_/g," ").toLowerCase()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Top cities</h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.cities.map(c => <span key={c.key} className="badge bg-sky-100 text-sky-700">📍 {c.key}</span>)}
                        {profile.cities.length===0 && <p className="text-xs text-gray-400">No cities yet</p>}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Top tags</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.tags.slice(0,8).map(t => <span key={t.key} className="badge bg-slate-100 text-slate-700">#{t.key}</span>)}
                        {profile.tags.length===0 && <p className="text-xs text-gray-400">No tags yet</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab==="payouts" && payouts && (
              <div className="space-y-3">
                {payouts.payments?.length===0 ? (
                  <div className="card-base p-12 text-center"><p className="text-4xl mb-3">💰</p><p className="font-semibold text-gray-700">No payments received yet</p></div>
                ) : payouts.payments?.map((p: any) => (
                  <div key={p.id} className="card-base p-4 flex flex-wrap items-center gap-4">
                    <div className="flex-1"><p className="font-bold text-gray-900">{p.booking?.event?.title}</p><p className="text-xs text-gray-400 mt-0.5">{format(new Date(p.paidAt),"d MMM yyyy")}</p></div>
                    <div className="text-right shrink-0"><p className="font-bold text-emerald-600">{p.currency} {Number(p.organizerPayoutAmount).toLocaleString()}</p><p className="text-xs text-gray-400">after {Number(p.commissionAmount).toLocaleString()} fee</p></div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
