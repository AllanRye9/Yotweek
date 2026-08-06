"use client";
import { useState, useRef, useEffect } from "react";
import { THEMES, useTheme } from "../context/ThemeContext";

// A small swatch-picker dropdown that lets anyone recolor the whole site's
// brand accent (buttons, hero, tab pills, badges, focus rings) on the fly.
// The choice persists to localStorage via ThemeContext, so it's remembered
// on the next visit without needing an account.
export function ThemeSelector({ dark = false }: { dark?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = THEMES.find(t => t.id === theme) || THEMES[0];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Choose page color theme"
        aria-haspopup="true"
        aria-expanded={open}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
          dark ? "hover:bg-white/10" : "hover:bg-gray-100"
        }`}
        title="Page theme"
      >
        <span
          className="w-5 h-5 rounded-full block ring-2 ring-white shadow-sm"
          style={{ background: `linear-gradient(135deg, ${active.swatch}, ${active.swatch2})` }}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 z-50 w-56 rounded-2xl bg-white border border-gray-100 shadow-card-hover p-3 animate-scale-in origin-top-right">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 px-1 mb-2">Page theme</p>
          <div className="grid grid-cols-1 gap-1">
            {THEMES.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTheme(t.id); setOpen(false); }}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  theme === t.id ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span
                  className="w-5 h-5 rounded-full shrink-0 ring-1 ring-black/5"
                  style={{ background: `linear-gradient(135deg, ${t.swatch}, ${t.swatch2})` }}
                />
                {t.label}
                {theme === t.id && <span className="ml-auto text-xs">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
