"use client";
import { useState, useRef, useEffect } from "react";
import { useCurrency } from "../context/CurrencyContext";

const COMMON_CURRENCIES = ["USD", "UGX", "KES", "TZS", "RWF", "EUR", "GBP", "AED", "NGN", "ZAR", "INR"];

export function CurrencySelector({ dark = false }: { dark?: boolean }) {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(p => !p)}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${dark ? "text-white/90 hover:bg-white/10" : "text-gray-600 hover:bg-gray-100"}`}>
        💱 {currency}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-40 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-[200] max-h-72 overflow-y-auto">
          {COMMON_CURRENCIES.map(c => (
            <button key={c} onClick={() => { setCurrency(c); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${c === currency ? "text-sky-700 font-bold bg-sky-50" : "text-gray-700 hover:bg-gray-50"}`}>
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
