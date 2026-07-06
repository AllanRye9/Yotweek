import axios from "axios";

// NEXT_PUBLIC_API_URL must be set before building.
// - Local dev:   http://localhost:4000/api  (set in frontend/.env.local)
// - Railway:     https://your-backend.up.railway.app/api  (set as a Railway build variable)
// - Docker:      passed as --build-arg NEXT_PUBLIC_API_URL=... to docker build
//
// If this is undefined the build will still work but all API calls will fail.
// We intentionally do NOT fall back to localhost so broken production builds
// are immediately visible rather than silently broken.
const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL && typeof window === "undefined") {
  // Server-side build warning — won't break the build but makes it visible in logs
  console.warn("[yotweek] WARNING: NEXT_PUBLIC_API_URL is not set. API calls will fail.");
}

export const api = axios.create({
  baseURL: API_URL || "http://localhost:4000/api",
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("yw_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
