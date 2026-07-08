"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "../lib/api";
import { UserProfile } from "../lib/types";

interface AuthCtx {
  user: UserProfile | null; loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: Record<string, any>) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  adminSetup: (payload: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}
const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("yw_token");
    if (!token) { setLoading(false); return; }
    api.get("/auth/me")
      .then(r => setUser(r.data.user))
      .catch(() => localStorage.removeItem("yw_token"))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const r = await api.post("/auth/login", { email, password });
    localStorage.setItem("yw_token", r.data.token);
    setUser(r.data.user);
  }
  async function register(payload: Record<string, any>) {
    const r = await api.post("/auth/register", payload);
    localStorage.setItem("yw_token", r.data.token);
    setUser(r.data.user);
  }
  // Admin authentication is deliberately kept separate from the ordinary
  // login/register above — it hits its own backend endpoints, which reject
  // any account that isn't (or can't become) an ADMIN.
  async function adminLogin(email: string, password: string) {
    const r = await api.post("/auth/admin/login", { email, password });
    localStorage.setItem("yw_token", r.data.token);
    setUser(r.data.user);
  }
  async function adminSetup(payload: { name: string; email: string; password: string }) {
    const r = await api.post("/auth/admin/setup", payload);
    localStorage.setItem("yw_token", r.data.token);
    setUser(r.data.user);
  }
  function logout() { localStorage.removeItem("yw_token"); setUser(null); }

  return <Ctx.Provider value={{ user, loading, login, register, adminLogin, adminSetup, logout }}>{children}</Ctx.Provider>;
}
export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
