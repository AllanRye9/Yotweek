// Currency conversion, base USD. Exchange rates come from a free,
// no-API-key-required endpoint (https://www.exchangerate-api.com/docs/free)
// that publishes daily rates relative to USD — exactly the "base currency
// is USD" model the platform wants: converting between any two currencies
// goes amount -> USD -> target, using this one table.
const RATES_URL = "https://open.er-api.com/v6/latest/USD";
const RATES_CACHE_KEY = "yw_fx_rates_v1";
const RATES_TTL_MS = 12 * 60 * 60 * 1000; // 12h — daily-updated source, no need to refetch more often

export interface RatesCache {
  base: "USD";
  rates: Record<string, number>;
  fetchedAt: number;
}

// A conservative fallback table (approximate, roughly mid-2026 order of
// magnitude) used only if the live endpoint can't be reached (offline,
// blocked, or rate-limited) and no cached rates exist yet — so prices
// still show *something* sensible instead of breaking.
const FALLBACK_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, AED: 3.67, KES: 129, UGX: 3700, TZS: 2600,
  RWF: 1350, NGN: 1550, ZAR: 18.5, GHS: 15.5, INR: 83.5, CAD: 1.37, AUD: 1.52,
};

export async function getExchangeRates(): Promise<RatesCache> {
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(RATES_CACHE_KEY);
    if (cached) {
      try {
        const parsed: RatesCache = JSON.parse(cached);
        if (Date.now() - parsed.fetchedAt < RATES_TTL_MS) return parsed;
      } catch {}
    }
  }
  try {
    const res = await fetch(RATES_URL);
    const data = await res.json();
    if (data.result !== "success" || !data.rates) throw new Error("bad response");
    const fresh: RatesCache = { base: "USD", rates: data.rates, fetchedAt: Date.now() };
    if (typeof window !== "undefined") localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(fresh));
    return fresh;
  } catch {
    return { base: "USD", rates: FALLBACK_RATES, fetchedAt: Date.now() };
  }
}

/** Convert an amount from one currency to another via the USD-based rate table. */
export function convertAmount(amount: number, from: string, to: string, rates: Record<string, number>): number | null {
  if (!amount || !isFinite(amount)) return 0;
  if (from === to) return amount;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return null; // unknown currency code — caller should fall back to the original
  const usd = amount / fromRate;
  return usd * toRate;
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: amount >= 1000 ? 0 : 2,
    }).format(amount);
  } catch {
    // Intl throws on a currency code it doesn't recognize (some local
    // currencies aren't in every browser's ICU data) — fall back to a
    // plain "CODE amount" so it still displays instead of crashing.
    return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: amount >= 1000 ? 0 : 2 })}`;
  }
}

// Country -> currency, covering the platform's core East African markets
// plus the other countries events/businesses have been listed for so far,
// and enough major economies that most visitors' home currency resolves.
export const COUNTRY_CURRENCY: Record<string, string> = {
  UG: "UGX", KE: "KES", TZ: "TZS", RW: "RWF", BI: "BIF", SS: "SSP", ET: "ETB",
  NG: "NGN", GH: "GHS", ZA: "ZAR", EG: "EGP", MA: "MAD",
  US: "USD", GB: "GBP", CA: "CAD", AU: "AUD", IN: "INR",
  AE: "AED", SA: "SAR", QA: "QAR",
  DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", IE: "EUR", PT: "EUR",
};

export interface DetectedLocation { countryCode: string | null; currency: string | null; }

// IP-based country detection (no permission prompt, unlike GPS) — used as
// the "device location" signal from the spec when the browser's precise
// GPS location hasn't been granted. ipapi.co's free tier needs no API key.
export async function detectCountryByIp(): Promise<DetectedLocation> {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    const countryCode: string | null = data.country_code || data.country || null;
    return { countryCode, currency: countryCode ? COUNTRY_CURRENCY[countryCode] || data.currency || null : data.currency || null };
  } catch {
    return { countryCode: null, currency: null };
  }
}
