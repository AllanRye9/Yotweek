"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { AdminGuard } from "../../components/AdminGuard";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
} from "recharts";

export default function AdminPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    api.get("/admin/overview").then(r => setOverview(r.data)).catch(() => {});
    api.get("/admin/analytics").then(r => setAnalytics(r.data)).catch(() => {});
  }, [user]);

  const cards = [
    { label: "Pending listings", value: overview?.pendingEvents, href: "/const/events", icon: "⏳", bg: "bg-amber-50 text-amber-600" },
    { label: "Pending businesses", value: overview?.pendingBusinesses, href: "/const/businesses", icon: "🏪", bg: "bg-teal-50 text-teal-600" },
    { label: "Pending communities", value: overview?.pendingCommunities, href: "/const/communities", icon: "🤝", bg: "bg-cyan-50 text-cyan-600" },
    { label: "Flagged listings", value: (overview?.flaggedEvents ?? 0) + (overview?.flaggedBusinesses ?? 0), href: "/const/events", icon: "⚠️", bg: "bg-red-50 text-red-600" },
    { label: "Open reports", value: overview?.pendingReports, href: "/const/reports", icon: "🚩", bg: "bg-rose-50 text-rose-600" },
    { label: "Pending reviews", value: (overview?.pendingReviews ?? 0) + (overview?.pendingBusinessReviews ?? 0), href: "/const/reviews", icon: "💬", bg: "bg-fuchsia-50 text-fuchsia-600" },
    { label: "Total users", value: overview?.totalUsers, href: "/const/users", icon: "👥", bg: "bg-sky-50 text-sky-600" },
    { label: "Total events", value: overview?.totalEvents, href: "/const/events", icon: "🎪", bg: "bg-indigo-50 text-indigo-600" },
    { label: "Total businesses", value: overview?.totalBusinesses, href: "/const/businesses", icon: "🗺️", bg: "bg-emerald-50 text-emerald-600" },
    { label: "Total communities", value: overview?.totalCommunities, href: "/const/communities", icon: "🌍", bg: "bg-violet-50 text-violet-600" },
    { label: "Total posts", value: overview?.totalPosts, href: "/const/communities", icon: "📝", bg: "bg-orange-50 text-orange-600" },
  ];

  const engagement = analytics ? [
    { label: "New signups (30d)", value: analytics.newSignupsLast30d, icon: "🆕" },
    { label: "New bookings (30d)", value: analytics.newBookingsLast30d, icon: "🎫" },
    { label: "Total bookings", value: analytics.totalBookings, icon: "📦" },
    { label: "Total reviews", value: analytics.totalReviews, icon: "⭐" },
  ] : [];

  return (
    <AdminGuard>
    <div className="animate-fade-in">
      <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-6 sm:px-9 py-12">
        <div className="max-w-7xl mx-auto"><h1 className="font-extrabold text-2xl sm:text-3xl">Admin Panel</h1><p className="text-white/70 text-sm mt-1">Platform-wide activity, moderation queues, and controls.</p></div>
      </div>
      <div className="max-w-7xl mx-auto px-6 sm:px-9 py-12 space-y-8">

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cards.map(c => (
            <Link key={c.label} href={c.href} className="card-base card-hover p-5 text-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mx-auto mb-2 ${c.bg}`}>{c.icon}</div>
              <p className="font-extrabold text-2xl text-gray-900">{c.value ?? "—"}</p>
              <p className="text-xs text-gray-400 mt-0.5">{c.label}</p>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/const/events" className="btn-primary !px-6 !py-2.5">Review pending listings</Link>
          <Link href="/const/businesses" className="btn-secondary !px-6 !py-2.5">Review businesses</Link>
          <Link href="/const/reviews" className="btn-secondary !px-6 !py-2.5">Moderate reviews</Link>
          <Link href="/const/testimonials" className="btn-secondary !px-6 !py-2.5">Moderate testimonials</Link>
          <Link href="/const/reports" className="btn-secondary !px-6 !py-2.5">View reports</Link>
          <Link href="/const/users" className="btn-secondary !px-6 !py-2.5">Manage users</Link>
          <Link href="/const/event-videos" className="btn-secondary !px-6 !py-2.5">🎬 Event videos</Link>
          <Link href="/const/highlights" className="btn-secondary !px-6 !py-2.5">🎞️ Hero slideshow</Link>
          <Link href="/const/settings" className="btn-secondary !px-6 !py-2.5">⚙️ Site settings</Link>
        </div>

        {analytics && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {engagement.map(e => (
                <div key={e.label} className="card-base p-4 text-center">
                  <p className="text-xl mb-1">{e.icon}</p>
                  <p className="font-extrabold text-xl text-gray-900">{e.value ?? "—"}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{e.label}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="card-base p-5">
                <h3 className="font-bold text-gray-900 text-sm mb-3">Daily activity — last 30 days</h3>
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={analytics.signupsTrend.map((s: any, i: number) => ({
                    date: format(new Date(s.date), "d MMM"),
                    Signups: s.count,
                    Bookings: analytics.bookingsTrend[i]?.count ?? 0,
                  }))}>
                    <defs>
                      <linearGradient id="signupsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="bookingsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Area type="monotone" dataKey="Signups" stroke="#0ea5e9" fill="url(#signupsFill)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Bookings" stroke="#a855f7" fill="url(#bookingsFill)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="card-base p-5">
                <h3 className="font-bold text-gray-900 text-sm mb-3">Events by category</h3>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={analytics.categoryMix} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="category" tick={{ fontSize: 9 }} width={110} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="card-base p-5">
                <h3 className="font-bold text-gray-900 text-sm mb-3">Top viewed events</h3>
                <div className="space-y-2">
                  {analytics.topEvents.map((e: any, i: number) => (
                    <div key={e.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 truncate flex-1">{i + 1}. {e.title}</span>
                      <span className="text-gray-400 text-xs ml-3 shrink-0">👁 {e.viewCount} · 🎫 {e.ticketsSold}</span>
                    </div>
                  ))}
                  {analytics.topEvents.length === 0 && <p className="text-gray-400 text-sm">No events yet.</p>}
                </div>
              </div>
              <div className="card-base p-5">
                <h3 className="font-bold text-gray-900 text-sm mb-3">Top viewed businesses</h3>
                <div className="space-y-2">
                  {analytics.topBusinesses.map((b: any, i: number) => (
                    <div key={b.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 truncate flex-1">{i + 1}. {b.name}</span>
                      <span className="text-gray-400 text-xs ml-3 shrink-0">👁 {b.viewCount}</span>
                    </div>
                  ))}
                  {analytics.topBusinesses.length === 0 && <p className="text-gray-400 text-sm">No businesses yet.</p>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
    </AdminGuard>
  );
}
