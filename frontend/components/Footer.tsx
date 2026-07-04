import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-black/5 bg-savanna-900 py-10 text-orange-50/80">
      <div className="container-page grid gap-8 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold text-white">🌍 yotweek</p>
          <p className="mt-2 text-sm">Discover events, places and businesses, local and international — free or paid, always verified.</p>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-semibold text-white">Explore</p>
          <ul className="space-y-1">
            <li><Link href="/events">Browse events</Link></li>
            <li><Link href="/destinations">Destination guides</Link></li>
            <li><Link href="/itinerary">Itinerary builder</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-semibold text-white">Organizers</p>
          <ul className="space-y-1">
            <li><Link href="/events/create">List an event</Link></li>
            <li><Link href="/dashboard">Organizer dashboard</Link></li>
            <li><Link href="/auth/register">Create an account</Link></li>
          </ul>
        </div>
      </div>
      <p className="container-page mt-8 text-xs text-orange-50/50">
        © {new Date().getFullYear()} yotweek. All listings are reviewed by our team before going live.
      </p>
    </footer>
  );
}
