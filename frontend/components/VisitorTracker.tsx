"use client";
import { useEffect } from "react";
import { api } from "../lib/api";
export function VisitorTracker() {
  useEffect(() => {
    const key = "yw_visit_today";
    const today = new Date().toDateString();
    if (sessionStorage.getItem(key) === today) return;
    api.post("/stats/visit").then(() => sessionStorage.setItem(key, today)).catch(() => {});
  }, []);
  return null;
}
