"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
const WMO: Record<number,{label:string;icon:string}> = {
  0:{label:"Clear sky",icon:"☀️"},1:{label:"Mainly clear",icon:"🌤️"},2:{label:"Partly cloudy",icon:"⛅"},
  3:{label:"Overcast",icon:"☁️"},45:{label:"Fog",icon:"🌫️"},51:{label:"Drizzle",icon:"🌦️"},
  61:{label:"Rain",icon:"🌧️"},63:{label:"Heavy rain",icon:"🌧️"},65:{label:"Downpour",icon:"⛈️"},
  71:{label:"Snow",icon:"🌨️"},80:{label:"Showers",icon:"🌦️"},95:{label:"Thunderstorm",icon:"⛈️"},
};
export function WeatherWidget({ lat, lng }: { lat?: number|null; lng?: number|null }) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    if (!lat || !lng) return;
    api.get("/weather", { params:{lat,lng} }).then(r => setData(r.data)).catch(() => setErr(true));
  }, [lat, lng]);
  if (!lat || !lng || err) return null;
  return (
    <div className="card-base p-5">
      <h4 className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-2">🌤️ Weather at venue</h4>
      {!data ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-8 shimmer bg-slate-100 rounded w-1/2" />
          <div className="grid grid-cols-4 gap-2 mt-2">{[...Array(4)].map((_,i) => <div key={i} className="h-12 shimmer bg-slate-100 rounded" />)}</div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <span style={{fontSize:"2.5rem",lineHeight:1}}>{WMO[data.current?.weather_code]?.icon ?? "🌡️"}</span>
            <div>
              <p className="font-extrabold text-3xl text-gray-900 leading-none">{Math.round(data.current?.temperature_2m)}°C</p>
              <p className="text-xs text-gray-400 mt-0.5">{WMO[data.current?.weather_code]?.label}</p>
              <p className="text-xs text-gray-400">💨 {Math.round(data.current?.wind_speed_10m)} km/h</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 border-t border-gray-100 pt-3">
            {data.daily?.time?.slice(0,4).map((day: string, i: number) => (
              <div key={day} className="text-center">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">{new Date(day).toLocaleDateString(undefined,{weekday:"short"})}</p>
                <p className="text-lg my-0.5">{WMO[data.daily.weather_code[i]]?.icon ?? "🌡️"}</p>
                <p className="text-xs font-bold text-gray-800">{Math.round(data.daily.temperature_2m_max[i])}°</p>
                <p className="text-[10px] text-gray-400">{Math.round(data.daily.temperature_2m_min[i])}°</p>
                {data.daily.precipitation_probability_max?.[i] > 20 && (
                  <p className="text-[10px] text-blue-500">💧{data.daily.precipitation_probability_max[i]}%</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
