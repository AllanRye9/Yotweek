"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";

const WEATHER_ICONS: Record<number, string> = {
  0: "☀️",
  1: "🌤️",
  2: "⛅",
  3: "☁️",
  45: "🌫️",
  48: "🌫️",
  51: "🌦️",
  61: "🌧️",
  63: "🌧️",
  65: "⛈️",
  71: "🌨️",
  80: "🌦️",
  95: "⛈️",
};

export function WeatherWidget({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!lat || !lng) return;
    api
      .get("/weather", { params: { lat, lng } })
      .then((res) => setData(res.data))
      .catch(() => setError(true));
  }, [lat, lng]);

  if (!lat || !lng) return null;
  if (error) return null;
  if (!data) return <div className="card p-4 text-sm text-savanna-900/50">Loading forecast…</div>;

  const current = data.current;
  const icon = WEATHER_ICONS[current?.weather_code] ?? "🌡️";

  return (
    <div className="card p-4">
      <h4 className="mb-2 text-sm font-semibold text-savanna-900">Weather at the venue</h4>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <p className="text-xl font-bold">{Math.round(current?.temperature_2m)}°C</p>
          <p className="text-xs text-savanna-900/60">Wind {Math.round(current?.wind_speed_10m)} km/h</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
        {data.daily?.time?.slice(0, 4).map((day: string, i: number) => (
          <div key={day}>
            <p className="text-savanna-900/50">{new Date(day).toLocaleDateString(undefined, { weekday: "short" })}</p>
            <p>{WEATHER_ICONS[data.daily.weather_code[i]] ?? "🌡️"}</p>
            <p className="font-medium">{Math.round(data.daily.temperature_2m_max[i])}°</p>
          </div>
        ))}
      </div>
    </div>
  );
}
