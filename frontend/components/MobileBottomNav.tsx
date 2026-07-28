"use client";
/**
 * MobileBottomNav
 * Persistent, always-visible bottom tab bar for mobile (< lg breakpoint).
 * Complements the existing hamburger drawer in Navbar — the drawer covers
 * every destination, this surfaces the handful used most often one tap
 * away, at thumb height, without needing to open the drawer first.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";

const TABS = [
  { href: "/",            match: (p: string) => p === "/",                 icon: "🏠", label: "Home" },
  { href: "/events",      match: (p: string) => p.startsWith("/events"),    icon: "🎪", label: "Events" },
  { href: "/businesses",  match: (p: string) => p.startsWith("/businesses"),icon: "🏪", label: "Places" },
  { href: "/communities", match: (p: string) => p.startsWith("/communities"),icon: "🤝", label: "Community" },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const lastTab = user
    ? { href: "/dashboard", match: (p: string) => p.startsWith("/dashboard") || p.startsWith("/profile"), icon: "👤", label: "You" }
    : { href: "/auth/login", match: (p: string) => p.startsWith("/auth"), icon: "👤", label: "Login" };

  const tabs = [...TABS, lastTab];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary mobile navigation"
    >
      <div className="grid grid-cols-5">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-0.5 py-2 min-w-0"
              aria-current={active ? "page" : undefined}
            >
              <span
                style={{ fontSize: "1.35rem", lineHeight: 1 }}
                className={`transition-transform ${active ? "scale-110" : ""}`}
              >
                {tab.icon}
              </span>
              <span className={`text-[10px] font-semibold truncate max-w-full ${active ? "text-sky-600" : "text-gray-400"}`}>
                {tab.label}
              </span>
              {active && <span className="w-1 h-1 rounded-full bg-sky-500 mt-0.5" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
