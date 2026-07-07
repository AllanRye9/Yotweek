"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

// This is the designated admin-access URL. It doesn't render its own
// screen - it just gates on the ADMIN role and forwards into the real
// admin dashboard, so non-admins (and anyone not signed in) never see
// anything admin-related here.
export default function ConstGatewayPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user?.role === "ADMIN") router.replace("/admin");
    else router.replace("/");
  }, [user, loading, router]);

  return null;
}
