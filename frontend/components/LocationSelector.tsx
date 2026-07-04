"use client";

import { useState } from "react";
import { useLocation } from "../lib/geolocation";

export function LocationSelector() {
  const { location, loading, detectGps, setManual } = useLocation();
  const [editing, setEditing] = useState(false);
  const [manualInput, setManualInput] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-savanna-900/60">📍</span>
      {!editing ? (
        <>
          <span className="font-medium">{location.label}</span>
          <button onClick={detectGps} disabled={loading} className="text-sunset-600 underline underline-offset-2">
            {loading ? "Detecting…" : "Use my location"}
          </button>
          <span className="text-savanna-900/30">|</span>
          <button onClick={() => setEditing(true)} className="text-sunset-600 underline underline-offset-2">
            Set manually
          </button>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualInput.trim()) setManual(manualInput.trim());
            setEditing(false);
          }}
          className="flex items-center gap-2"
        >
          <input
            autoFocus
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="e.g. Gulu, Uganda"
            className="rounded-full border border-savanna-900/15 px-3 py-1 text-sm focus:border-sunset-500 focus:outline-none"
          />
          <button type="submit" className="text-sunset-600 underline underline-offset-2">
            Save
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-savanna-900/50">
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}
