"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";

export const THEMES = [
  { id: "ocean",  label: "Ocean",  swatch: "#0284c7", swatch2: "#4338ca" },
  { id: "sunset", label: "Sunset", swatch: "#ea5a10", swatch2: "#be123c" },
  { id: "forest", label: "Forest", swatch: "#059669", swatch2: "#0f766e" },
  { id: "berry",  label: "Berry",  swatch: "#7c3aed", swatch2: "#a21caf" },
  { id: "slate",  label: "Slate",  swatch: "#475569", swatch2: "#1d4ed8" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
const DEFAULT_THEME: ThemeId = "ocean";
const STORAGE_KEY = "yotweek-theme";

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);

  // Runs once on mount — picks up any theme the person chose on a previous
  // visit. Kept out of the initial useState so server and first client
  // render match (avoids a hydration mismatch), then applied right away.
  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    const initial = (THEMES.some(t => t.id === stored) ? stored : DEFAULT_THEME) as ThemeId;
    setThemeState(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    try { window.localStorage.setItem(STORAGE_KEY, t); } catch {}
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
