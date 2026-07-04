"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function AdminOverviewPage() {
  const { user, loading } = useAuth();
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    if (user?.role === "ADMIN") api.get("/admin/overview").then((res) => setOverview(res.data));
  }, [user]);

  if (loading) return <div className="container-page py-10 text-sm text-savanna-900/50">Loading…</div>;
  if (user?.role !== "ADMIN") {
    return <div className="container-page py-16 text-center text-sm text-savanna-900/60">Admins only.</div>;
  }

  const cards = [
    { label: "Pending listings", value: overview?.pendingEvents, href: "/admin/events" },
    { label: "Flagged listings", value: overview?.flaggedEvents, href: "/admin/events" },
    { label: "Open reports", value: overview?.pendingReports, href: "/admin/reports" },
    { label: "Total users", value: overview?.totalUsers, href: "#" },
    { label: "Total events", value: overview?.totalEvents, href: "#" },
  ];

  return (
    <div className="container-page py-10">
      <h1 className="mb-8 font-display text-3xl font-bold">Admin overview</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card p-5 text-center transition hover:-translate-y-0.5 hover:shadow-md">
            <p className="font-display text-3xl font-bold">{c.value ?? "—"}</p>
            <p className="mt-1 text-xs text-savanna-900/60">{c.label}</p>
          </Link>
        ))}
      </div>
      <div className="mt-10 flex gap-4">
        <Link href="/admin/events" className="btn-primary">Review pending listings</Link>
        <Link href="/admin/reports" className="btn-secondary">View reports</Link>
      </div>
    </div>
  );
}
