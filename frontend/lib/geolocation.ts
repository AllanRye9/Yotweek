"use client";

import { useCallback, useEffect, useState } from "react";

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  label: string; // e.g. "Gulu, Uganda" or "Detecting..."
  source: "gps" | "manual" | "none";
}

const STORAGE_KEY = "tep_location";

export function useLocation() {
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    label: "Set your location",
    source: "none",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved) {
      setLocation(JSON.parse(saved));
    }
  }, []);

  const persist = useCallback((next: LocationState) => {
    setLocation(next);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const detectGps = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        persist({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          label: "Your current location",
          source: "gps",
        });
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
      { timeout: 8000 }
    );
  }, [persist]);

  const setManual = useCallback(
    (label: string, latitude?: number, longitude?: number) => {
      persist({ latitude: latitude ?? null, longitude: longitude ?? null, label, source: "manual" });
    },
    [persist]
  );

  return { location, loading, detectGps, setManual };
}
