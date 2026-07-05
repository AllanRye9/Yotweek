// EventMap placeholder — install react-leaflet and leaflet to enable the map.
// Usage: <EventMap lat={e.latitude} lng={e.longitude} title={e.title} />
export function EventMap({ lat, lng, title }: { lat?: number | null; lng?: number | null; title?: string }) {
  if (!lat || !lng) return null;
  const url = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.05},${lat-0.05},${lng+0.05},${lat+0.05}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <div className="card-base overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <p className="text-sm font-bold text-gray-800">📍 {title || "Event location"}</p>
      </div>
      <iframe src={url} width="100%" height="200" style={{border:0}} loading="lazy" title="Event location map" />
    </div>
  );
}
