"use client";
import { useEffect } from "react";
import { api } from "../lib/api";
import { detectCountryByIp } from "../lib/currency";

export function VisitorTracker() {
  useEffect(() => {
    const key = "yw_visit_today";
    const today = new Date().toDateString();
    if (sessionStorage.getItem(key) === today) return;
    detectCountryByIp()
      .then(loc => api.post("/stats/visit", { country: loc.countryCode || undefined }))
      .catch(() => api.post("/stats/visit"))
      .then(() => sessionStorage.setItem(key, today))
      .catch(() => {});
  }, []);
  return null;
}
