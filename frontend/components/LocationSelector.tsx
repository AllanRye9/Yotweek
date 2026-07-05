"use client";
import { useState } from "react";
import { useLocation } from "../lib/geolocation";

export function LocationSelector() {
  const { location, loading, detectGps, setManual } = useLocation();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-white/50 text-xs">📍</span>
      {!editing ? (
        <>
          <span className="font-semibold text-white/90 text-xs">{location.label}</span>
          <button onClick={detectGps} disabled={loading}
            className="text-xs text-sky-200 underline underline-offset-2 hover:text-white transition-colors">
            {loading ? "Detecting…" : "Use GPS"}
          </button>
          <span className="text-white/20">·</span>
          <button onClick={() => setEditing(true)} className="text-xs text-sky-200 underline underline-offset-2 hover:text-white transition-colors">
            Set location
          </button>
        </>
      ) : (
        <form onSubmit={e => { e.preventDefault(); if (val.trim()) setManual(val.trim()); setEditing(false); }} className="flex items-center gap-2">
          <input autoFocus value={val} onChange={e => setVal(e.target.value)}
            placeholder="e.g. Gulu, Uganda"
            className="input-base !py-1.5 !text-xs w-44 !bg-white/10 !border-white/20 !text-white placeholder:!text-white/40 focus:!border-white/50 focus:!ring-white/10" />
          <button type="submit" className="text-xs text-sky-200 underline hover:text-white">Save</button>
          <button type="button" onClick={() => setEditing(false)} className="text-white/40 text-xs">✕</button>
        </form>
      )}
    </div>
  );
}
