/**
 * Client-side preference engine.
 *
 * Tracks implicit signals (views, reads, likes, saves, bookings) and builds
 * a ranked interest profile that drives every "For You" feed on the frontend.
 * The profile is persisted to localStorage and merged with server-side
 * recommendations from /api/recommendations/for-you on login.
 *
 * Signal weights:
 *   view      1   – user opened the item
 *   read      2   – user spent >15s on a post or event detail
 *   like      3   – explicit thumbs-up / heart
 *   save      4   – added to saved list
 *   book      8   – completed a booking
 *
 * Decay: signals older than 30 days are halved; older than 90 days removed.
 */

import { UserSignal } from "./types";

const KEY = "yw_signals";
const MAX_SIGNALS = 500;
const WEIGHTS: Record<UserSignal["action"], number> = {
  view: 1, read: 2, like: 3, save: 4, book: 8,
};
const DECAY_HALF = 30 * 24 * 3600_000;  // 30 days → weight × 0.5
const DECAY_DROP = 90 * 24 * 3600_000;  // 90 days → drop

function load(): UserSignal[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function save(signals: UserSignal[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(signals.slice(-MAX_SIGNALS)));
}

export function recordSignal(signal: Omit<UserSignal, "ts">) {
  const signals = load();
  signals.push({ ...signal, ts: Date.now() });
  save(signals);
}

export interface InterestProfile {
  categories: { key: string; score: number }[];
  cities: { key: string; score: number }[];
  tags: { key: string; score: number }[];
  hasData: boolean;
}

export function buildProfile(): InterestProfile {
  const now = Date.now();
  const signals = load().filter(s => now - s.ts < DECAY_DROP);

  const catMap = new Map<string, number>();
  const cityMap = new Map<string, number>();
  const tagMap  = new Map<string, number>();

  for (const s of signals) {
    const age = now - s.ts;
    const decay = age > DECAY_HALF ? 0.5 : 1;
    const w = WEIGHTS[s.action] * decay;

    if (s.category) catMap.set(s.category, (catMap.get(s.category) || 0) + w);
    if (s.city)     cityMap.set(s.city, (cityMap.get(s.city) || 0) + w);
    if (s.tags)     s.tags.forEach(t => tagMap.set(t, (tagMap.get(t) || 0) + w));
  }

  const sort = (m: Map<string, number>) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).map(([key, score]) => ({ key, score }));

  const cats = sort(catMap);
  return {
    categories: cats.slice(0, 6),
    cities: sort(cityMap).slice(0, 6),
    tags: sort(tagMap).slice(0, 10),
    hasData: cats.length > 0,
  };
}

/** Returns the top-3 category keys the user cares about most. */
export function topCategories(): string[] {
  return buildProfile().categories.slice(0, 3).map(c => c.key);
}

/** Returns the top-2 city names the user cares about most. */
export function topCities(): string[] {
  return buildProfile().cities.slice(0, 2).map(c => c.key);
}
