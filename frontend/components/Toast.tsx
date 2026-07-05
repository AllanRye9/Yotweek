"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type T = "success"|"error"|"info"|"warning";
interface Toast { id:string; message:string; type:T; }
interface ToastCtx { success:(m:string)=>void; error:(m:string)=>void; info:(m:string)=>void; warning:(m:string)=>void; }

const Ctx = createContext<ToastCtx|null>(null);
const STYLE: Record<T,{bar:string;icon:string;bg:string;text:string;char:string}> = {
  success:{ bar:"bg-emerald-500", icon:"bg-emerald-100", bg:"border-emerald-100", text:"text-emerald-600", char:"✓" },
  error:  { bar:"bg-red-500",     icon:"bg-red-100",     bg:"border-red-100",     text:"text-red-600",     char:"✕" },
  info:   { bar:"bg-sky-500",     icon:"bg-sky-100",     bg:"border-sky-100",     text:"text-sky-600",     char:"ℹ" },
  warning:{ bar:"bg-amber-500",   icon:"bg-amber-100",   bg:"border-amber-100",   text:"text-amber-600",   char:"⚠" },
};

function Item({ t, remove }: { t:Toast; remove:()=>void }) {
  const s = STYLE[t.type];
  return (
    <div className={`relative flex items-start gap-3 bg-white border ${s.bg} rounded-2xl shadow-lg p-4 pr-10 min-w-[280px] max-w-sm animate-slide-down`} role="alert">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${s.icon} ${s.text}`}>{s.char}</div>
      <p className="text-sm text-gray-800 leading-snug pt-0.5 flex-1">{t.message}</p>
      <button onClick={remove} className="absolute top-2 right-3 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
      <span className={`absolute bottom-0 left-0 h-1 rounded-b-2xl ${s.bar}`} style={{width:"100%",animation:"shrink 3s linear forwards"}} />
    </div>
  );
}

export function ToastProvider({ children }: { children:ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = useCallback((message:string, type:T) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  const ctx: ToastCtx = { success:m=>add(m,"success"), error:m=>add(m,"error"), info:m=>add(m,"info"), warning:m=>add(m,"warning") };
  return (
    <Ctx.Provider value={ctx}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map(t => <div key={t.id} className="pointer-events-auto"><Item t={t} remove={()=>setToasts(p=>p.filter(x=>x.id!==t.id))} /></div>)}
      </div>
    </Ctx.Provider>
  );
}
export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast must be inside ToastProvider");
  return c;
}
