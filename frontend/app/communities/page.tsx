"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "../../lib/api";
import { Community } from "../../lib/types";
import { SkeletonCard } from "../../components/SkeletonCard";

function CommunityCard({ community }: { community: Community }) {
  return (
    <Link href={`/communities/${community.slug}`} className="card-base card-hover shine group flex flex-col overflow-hidden">
      <div className="relative aspect-[3/1.6] overflow-hidden bg-gradient-to-br from-teal-400 to-sky-600">
        {community.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={community.coverImageUrl} alt={community.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl">🤝</div>
        )}
        {community.isFeatured && <span className="absolute top-2 left-2 badge bg-amber-100 text-amber-700">⭐ Featured</span>}
      </div>
      <div className="flex flex-col flex-1 p-4">
        <h3 className="font-bold text-gray-900 text-base leading-tight mb-1 group-hover:text-sky-600 transition-colors">{community.name}</h3>
        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{community.description}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
          {(community.city || community.country) && <span>📍 {[community.city, community.country].filter(Boolean).join(", ")}</span>}
          {community.interestTag && <span>🏷️ {community.interestTag}</span>}
          <span>👥 {community._count.members} member{community._count.members !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </Link>
  );
}

function Content() {
  const sp = useSearchParams();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(sp.get("search") || "");
  const [searchInput, setSearchInput] = useState(sp.get("search") || "");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    api.get("/communities", { params: search ? { search, pageSize: 24 } : { pageSize: 24 } })
      .then(r => { setCommunities(r.data.communities); setTotal(r.data.total || 0); })
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="animate-fade-in">
      <div className="page-shell py-9">
        <p className="text-xs text-gray-400 mb-4">{total.toLocaleString()} communit{total !== 1 ? "ies" : "y"}</p>
        {loading ? (
          <div className="listing-grid-3">{[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : communities.length === 0 ? (
          <div className="card-base p-12 text-center">
            <p className="text-4xl mb-3">🤝</p>
            <p className="font-semibold text-gray-700">No communities yet</p>
            <p className="text-gray-400 text-sm mt-1 mb-4">Be the first to start one.</p>
            <Link href="/communities/create" className="btn-primary !px-6 !py-2.5 inline-flex">+ Start a community</Link>
          </div>
        ) : (
          <div className="listing-grid-3 stagger">{communities.map(c => <CommunityCard key={c.id} community={c} />)}</div>
        )}
      </div>
    </div>
  );
}

export default function CommunitiesPage() {
  return <Suspense fallback={null}><Content /></Suspense>;
}
