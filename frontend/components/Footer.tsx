import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-8">
          <div className="col-span-2 md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4 w-fit hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center font-black text-white shadow-glow">YW</div>
              <div>
                <span className="font-extrabold text-white text-xl">yot<span className="font-serif italic text-sky-300">week</span></span>
                <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest">Discover · Explore</p>
              </div>
            </Link>
            <p className="text-sm leading-relaxed text-slate-400 max-w-xs mb-4">Events, businesses, and destinations — local and international. Powered by smart recommendations tailored to your interests.</p>
          </div>

          {[
            { title:"Explore", links:[
              { href:"/events", label:"All Events" },
              { href:"/businesses", label:"Businesses" },
              { href:"/destinations", label:"Destinations" },
              { href:"/blog", label:"Travel Blog" },
              { href:"/events?priceType=FREE", label:"Free Events" },
            ]},
            { title:"Categories", links:[
              { href:"/events?category=WILDLIFE_SAFARI", label:"Wildlife & Safari" },
              { href:"/events?category=CULTURAL_HERITAGE", label:"Culture & Heritage" },
              { href:"/events?category=ADVENTURE_OUTDOOR", label:"Adventure" },
              { href:"/events?category=FESTIVAL", label:"Festivals" },
              { href:"/businesses", label:"Restaurants & Hotels" },
            ]},
            { title:"Organizers", links:[
              { href:"/events/create", label:"List an Event" },
              { href:"/businesses/create", label:"List a Business" },
              { href:"/dashboard", label:"Dashboard" },
              { href:"/auth/register", label:"Create Account" },
              { href:"/auth/login", label:"Sign In" },
            ]},
          ].map(col => (
            <div key={col.title}>
              <h4 className="text-white font-bold text-sm uppercase tracking-wide mb-3 pb-1 border-b border-white/10">{col.title}</h4>
              <ul className="space-y-2 text-sm">
                {col.links.map(l => <li key={l.href}><Link href={l.href} className="text-slate-400 hover:text-sky-300 transition-colors">{l.label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} yotweek. All listings are admin-verified before going live.</p>
          <p>Smart recommendations powered by your interests & location.</p>
        </div>
      </div>
    </footer>
  );
}
