"use client";
/**
 * FeaturedPartnersWall
 * Public "🤝 Featured Partners" wall — shows admin-approved partner
 * businesses with their logo. Every partner always has a business page
 * ("View Business"); a second "Visit Website" button appears only if the
 * business has an external website set.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import { SafeImage } from "./SafeImage";

interface Partner {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  website: string | null;
  city: string;
  country: string;
  category?: { name: string; slug: string } | null;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase();
}
function strColor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360},60%,42%)`;
}

function PartnerCard({ partner }: { partner: Partner }) {
  const site = partner.website
    ? (partner.website.startsWith("http") ? partner.website : `https://${partner.website}`)
    : null;

  return (
    <div className="card-base card-hover shine flex flex-col items-center gap-2.5 p-4 text-center">
      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
        <SafeImage
          src={partner.logoUrl}
          alt={`${partner.name} logo`}
          className="w-full h-full object-contain p-1.5"
          fallback={
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg,${strColor(partner.name)}cc,${strColor(partner.name)}88)` }}
            >
              <span className="text-white font-extrabold text-lg">{initials(partner.name)}</span>
            </div>
          }
        />
      </div>

      <div className="min-w-0 w-full">
        <p className="font-bold text-gray-800 text-xs leading-snug truncate">{partner.name}</p>
        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{partner.city}, {partner.country}</p>
      </div>

      <div className="w-full space-y-1.5 mt-0.5">
        <Link href={`/businesses/${partner.id}`} className="btn-primary !w-full !py-1.5 !text-[11px]">
          View Business
        </Link>
        {site && (
          <a href={site} target="_blank" rel="noopener noreferrer" className="btn-ghost !w-full !py-1.5 !text-[11px]">
            🌐 Visit Website
          </a>
        )}
      </div>
    </div>
  );
}

export function FeaturedPartnersWall() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/businesses/featured-partners", { params: { limit: 12 } })
      .then(r => setPartners(r.data.businesses || []))
      .catch(() => setPartners([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && partners.length === 0) return null;

  return (
    <section className="animate-fade-up mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1 h-6 bg-emerald-500 rounded-full inline-block" />
        <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">🤝 Featured Partners</h2>
        <span className="algo-chip">Admin-approved</span>
      </div>
      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-base animate-pulse p-4">
              <div className="w-16 h-16 rounded-xl shimmer bg-slate-100 mx-auto mb-2" />
              <div className="h-2.5 shimmer bg-slate-100 rounded w-3/4 mx-auto" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 stagger">
          {partners.map(p => <PartnerCard key={p.id} partner={p} />)}
        </div>
      )}
    </section>
  );
}
