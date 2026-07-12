"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { EventCard } from "../../components/EventCard";
import { SkeletonCard } from "../../components/SkeletonCard";
import { buildProfile } from "../../lib/preferences";
import { useToast } from "../../components/Toast";
import { getYouTubeId } from "../../lib/media";
import { useCurrency } from "../../context/CurrencyContext";
import { formatMoney } from "../../lib/currency";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";

const SP: Record<string,string> = {
  PENDING:"bg-amber-100 text-amber-700", APPROVED:"bg-emerald-100 text-emerald-700",
  REJECTED:"bg-red-100 text-red-700", HIDDEN:"bg-gray-100 text-gray-600",
  COMPLETED:"bg-blue-100 text-blue-700", CANCELLED:"bg-gray-100 text-gray-600",
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const toast = useToast();
  const { currency: displayCurrency, convert } = useCurrency();
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [savedEvents, setSavedEvents] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [tab, setTab] = useState<"overview"|"listings"|"bookings"|"saved"|"interests"|"payouts"|"videos">("overview");
  const profile = buildProfile();
  const canUploadVideos = user?.role === "ADMIN" || user?.isVerifiedOrganizer;

  const VIDEO_EMPTY = { title: "", caption: "", videoUrl: "", timing: "UPCOMING" as "PAST"|"UPCOMING" };
  const [videoForm, setVideoForm] = useState(VIDEO_EMPTY);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [submittingVideo, setSubmittingVideo] = useState(false);

  async function handleVideoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("video/")) { toast.error("Please choose a video file."); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error("Video is too large (max 50MB)."); return; }
    setUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append("video", file);
      const r = await api.post("/uploads/video", formData);
      setVideoForm(f => ({ ...f, videoUrl: r.data.url }));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not upload video.");
    } finally {
      setUploadingVideo(false);
    }
  }

  async function submitVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!videoForm.title.trim() || !videoForm.videoUrl.trim()) { toast.error("Title and video are required."); return; }
    setSubmittingVideo(true);
    try {
      await api.post("/event-videos", videoForm);
      toast.success(user?.role === "ADMIN" ? "Clip added to the homepage slider." : "Clip submitted for admin review.");
      setVideoForm(VIDEO_EMPTY);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not submit clip.");
    } finally {
      setSubmittingVideo(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get("/events/organizer/mine").then(r => setMyEvents(r.data.events)),
      api.get("/bookings/mine").then(r => setBookings(r.data.bookings)),
      api.get("/users/me/saved-events").then(r => setSavedEvents(r.data.savedEvents)),
      api.get("/notifications").then(r => setNotifications(r.data.notifications ?? [])).catch(() => {}),
      ...(user.role !== "USER" ? [api.get("/bookings/organizer/payouts").then(r => setPayouts(r.data))] : []),
    ]).finally(() => setDataLoading(false));
  }, [user]);

  // ── Derived analytics for the Overview tab ────────────────────────────
  const stats = useMemo(() => {
    const totalListings = myEvents.length;
    const totalBookingsReceived = myEvents.reduce((sum, e) => sum + (e._count?.bookings || 0), 0);
    const totalViews = myEvents.reduce((sum, e) => sum + (e.viewCount || 0), 0);
    const totalTicketsSold = myEvents.reduce((sum, e) => sum + (e.ticketsSold || 0), 0);
    const pendingCount = myEvents.filter(e => e.status === "PENDING").length;
    const flaggedCount = myEvents.filter(e => e.isFlagged).length;

    const statusCounts: Record<string, number> = {};
    myEvents.forEach(e => { statusCounts[e.status] = (statusCounts[e.status] || 0) + 1; });
    const statusPie = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    const topEvents = [...myEvents]
      .sort((a, b) => (b.ticketsSold || 0) - (a.ticketsSold || 0))
      .slice(0, 5)
      .map(e => ({ name: e.title.length > 16 ? e.title.slice(0, 15) + "…" : e.title, Tickets: e.ticketsSold || 0, Views: e.viewCount || 0 }));

    const revenueByMonth: Record<string, number> = {};
    (payouts?.payments || []).forEach((p: any) => {
      if (!p.paidAt) return;
      const key = format(new Date(p.paidAt), "MMM yy");
      revenueByMonth[key] = (revenueByMonth[key] || 0) + Number(p.organizerPayoutAmount);
    });
    const revenueTrend = Object.entries(revenueByMonth).map(([month, amount]) => ({ month, Revenue: amount }));

    return { totalListings, totalBookingsReceived, totalViews, totalTicketsSold, pendingCount, flaggedCount, statusPie, topEvents, revenueTrend };
  }, [myEvents, payouts]);

  const unreadNotifCount = notifications.filter(n => !n.read).length;
  const isOrganizerRole = user?.role !== "USER";
  const PIE_COLORS: Record<string, string> = {
    PENDING: "#f59e0b", APPROVED: "#10b981", REJECTED: "#ef4444", HIDDEN: "#94a3b8",
  };

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
    { key:"overview", label:"Overview", icon:"📈", count: unreadNotifCount > 0 ? unreadNotifCount : null },
    { key:"listings", label:"My Listings", icon:"🎪", count:myEvents.length },
    { key:"bookings", label:"Bookings", icon:"🎫", count:bookings.length },
    { key:"saved",    label:"Saved", icon:"❤️", count:savedEvents.length },
    { key:"interests",label:"My Interests", icon:"🎯", count:null },
    ...(user.role !== "USER" ? [{ key:"payouts", label:"Payouts", icon:"💰", count:null }] : []),
    ...(canUploadVideos ? [{ key:"videos", label:"Event Videos", icon:"🎬", count:null }] : []),
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
        <div className="max-w-7xl mx-auto px-6 sm:px-9 -mt-4 mb-4 relative z-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="card-base p-4 text-center"><p className="text-xs text-gray-400 mb-1">Total payout</p><p className="font-extrabold text-xl text-emerald-600">{Number(payouts.totalPayout).toLocaleString()}</p></div>
            <div className="card-base p-4 text-center"><p className="text-xs text-gray-400 mb-1">Platform fees</p><p className="font-extrabold text-xl text-gray-700">{Number(payouts.totalCommission).toLocaleString()}</p></div>
            <div className="card-base p-4 text-center hidden sm:block"><p className="text-xs text-gray-400 mb-1">Listings</p><p className="font-extrabold text-xl text-sky-600">{myEvents.length}</p></div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 sm:px-9 py-9">
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
            {tab==="overview" && (
              <div className="space-y-6">
                {/* Quick actions */}
                <div className="flex flex-wrap gap-2.5">
                  <Link href="/events/create" className="btn-primary !px-4 !py-2 !text-sm">➕ List an event</Link>
                  <Link href="/businesses/create" className="btn-secondary !px-4 !py-2 !text-sm">🏪 List a business</Link>
                  <Link href="/events" className="btn-ghost !px-4 !py-2 !text-sm">🎪 Browse events</Link>
                  {isOrganizerRole && <button onClick={() => setTab("listings")} className="btn-ghost !px-4 !py-2 !text-sm">📋 Manage listings</button>}
                  {isOrganizerRole && <button onClick={() => setTab("payouts")} className="btn-ghost !px-4 !py-2 !text-sm">💰 View payouts</button>}
                </div>

                {/* KPI cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {isOrganizerRole ? (
                    <>
                      <div className="card-base p-4"><p className="text-xs text-gray-400 mb-1">🎪 Listings</p><p className="font-extrabold text-2xl text-gray-900">{stats.totalListings}</p></div>
                      <div className="card-base p-4"><p className="text-xs text-gray-400 mb-1">🎫 Bookings received</p><p className="font-extrabold text-2xl text-sky-600">{stats.totalBookingsReceived}</p></div>
                      <div className="card-base p-4"><p className="text-xs text-gray-400 mb-1">👁 Total views</p><p className="font-extrabold text-2xl text-gray-900">{stats.totalViews.toLocaleString()}</p></div>
                      <div className="card-base p-4"><p className="text-xs text-gray-400 mb-1">💰 Total payout</p><p className="font-extrabold text-2xl text-emerald-600">{payouts ? Number(payouts.totalPayout).toLocaleString() : "—"}</p></div>
                    </>
                  ) : (
                    <>
                      <div className="card-base p-4"><p className="text-xs text-gray-400 mb-1">🎫 My bookings</p><p className="font-extrabold text-2xl text-sky-600">{bookings.length}</p></div>
                      <div className="card-base p-4"><p className="text-xs text-gray-400 mb-1">❤️ Saved events</p><p className="font-extrabold text-2xl text-gray-900">{savedEvents.length}</p></div>
                      <div className="card-base p-4"><p className="text-xs text-gray-400 mb-1">🔔 Unread alerts</p><p className="font-extrabold text-2xl text-gray-900">{unreadNotifCount}</p></div>
                      <div className="card-base p-4"><p className="text-xs text-gray-400 mb-1">🎯 Interests tracked</p><p className="font-extrabold text-2xl text-gray-900">{profile.categories?.length || 0}</p></div>
                    </>
                  )}
                </div>

                {/* Alerts */}
                {(stats.pendingCount > 0 || stats.flaggedCount > 0) && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex flex-wrap gap-x-6 gap-y-1">
                    {stats.pendingCount > 0 && <span>⏳ {stats.pendingCount} listing{stats.pendingCount>1?"s":""} awaiting admin review.</span>}
                    {stats.flaggedCount > 0 && <span>⚠️ {stats.flaggedCount} listing{stats.flaggedCount>1?"s":""} flagged — check the Listings tab.</span>}
                  </div>
                )}

                {/* Charts */}
                {isOrganizerRole && stats.totalListings > 0 && (
                  <div className="grid lg:grid-cols-2 gap-4">
                    <div className="card-base p-5">
                      <h3 className="font-bold text-gray-900 text-sm mb-3">Top listings — views vs tickets sold</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={stats.topEvents}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          <Bar dataKey="Views" fill="#93c5fd" radius={[4,4,0,0]} />
                          <Bar dataKey="Tickets" fill="#0ea5e9" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {stats.revenueTrend.length > 0 ? (
                      <div className="card-base p-5">
                        <h3 className="font-bold text-gray-900 text-sm mb-3">Payout revenue over time</h3>
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart data={stats.revenueTrend}>
                            <defs>
                              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                            <Area type="monotone" dataKey="Revenue" stroke="#10b981" fill="url(#revFill)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="card-base p-5">
                        <h3 className="font-bold text-gray-900 text-sm mb-3">Listing status breakdown</h3>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={stats.statusPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3}>
                              {stats.statusPie.map((s, i) => <Cell key={i} fill={PIE_COLORS[s.name] || "#94a3b8"} />)}
                            </Pie>
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid lg:grid-cols-2 gap-4">
                  {/* Notifications */}
                  <div className="card-base p-5">
                    <h3 className="font-bold text-gray-900 text-sm mb-3">Recent activity & alerts</h3>
                    {notifications.length === 0 ? (
                      <p className="text-sm text-gray-400">You're all caught up — nothing new to report.</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {notifications.slice(0, 8).map((n: any) => (
                          <div key={n.id} className={`text-sm px-3 py-2 rounded-lg ${!n.read ? "bg-sky-50 text-sky-800" : "text-gray-500"}`}>{n.message}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recommendations */}
                  <div className="card-base p-5">
                    <h3 className="font-bold text-gray-900 text-sm mb-3">Recommended for you</h3>
                    {profile.hasData ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-500">Based on what you've explored, you tend to gravitate toward:</p>
                        <div className="flex flex-wrap gap-2">
                          {profile.categories.slice(0,5).map((c:any) => (
                            <Link key={c.key} href={`/events?category=${c.key}`} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors">
                              {c.key.replace(/_/g," ").toLowerCase()}
                            </Link>
                          ))}
                        </div>
                        {isOrganizerRole && (
                          <p className="text-xs text-gray-400 pt-1">Tip: listings in these categories tend to get discovered faster by users like you.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Browse a few events or businesses and we'll start tailoring suggestions here.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

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
                      <p className="text-xs text-gray-400 mt-0.5">{format(new Date(b.event.startDate),"d MMM yyyy")} · {b.quantity} ticket{b.quantity>1?"s":""} · {(() => {
                        const amt = Number(b.totalAmount) || 0;
                        const from = b.currency || "USD";
                        const c = from !== displayCurrency ? convert(amt, from) : amt;
                        return c === null ? formatMoney(amt, from) : formatMoney(c, from !== displayCurrency ? displayCurrency : from);
                      })()}</p>
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
                  <div className="text-center py-12">
                    <p className="text-4xl mb-3">🧠</p>
                    <p className="font-semibold text-gray-700 mb-1">No profile yet</p>
                    <p className="text-gray-400 text-sm max-w-sm mx-auto">Browse events and businesses to build your personalized interest profile. The more you explore, the better your recommendations get.</p>
                    <Link href="/events" className="btn-primary !px-6 !py-2.5 mt-4 inline-flex">Start exploring</Link>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-3 gap-9">
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

            {tab==="videos" && canUploadVideos && (
              <div className="card-base p-6 max-w-lg">
                <h2 className="font-bold text-gray-900 mb-1">Submit a clip for the homepage slider</h2>
                <p className="text-gray-400 text-sm mb-4">
                  {user.role === "ADMIN"
                    ? "As an admin, your clips go live immediately."
                    : "Your clips are reviewed by an admin before they appear on the homepage."}
                </p>
                <form onSubmit={submitVideo} className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title</label>
                    <input required value={videoForm.title} onChange={e => setVideoForm(f => ({ ...f, title: e.target.value }))} className="input-base" placeholder="Gulu Cultural Festival highlights" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Caption <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input value={videoForm.caption} onChange={e => setVideoForm(f => ({ ...f, caption: e.target.value }))} className="input-base" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Timing</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["UPCOMING","PAST"] as const).map(t => (
                        <button key={t} type="button" onClick={() => setVideoForm(f => ({ ...f, timing: t }))}
                          className={`py-2 rounded-xl border-2 text-xs font-semibold transition-all ${videoForm.timing===t ? "border-sky-500 bg-sky-50 text-sky-700" : "border-gray-200 text-gray-600 hover:border-sky-200"}`}>
                          {t === "UPCOMING" ? "🎬 Upcoming" : "📼 Past"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Video</label>
                    <div className="flex gap-3 items-center">
                      <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                        {uploadingVideo ? (
                          <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                        ) : videoForm.videoUrl && getYouTubeId(videoForm.videoUrl) ? (
                          <span className="text-xl">▶️</span>
                        ) : videoForm.videoUrl ? (
                          <video src={videoForm.videoUrl} muted autoPlay loop playsInline className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl text-gray-300">🎬</span>
                        )}
                      </div>
                      <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoPick} className="hidden" id="dashboard-video-input" />
                      <label htmlFor="dashboard-video-input" className="btn-secondary cursor-pointer !px-4 !py-2 !text-sm">
                        {uploadingVideo ? "Uploading…" : videoForm.videoUrl ? "Change video" : "Upload video"}
                      </label>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 mb-2">MP4, WEBM, or MOV — up to 50MB.</p>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-px flex-1 bg-gray-200" /><span className="text-[11px] text-gray-400">or</span><div className="h-px flex-1 bg-gray-200" />
                    </div>
                    <input
                      value={videoForm.videoUrl && getYouTubeId(videoForm.videoUrl) ? videoForm.videoUrl : ""}
                      onChange={e => setVideoForm(f => ({ ...f, videoUrl: e.target.value }))}
                      className="input-base"
                      placeholder="Paste a YouTube link — https://youtube.com/watch?v=…"
                    />
                  </div>
                  <button type="submit" disabled={submittingVideo} className="btn-primary !px-5 !py-2.5 w-full !justify-center">
                    {submittingVideo ? "Submitting…" : "Submit clip"}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
