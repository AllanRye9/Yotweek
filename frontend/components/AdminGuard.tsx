"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

/**
 * Wrap any /const (admin) page's content in this. Non-admins are redirected
 * away immediately — signed-out visitors go to the dedicated admin login at
 * /const/login (never the ordinary user login), signed-in non-admins go
 * home — rather than rendering an "admins only" placeholder at the admin
 * URL. Actual data protection still lives in the backend, which requires a
 * valid ADMIN bearer token issued by POST /auth/admin/login on every
 * /api/admin/* route; this guard only controls what the UI shows.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/const/login"); return; }
    if (user.role !== "ADMIN") { router.replace("/"); return; }
  }, [loading, user, router]);

  if (loading || !user || user.role !== "ADMIN") return null;
  return <>{children}</>;
}
