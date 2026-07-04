"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet's default marker image paths break under Next.js bundling, so we
// use a simple emoji div-icon instead of shipping/copying the PNG assets.
const markerIcon = L.divIcon({
  html: `<div style="font-size:28px;line-height:1;transform:translate(-50%,-100%)">📍</div>`,
  className: "",
  iconSize: [0, 0],
});

interface EventMapProps {
  lat: number;
  lng: number;
  label: string;
}

export default function EventMap({ lat, lng, label }: EventMapProps) {
  return (
    <div className="h-64 w-full overflow-hidden rounded-2xl border border-black/5">
      <MapContainer center={[lat, lng]} zoom={13} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={markerIcon}>
          <Popup>{label}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
