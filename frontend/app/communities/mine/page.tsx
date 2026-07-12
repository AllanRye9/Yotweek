"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "⏳ Awaiting approval", APPROVED: "✅ Live", REJECTED: "🚫 Rejected", HIDDEN: "🚫 Hidden by admin",
};

export default function MyCommunitiesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [communities, setCommunities] = useState<any[]>([]);
  const [remaining, setRemaining] = useState(3);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login?next=/communities/mine");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    api.get("/communities/mine").then(r => { setCommunities(r.data.communities); setRemaining(r.data.remaining); }).finally(() => setFetching(false));
  }, [user]);

  if (loading || !user) return null;

  return (
    <div className="animate-fade-in page-shell py-9">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-extrabold text-2xl text-gray-900">My Communities</h1>
          <p className="text-sm text-gray-400 mt-1">{remaining > 0 ? `You can create ${remaining} more (max 3).` : "You've reached the limit of 3 communities."}</p>
        </div>
        {remaining > 0 && <Link href="/communities/create" className="btn-primary !px-5 !py-2.5">+ Start a community</Link>}
      </div>

      {fetching ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : communities.length === 0 ? (
        <div className="card-base p-12 text-center">
          <p className="text-4xl mb-3">🤝</p>
          <p className="font-semibold text-gray-700">You haven't started a community yet</p>
          <Link href="/communities/create" className="btn-primary !px-6 !py-2.5 inline-flex mt-4">+ Start a community</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {communities.map(c => (
            <Link key={c.id} href={`/communities/${c.slug}`} className="card-base p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                {c.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.coverImageUrl} alt={c.name} className="w-full h-full object-cover" />
                ) : <span className="text-2xl text-gray-300">🤝</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-gray-900 truncate">{c.name}</p>
                  <span className="badge bg-gray-100 text-gray-600 text-[10px]">{STATUS_LABEL[c.status] || c.status}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">👥 {c._count.members} members · 🎪 {c._count.events} events · 📝 {c._count.posts} posts</p>
                {c.status === "REJECTED" && c.rejectedReason && <p className="text-xs text-red-500 mt-1">⚠️ {c.rejectedReason}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
