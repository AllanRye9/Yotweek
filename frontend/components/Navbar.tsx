"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

const EXPLORE_LINKS = [
  { href:"/events", icon:"🎪", label:"All Events" },
  { href:"/events?priceType=FREE", icon:"🆓", label:"Free Events" },
  { href:"/events?scope=INTERNATIONAL", icon:"🌍", label:"International" },
  { href:"/businesses", icon:"🏪", label:"Businesses & Places" },
  { href:"/businesses?category=food", icon:"🍽️", label:"Food & Dining" },
  { href:"/businesses?category=accommodation", icon:"🏨", label:"Accommodation" },
  { href:"/destinations", icon:"🗺️", label:"Destinations" },
  { href:"/blog", icon:"✍️", label:"Travel Blog" },
];
const CATEGORIES_BAR = [
  { href:"/events?category=FESTIVAL", label:"🎪 Festivals" },
  { href:"/events?category=WILDLIFE_SAFARI", label:"🦁 Safari" },
  { href:"/events?category=CULTURAL_HERITAGE", label:"🏛️ Culture" },
  { href:"/events?category=ADVENTURE_OUTDOOR", label:"⛰️ Adventure" },
  { href:"/events?category=CONCERT", label:"🎵 Concerts" },
  { href:"/events?category=FOOD_DRINK", label:"🍲 Food & Drink" },
  { href:"/businesses", label:"🏪 Businesses" },
  { href:"/events?category=GUIDED_TOUR", label:"🗺️ Tours" },
  { href:"/blog", label:"✍️ Blog" },
  { href:"/events?priceType=FREE", label:"🆓 Free" },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState<any[]>([]);
  const exploreRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", h, { passive:true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    setMobileOpen(false); setExploreOpen(false); setProfileOpen(false); setNotifOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
  }, [mobileOpen]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (exploreRef.current && !exploreRef.current.contains(e.target as Node)) setExploreOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (!user) return;
    api.get("/notifications").then(r => {
      const list = r.data.notifications ?? [];
      setUnread(list.filter((n: any) => !n.read).length);
      setNotifs(list.slice(0, 5));
    }).catch(() => {});
  }, [user, notifOpen]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQ.trim()) router.push(`/search?q=${encodeURIComponent(searchQ.trim())}`);
  };

  const navBg = scrolled
    ? "bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm"
    : "bg-transparent";
  const textColor = scrolled ? "text-gray-800" : "text-white";
  const logoAccent = scrolled ? "text-sky-600" : "text-sky-200";

  return (
    <>
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? navBg : "bg-gradient-to-r from-sky-700 via-blue-700 to-indigo-700"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-14 sm:h-16 gap-3">

          {/* Hamburger */}
          <button className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? "text-gray-700 hover:bg-gray-100" : "text-white hover:bg-white/10"}`}
            onClick={() => setMobileOpen(p => !p)} aria-label="Menu">
            <div className="w-5 flex flex-col gap-[5px]">
              {[0,1,2].map(i => (
                <span key={i} className={`block h-[2px] rounded bg-current transition-all duration-300 ${
                  mobileOpen && i===0 ? "rotate-45 translate-y-[7px]" :
                  mobileOpen && i===1 ? "opacity-0 scale-x-0" :
                  mobileOpen && i===2 ? "-rotate-45 -translate-y-[7px]" : ""
                }`} />
              ))}
            </div>
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shadow-lg transition-transform group-hover:scale-105 ${scrolled ? "bg-gradient-to-br from-sky-600 to-indigo-600 text-white" : "bg-white/20 text-white"}`}>
              YW
            </div>
            <div className="leading-none">
              <span className={`font-extrabold text-lg tracking-tight ${scrolled ? "text-gray-900" : "text-white"}`}>
                yot<span className={`font-serif italic ${logoAccent}`}>week</span>
              </span>
              <p className={`text-[9px] font-semibold uppercase tracking-widest ${scrolled ? "text-gray-400" : "text-white/50"}`}>Discover · Explore</p>
            </div>
          </Link>

          {/* Desktop Search */}
          <form onSubmit={onSearch} className="hidden sm:flex flex-1 max-w-lg">
            <div className={`flex w-full rounded-xl overflow-hidden ring-2 transition-all ${scrolled ? "ring-gray-200 focus-within:ring-sky-400" : "ring-white/20 focus-within:ring-white/60"}`}>
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Search events, businesses, destinations…"
                className={`flex-1 min-w-0 px-4 py-2 text-sm outline-none ${scrolled ? "bg-white text-gray-900 placeholder:text-gray-400" : "bg-white/10 text-white placeholder:text-white/50"}`} />
              <button type="submit" className={`px-4 text-sm font-semibold shrink-0 transition-colors ${scrolled ? "bg-sky-600 text-white hover:bg-sky-700" : "bg-white/20 text-white hover:bg-white/30"}`}>
                Search
              </button>
            </div>
          </form>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 ml-auto shrink-0">
            {/* Explore dropdown */}
            <div ref={exploreRef} className="relative">
              <button onClick={() => setExploreOpen(p => !p)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${scrolled ? "text-gray-700 hover:bg-gray-100" : "text-white/90 hover:bg-white/10"}`}>
                Explore
                <svg className={`w-3 h-3 transition-transform ${exploreOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/></svg>
              </button>
              {exploreOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-[200] animate-scale-in">
                  {EXPLORE_LINKS.map(l => (
                    <Link key={l.href} href={l.href} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-sky-50 hover:text-sky-700 transition-colors">
                      <span style={{fontSize:"1.05rem",lineHeight:1}}>{l.icon}</span> {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link href="/itinerary" className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${scrolled ? "text-gray-700 hover:bg-gray-100" : "text-white/90 hover:bg-white/10"}`}>
              Itinerary
            </Link>

            <Link href="/events/create" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${scrolled ? "bg-sky-600 text-white hover:bg-sky-700" : "bg-white/20 text-white border border-white/30 hover:bg-white/30"}`}>
              + List
            </Link>

            {/* Notifications */}
            {user && (
              <div ref={notifRef} className="relative">
                <button onClick={() => setNotifOpen(p => !p)}
                  className={`relative p-2 rounded-lg transition-all ${scrolled ? "text-gray-600 hover:bg-gray-100" : "text-white/90 hover:bg-white/10"}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                  </svg>
                  {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unread>9?"9+":unread}</span>}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[200] animate-scale-in">
                    <div className="px-4 py-3 bg-gradient-to-r from-sky-600 to-indigo-600">
                      <p className="text-sm font-bold text-white">Notifications</p>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                      {notifs.length === 0
                        ? <p className="text-center text-sm text-gray-400 py-6">All caught up!</p>
                        : notifs.map(n => (
                          <div key={n.id} className={`px-4 py-3 ${!n.read ? "bg-sky-50/50" : ""}`}>
                            <p className="text-xs text-gray-800">{n.message}</p>
                          </div>
                        ))}
                    </div>
                    <Link href="/dashboard" className="block text-center text-xs text-sky-600 py-3 border-t border-gray-100 font-semibold hover:bg-sky-50">View all →</Link>
                  </div>
                )}
              </div>
            )}

            {/* Profile / auth */}
            {user ? (
              <div ref={profileRef} className="relative">
                <button onClick={() => setProfileOpen(p => !p)}
                  className={`flex items-center gap-1.5 p-1.5 rounded-xl transition-all ${scrolled ? "ring-1 ring-gray-200 hover:bg-gray-50" : "hover:bg-white/10"}`}>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">{user.name[0]}</div>
                  <svg className={`w-3 h-3 transition-transform hidden md:block ${scrolled ? "text-gray-500" : "text-white/70"} ${profileOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[200] animate-scale-in">
                    <div className="px-4 py-3 bg-gradient-to-r from-sky-600 to-indigo-600">
                      <p className="text-sm font-bold text-white">{user.name}</p>
                      <p className="text-xs text-white/70 truncate">{user.email}</p>
                    </div>
                    <div className="py-1.5">
                      {[
                        { href:"/dashboard", icon:"📊", label:"Dashboard" },
                        { href:"/itinerary", icon:"📅", label:"My Itineraries" },
                        { href:"/events/create", icon:"➕", label:"List an Event" },
                        { href:"/businesses/create", icon:"🏪", label:"List a Business" },
                      ].map(i => (
                        <Link key={i.href} href={i.href} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-sky-50 hover:text-sky-700 transition-colors">
                          <span style={{fontSize:"1rem"}}>{i.icon}</span> {i.label}
                        </Link>
                      ))}
                      {user.role === "ADMIN" && (
                        <Link href="/admin" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-violet-700 hover:bg-violet-50 transition-colors">
                          <span>⚙️</span> Admin Panel
                        </Link>
                      )}
                    </div>
                    <div className="px-3 pb-3 pt-1">
                      <button onClick={() => { logout(); setProfileOpen(false); }}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-sm font-semibold border border-red-100">
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link href="/auth/login" className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${scrolled ? "text-gray-700 hover:bg-gray-100" : "text-white/90 hover:bg-white/10"}`}>Login</Link>
                <Link href="/auth/register" className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${scrolled ? "bg-sky-600 text-white hover:bg-sky-700" : "bg-white text-sky-700 hover:bg-sky-50"}`}>Register</Link>
              </div>
            )}
          </nav>
        </div>

        {/* Mobile search */}
        <div className={`sm:hidden px-4 py-2 border-t ${scrolled ? "bg-white border-gray-100" : "bg-blue-800/40 border-white/10"}`}>
          <form onSubmit={onSearch} className="flex rounded-xl overflow-hidden ring-1 ring-white/20">
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search events, places…"
              className={`flex-1 px-3 py-2 text-sm outline-none ${scrolled ? "bg-white text-gray-900" : "bg-white/10 text-white placeholder:text-white/50"}`} />
            <button type="submit" className="px-4 bg-sky-600 text-white text-xs font-semibold">Go</button>
          </form>
        </div>

        {/* Category bar */}
        <div className={`hidden sm:block border-t overflow-x-auto no-scrollbar ${scrolled ? "bg-gray-50 border-gray-100" : "bg-blue-800/50 border-white/10"}`}>
          <div className="max-w-7xl mx-auto px-4 flex gap-0.5 py-1">
            {CATEGORIES_BAR.map(c => (
              <Link key={c.href} href={c.href}
                className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded transition-colors ${scrolled ? "text-gray-600 hover:bg-sky-50 hover:text-sky-700" : "text-white/75 hover:text-white hover:bg-white/10"}`}>
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      <div className={`fixed inset-0 z-40 md:hidden transition-opacity duration-300 ${mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMobileOpen(false)}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      </div>

      {/* Mobile drawer */}
      <aside className={`fixed top-0 left-0 h-full w-72 max-w-[85vw] z-50 md:hidden bg-white shadow-2xl transform transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-sky-700 to-indigo-700 text-white">
          <span className="font-extrabold text-xl">yot<span className="font-serif italic text-sky-200">week</span></span>
          <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        {user && (
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center text-white font-bold">{user.name[0]}</div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-400">{user.role.toLowerCase()}</p>
            </div>
          </div>
        )}
        <nav className="overflow-y-auto flex-1 pb-20">
          {[
            { href:"/", icon:"🏠", label:"Home" },
            { href:"/events", icon:"🎪", label:"Browse Events" },
            { href:"/businesses", icon:"🏪", label:"Businesses & Places" },
            { href:"/destinations", icon:"🗺️", label:"Destinations" },
            { href:"/blog", icon:"✍️", label:"Travel Blog" },
            { href:"/itinerary", icon:"📅", label:"Itinerary Builder" },
            { href:"/search", icon:"🔍", label:"Search" },
            { href:"/events/create", icon:"➕", label:"List an Event" },
            { href:"/businesses/create", icon:"🏪", label:"List a Business" },
            { href:"/dashboard", icon:"📊", label:"My Dashboard" },
          ].map(l => (
            <Link key={l.href+l.label} href={l.href}
              className="flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-gray-700 hover:bg-sky-50 hover:text-sky-700 border-b border-gray-50 transition-colors">
              <span style={{fontSize:"1.3rem",lineHeight:1,width:"1.6rem",textAlign:"center",display:"inline-block"}}>{l.icon}</span>
              {l.label}
            </Link>
          ))}
          {user?.role === "ADMIN" && (
            <Link href="/admin" className="flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-violet-700 hover:bg-violet-50 border-b border-gray-50 transition-colors">
              <span style={{fontSize:"1.3rem",lineHeight:1,width:"1.6rem",textAlign:"center",display:"inline-block"}}>⚙️</span> Admin Panel
            </Link>
          )}
          {user ? (
            <div className="px-5 py-4">
              <button onClick={logout} className="w-full py-2.5 rounded-xl bg-red-50 text-red-600 font-semibold text-sm border border-red-100">Sign Out</button>
            </div>
          ) : (
            <div className="px-5 py-4 space-y-2">
              <Link href="/auth/login" className="block w-full py-2.5 text-center bg-sky-600 text-white rounded-xl font-semibold text-sm">Login</Link>
              <Link href="/auth/register" className="block w-full py-2.5 text-center border-2 border-sky-600 text-sky-700 rounded-xl font-semibold text-sm">Register</Link>
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
