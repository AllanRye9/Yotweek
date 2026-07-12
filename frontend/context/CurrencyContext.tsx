"use client";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { getExchangeRates, convertAmount, formatMoney, detectCountryByIp } from "../lib/currency";

interface CurrencyCtx {
  currency: string;
  setCurrency: (c: string) => void;
  ready: boolean; // rates loaded at least once
  convert: (amount: number, from: string) => number | null;
  format: (amount: number, from: string) => string;
}

const Ctx = createContext<CurrencyCtx | undefined>(undefined);
const STORAGE_KEY = "yw_currency";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState("USD");
  const [rates, setRates] = useState<Record<string, number>>({ USD: 1 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Priority: an explicit prior choice always wins. Otherwise, resolve
      // the user's currency by IP-based country lookup (the "device
      // location" signal from the spec) — this is used instead of GPS for
      // currency specifically because it works with no permission prompt
      // and covers 100% of visitors, whereas GPS is opt-in and this app's
      // location picker doesn't reverse-geocode a country from it.
      const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (stored) {
        if (!cancelled) setCurrencyState(stored);
      } else {
        try {
          const resolved = (await detectCountryByIp()).currency;
          if (!cancelled && resolved) setCurrencyState(resolved);
        } catch {
          // Detection failing just means we stay on the USD default — never block rendering on this.
        }
      }

      const fx = await getExchangeRates();
      if (!cancelled) { setRates(fx.rates); setReady(true); }
    })();

    return () => { cancelled = true; };
  }, []);

  const setCurrency = useCallback((c: string) => {
    setCurrencyState(c);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, c);
  }, []);

  const convert = useCallback(
    (amount: number, from: string) => convertAmount(amount, from, currency, rates),
    [currency, rates]
  );

  const format = useCallback(
    (amount: number, from: string) => {
      const converted = convert(amount, from);
      return converted === null ? formatMoney(amount, from) : formatMoney(converted, currency);
    },
    [convert, currency]
  );

  return <Ctx.Provider value={{ currency, setCurrency, ready, convert, format }}>{children}</Ctx.Provider>;
}

export function useCurrency() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
