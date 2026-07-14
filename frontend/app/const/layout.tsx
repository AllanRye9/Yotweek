"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "../../components/AdminSidebar";

const STANDALONE_PATHS = ["/const/login", "/const/register"];

export default function ConstLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (STANDALONE_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0">
        {/* Mobile top bar — sidebar is a drawer below lg */}
        <div className="lg:hidden sticky top-0 z-40 bg-slate-900 text-white px-4 py-3 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} aria-label="Open admin menu" className="p-1.5 rounded-lg hover:bg-white/10">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <span className="font-bold text-sm">Admin Console</span>
        </div>
        {children}
      </div>
    </div>
  );
}
