"use client";
import { useState, useRef, useEffect } from "react";
import { getHTMLTextDir, getLocaleName } from "intlayer";
import { useLocale } from "next-intlayer";

// Compact globe-icon dropdown for switching the site's language. Each
// option is rendered in its OWN language (e.g. "Français", "العربية",
// "日本語") rather than translated into the currently active locale, since
// that's how people actually scan for their language in a list.
export function LocaleSwitcher({ dark = false }: { dark?: boolean }) {
  const { locale, availableLocales, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Change language"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
          dark ? "text-white/75 hover:text-white hover:bg-white/10" : "text-gray-600 hover:text-sky-700 hover:bg-sky-50"
        }`}
      >
        <span>🌐</span>
        <span className="hidden sm:inline">{locale.toUpperCase()}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 max-h-80 overflow-y-auto rounded-xl bg-white shadow-card-hover border border-gray-100 py-1.5 z-50">
          {availableLocales.map(localeItem => (
            <button
              key={localeItem}
              onClick={() => { setLocale(localeItem); setOpen(false); }}
              aria-current={locale === localeItem ? "true" : undefined}
              dir={getHTMLTextDir(localeItem)}
              className={`w-full flex items-center justify-between px-3.5 py-2 text-sm transition-colors ${
                locale === localeItem ? "bg-sky-50 text-sky-700 font-semibold" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span>{getLocaleName(localeItem, localeItem)}</span>
              <span className="text-[10px] text-gray-400 uppercase">{localeItem}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
