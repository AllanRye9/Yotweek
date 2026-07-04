"use client";

import { useEffect } from "react";
import { api } from "../lib/api";

export function VisitorTracker() {
  useEffect(() => {
    const key = "tep_visit_logged_today";
    const today = new Date().toDateString();
    if (sessionStorage.getItem(key) === today) return;
    api.post("/stats/visit").then(() => sessionStorage.setItem(key, today)).catch(() => {});
  }, []);
  return null;
}
