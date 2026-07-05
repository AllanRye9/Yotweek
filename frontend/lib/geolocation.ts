"use client";
import { useCallback, useEffect, useState } from "react";

export interface LocationState {
  latitude: number | null; longitude: number | null;
  label: string; source: "gps" | "manual" | "none";
}
const KEY = "yw_location";

export function useLocation() {
  const [location, setLocation] = useState<LocationState>({ latitude:null, longitude:null, label:"Set your location", source:"none" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    if (s) { try { setLocation(JSON.parse(s)); } catch {} }
  }, []);

  const persist = useCallback((next: LocationState) => {
    setLocation(next);
    if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const detectGps = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      p => { persist({ latitude:p.coords.latitude, longitude:p.coords.longitude, label:"Your location", source:"gps" }); setLoading(false); },
      () => setLoading(false),
      { timeout:8000 }
    );
  }, [persist]);

  const setManual = useCallback((label: string, latitude?: number, longitude?: number) => {
    persist({ latitude:latitude??null, longitude:longitude??null, label, source:"manual" });
  }, [persist]);

  return { location, loading, detectGps, setManual };
}
