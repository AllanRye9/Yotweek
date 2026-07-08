"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { AdminGuard } from "../../components/AdminGuard";

export default function AdminPage() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<any>(null);
  useEffect(() => { if (user?.role==="ADMIN") api.get("/admin/overview").then(r=>setOverview(r.data)).catch(()=>{}); }, [user]);
  const cards = [
    { label:"Pending listings", value:overview?.pendingEvents, href:"/const/events", icon:"⏳", bg:"bg-amber-50 text-amber-600" },
    { label:"Flagged listings",  value:overview?.flaggedEvents,  href:"/const/events", icon:"⚠️", bg:"bg-red-50 text-red-600" },
    { label:"Open reports",      value:overview?.pendingReports, href:"/const/reports",icon:"🚩", bg:"bg-rose-50 text-rose-600" },
    { label:"Total users",       value:overview?.totalUsers,     href:"/const/users",  icon:"👥", bg:"bg-sky-50 text-sky-600" },
    { label:"Total events",      value:overview?.totalEvents,    href:"/const/events", icon:"🎪", bg:"bg-indigo-50 text-indigo-600" },
  ];
  return (
    <AdminGuard>
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
          <Link href="/const/events" className="btn-primary !px-6 !py-2.5">Review pending listings</Link>
          <Link href="/const/reports" className="btn-secondary !px-6 !py-2.5">View reports</Link>
          <Link href="/const/users" className="btn-secondary !px-6 !py-2.5">Manage users</Link>
          <Link href="/const/highlights" className="btn-secondary !px-6 !py-2.5">🎞️ Hero slideshow</Link>
        </div>
      </div>
    </div>
    </AdminGuard>
  );
}
