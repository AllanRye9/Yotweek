"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";

const DESTS = [
  { city:"Gulu",     country:"Uganda",  emoji:"🏛️", grad:"from-amber-400 to-orange-500", tagline:"Northern Uganda's cultural heart", desc:"Acholi heritage sites, craft markets, growing festival scene." },
  { city:"Kampala",  country:"Uganda",  emoji:"🌃", grad:"from-sky-400 to-blue-600",    tagline:"Uganda's vibrant capital",          desc:"Museums, night markets, and easy day-trips to Lake Victoria." },
  { city:"Nairobi",  country:"Kenya",   emoji:"🦁", grad:"from-green-400 to-emerald-600",tagline:"Gateway to East African safari",     desc:"Wildlife conservancies within the city and the Maasai Mara." },
  { city:"Mombasa",  country:"Kenya",   emoji:"🏖️", grad:"from-cyan-400 to-teal-600",   tagline:"Indian Ocean coast",                 desc:"Swahili culture, white-sand beaches, and coral reefs." },
  { city:"Jinja",    country:"Uganda",  emoji:"🛶", grad:"from-indigo-400 to-violet-600",tagline:"Source of the Nile",                  desc:"Whitewater rafting, bungee jumping, Nile kayaking." },
  { city:"Kigali",   country:"Rwanda",  emoji:"🌿", grad:"from-rose-400 to-pink-600",   tagline:"City of a thousand hills",            desc:"Pristine streets, gorilla trekking base, vibrant arts." },
  { city:"Zanzibar", country:"Tanzania",emoji:"🕌", grad:"from-orange-400 to-red-500",  tagline:"Spice Island paradise",               desc:"Stone Town heritage, spice tours, and turquoise waters." },
  { city:"Entebbe",  country:"Uganda",  emoji:"✈️", grad:"from-teal-400 to-cyan-500",   tagline:"Gateway to Pearl of Africa",          desc:"Botanical gardens, wildlife sanctuary, Lake Victoria shores." },
];

export default function DestinationsPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [bizCounts, setBizCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    api.get("/events", { params:{ pageSize:100 } }).then(r => {
      const c: Record<string,number> = {};
      for (const e of r.data.events) c[e.city] = (c[e.city]||0) + 1;
      setCounts(c);
    }).catch(()=>{});
    api.get("/businesses", { params:{ pageSize:100 } }).then(r => {
      const c: Record<string,number> = {};
      for (const b of (r.data.businesses||[])) c[b.city] = (c[b.city]||0) + 1;
      setBizCounts(c);
    }).catch(()=>{});
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="max-w-7xl mx-auto">
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">Plan your journey</p>
          <h1 className="font-extrabold text-3xl sm:text-4xl mb-2">Destination Guides</h1>
          <p className="text-white/70 text-sm max-w-xl">Curated destinations across East Africa and beyond — with live events and businesses happening right now.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {DESTS.map(d => (
            <div key={d.city} className="card-base card-hover shine overflow-hidden group">
              <div className={`h-28 bg-gradient-to-br ${d.grad} flex items-center justify-center relative overflow-hidden`}>
                <span className="group-hover:scale-125 transition-transform duration-500" style={{fontSize:"3.5rem"}}>{d.emoji}</span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <h2 className="font-extrabold text-lg text-gray-900">{d.city}</h2>
                    <p className="text-xs text-gray-400">{d.country}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {(counts[d.city]||0) > 0 && <span className="badge-live">🟢 {counts[d.city]} events</span>}
                    {(bizCounts[d.city]||0) > 0 && <span className="badge bg-violet-100 text-violet-700">🏪 {bizCounts[d.city]}</span>}
                  </div>
                </div>
                <p className="text-xs font-semibold text-sky-600 mb-1">{d.tagline}</p>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">{d.desc}</p>
                <div className="flex gap-2">
                  <Link href={`/events?city=${d.city}`} className="btn-primary !px-3 !py-1.5 !text-xs !rounded-lg flex-1 !justify-center">Events</Link>
                  <Link href={`/businesses?city=${d.city}`} className="btn-secondary !px-3 !py-1.5 !text-xs !rounded-lg flex-1 !justify-center">Businesses</Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 card-base p-7 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border border-sky-100">
          <h2 className="font-extrabold text-xl text-gray-900 mb-5">✈️ Travel tips</h2>
          <div className="grid sm:grid-cols-3 gap-5 text-sm text-gray-600">
            {[
              { icon:"📅", title:"Build your itinerary",   body:"Plan your trip day by day using our itinerary builder." },
              { icon:"🌤️", title:"Check the weather",      body:"Every event detail page shows a 7-day venue forecast." },
              { icon:"🎯", title:"Personalized for you",   body:"Our algorithm learns from your browsing to surface what you'll love." },
            ].map(t => (
              <div key={t.title} className="flex gap-3">
                <span style={{fontSize:"1.5rem",flexShrink:0,lineHeight:1}}>{t.icon}</span>
                <div><p className="font-semibold text-gray-800 mb-0.5">{t.title}</p><p>{t.body}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
