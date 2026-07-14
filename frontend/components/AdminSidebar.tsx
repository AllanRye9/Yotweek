"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem { href: string; icon: string; label: string; }
interface NavCategory { label: string; items: NavItem[]; }

const CATEGORIES: NavCategory[] = [
  {
    label: "Overview",
    items: [
      { href: "/const", icon: "📊", label: "Dashboard" },
      { href: "/const/analytics", icon: "📈", label: "Analytics" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/const/events", icon: "🎪", label: "Events" },
      { href: "/const/businesses", icon: "🏪", label: "Business Listings" },
      { href: "/const/communities", icon: "🤝", label: "Communities" },
      { href: "/const/posts", icon: "📝", label: "Posts" },
    ],
  },
  {
    label: "Moderation",
    items: [
      { href: "/const/reviews", icon: "⭐", label: "Reviews" },
      { href: "/const/testimonials", icon: "💬", label: "Testimonials" },
      { href: "/const/reports", icon: "🚩", label: "Reports" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/const/users", icon: "👥", label: "Users" },
    ],
  },
  {
    label: "Media",
    items: [
      { href: "/const/highlights", icon: "🎞️", label: "Highlight Banner" },
      { href: "/const/event-videos", icon: "🎬", label: "Event Videos" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/const/activity-log", icon: "🕒", label: "Activity Log" },
      { href: "/const/settings", icon: "⚙️", label: "Settings" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/const") return pathname === "/const";
  return pathname === href || pathname.startsWith(href + "/");
}

export function AdminSidebar({ mobileOpen, onCloseMobile }: { mobileOpen: boolean; onCloseMobile: () => void }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggle(label: string) {
    setCollapsed(c => ({ ...c, [label]: !c[label] }));
  }

  const nav = (
    <nav className="py-4">
      <Link href="/const" className="flex items-center gap-2.5 px-5 pb-4 mb-2 border-b border-white/10">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-400 to-indigo-400 flex items-center justify-center font-black text-sm text-white shadow-lg">YW</div>
        <div className="leading-none">
          <span className="font-extrabold text-sm text-white tracking-tight">Admin Console</span>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-white/40 mt-0.5">Yotweek</p>
        </div>
      </Link>

      {CATEGORIES.map(cat => {
        const isCollapsed = collapsed[cat.label];
        return (
          <div key={cat.label} className="mb-1">
            <button onClick={() => toggle(cat.label)}
              className="w-full flex items-center justify-between px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white/70 transition-colors">
              {cat.label}
              <svg className={`w-3 h-3 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {!isCollapsed && (
              <div className="px-2.5">
                {cat.items.map(item => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link key={item.href} href={item.href} onClick={onCloseMobile}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                        active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}>
                      <span className="text-base leading-none">{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="px-5 pt-4 mt-2 border-t border-white/10">
        <Link href="/" className="flex items-center gap-2 text-xs font-semibold text-white/50 hover:text-white/80 transition-colors">
          ← Back to site
        </Link>
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar — always visible, fixed width */}
      <aside className="hidden lg:block w-64 shrink-0 bg-gradient-to-b from-slate-900 to-indigo-950 min-h-screen sticky top-0 overflow-y-auto">
        {nav}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[300]">
          <div className="absolute inset-0 bg-black/50" onClick={onCloseMobile} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-gradient-to-b from-slate-900 to-indigo-950 overflow-y-auto animate-scale-in">
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
