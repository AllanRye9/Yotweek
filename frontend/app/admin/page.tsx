"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [overview, setOverview] = useState<any>(null);
  useEffect(() => { if (user?.role==="ADMIN") api.get("/admin/overview").then(r=>setOverview(r.data)).catch(()=>{}); }, [user]);
  if (loading) return null;
  if (user?.role!=="ADMIN") return <div className="max-w-7xl mx-auto px-4 py-16 text-center"><div className="card-base p-12 max-w-md mx-auto"><p className="text-4xl mb-4">🚫</p><p className="font-bold text-gray-700">Admin access only</p></div></div>;
  const cards = [
    { label:"Pending listings", value:overview?.pendingEvents, href:"/admin/events", icon:"⏳", bg:"bg-amber-50 text-amber-600" },
    { label:"Flagged listings",  value:overview?.flaggedEvents,  href:"/admin/events", icon:"⚠️", bg:"bg-red-50 text-red-600" },
    { label:"Open reports",      value:overview?.pendingReports, href:"/admin/reports",icon:"🚩", bg:"bg-rose-50 text-rose-600" },
    { label:"Pending businesses",value:overview?.pendingBusinesses, href:"/admin/businesses", icon:"🏪", bg:"bg-teal-50 text-teal-600" },
    { label:"Total users",       value:overview?.totalUsers,     href:"#",             icon:"👥", bg:"bg-sky-50 text-sky-600" },
    { label:"Total events",      value:overview?.totalEvents,    href:"/admin/events", icon:"🎪", bg:"bg-indigo-50 text-indigo-600" },
    { label:"Total businesses",  value:overview?.totalBusinesses,href:"/admin/businesses", icon:"🏬", bg:"bg-emerald-50 text-emerald-600" },
  ];
  return (
    <div className="animate-fade-in">
      <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-4 sm:px-6 py-8">
        <div className="max-w-7xl mx-auto"><h1 className="font-extrabold text-2xl sm:text-3xl">Admin Panel</h1></div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          {cards.map(c => (
            <Link key={c.label} href={c.href} className="card-base card-hover p-5 text-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mx-auto mb-2 ${c.bg}`}>{c.icon}</div>
              <p className="font-extrabold text-2xl text-gray-900">{c.value??"—"}</p>
              <p className="text-xs text-gray-400 mt-0.5">{c.label}</p>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/events" className="btn-primary !px-6 !py-2.5">Review pending listings</Link>
          <Link href="/admin/businesses" className="btn-primary !px-6 !py-2.5 !bg-teal-600 hover:!bg-teal-700">Review pending businesses</Link>
          <Link href="/admin/reports" className="btn-secondary !px-6 !py-2.5">View reports</Link>
          <Link href="/admin/testimonials" className="btn-secondary !px-6 !py-2.5">Moderate testimonials</Link>
          <Link href="/admin/highlights" className="btn-secondary !px-6 !py-2.5">Manage homepage slideshow</Link>
        </div>
      </div>
    </div>
  );
}
