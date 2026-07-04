"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { SearchBar } from "./SearchBar";

const NAV_LINKS = [
  { href: "/events", label: "Events" },
  { href: "/calendar", label: "Calendar" },
  { href: "/blog", label: "Stories" },
  { href: "/destinations", label: "Destinations" },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/" className="shrink-0 font-display text-xl font-bold text-sunset-600">
          🌍 yotweek
        </Link>

        <div className="hidden flex-1 justify-center lg:flex">
          <SearchBar />
        </div>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-savanna-900/80 hover:text-sunset-600">
              {l.label}
            </Link>
          ))}
          {user && (
            <Link href="/dashboard" className="text-savanna-900/80 hover:text-sunset-600">
              My Dashboard
            </Link>
          )}
          {user?.role === "ADMIN" && (
            <Link href="/admin" className="text-savanna-900/80 hover:text-sunset-600">
              Admin
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/events/create" className="btn-secondary">
            List an event
          </Link>
          {user ? (
            <button onClick={logout} className="btn-primary">
              Sign out
            </button>
          ) : (
            <Link href="/auth/login" className="btn-primary">
              Sign in
            </Link>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          ☰
        </button>
      </div>

      {open && (
        <div className="border-t border-black/5 md:hidden">
          <div className="container-page flex flex-col gap-3 py-4 text-sm font-medium">
            <div className="pb-2">
              <SearchBar />
            </div>
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            <Link href="/events/create" onClick={() => setOpen(false)}>
              List an event
            </Link>
            {user ? (
              <button onClick={logout} className="text-left">
                Sign out
              </button>
            ) : (
              <Link href="/auth/login" onClick={() => setOpen(false)}>
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
