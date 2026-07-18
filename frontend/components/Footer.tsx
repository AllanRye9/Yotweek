import Link from "next/link";
import { useIntlayer, getLocale } from "next-intlayer/server";

export async function Footer() {
  const locale = await getLocale();
  // next-intlayer/server's useIntlayer is safe (and documented) to call in an
  // async Server Component - it isn't a real React hook, just named like one.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const content = useIntlayer("footer", locale);
  const cols = [
    { title: content.colExplore, links: [
      { href: "/events", label: content.linkAllEvents },
      { href: "/businesses", label: content.linkBusinesses },
      { href: "/destinations", label: content.linkDestinations },
      { href: "/blog", label: content.linkTravelBlog },
      { href: "/events?priceType=FREE", label: content.linkFreeEvents },
    ]},
    { title: content.colCategories, links: [
      { href: "/events?category=WILDLIFE_SAFARI", label: content.linkWildlifeSafari },
      { href: "/events?category=CULTURAL_HERITAGE", label: content.linkCultureHeritage },
      { href: "/events?category=ADVENTURE_OUTDOOR", label: content.linkAdventure },
      { href: "/events?category=FESTIVAL", label: content.linkFestivals },
      { href: "/businesses", label: content.linkRestaurantsHotels },
    ]},
    { title: content.colOrganizers, links: [
      { href: "/events/create", label: content.linkListEvent },
      { href: "/businesses/create", label: content.linkListBusiness },
      { href: "/dashboard", label: content.linkDashboard },
      { href: "/auth/register", label: content.linkCreateAccount },
      { href: "/auth/login", label: content.linkSignIn },
    ]},
  ];

  return (
    <footer className="bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 text-slate-300">
      <div className="max-w-7xl mx-auto px-6 sm:px-9 py-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-9 md:gap-8">
          <div className="col-span-2 md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4 w-fit hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center font-black text-white shadow-glow">YW</div>
              <div>
                <span className="font-extrabold text-white text-xl">yot<span className="font-serif italic text-sky-300">week</span></span>
                <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest">{content.tagline}</p>
              </div>
            </Link>
            <p className="text-sm leading-relaxed text-slate-400 max-w-xs mb-4">{content.description}</p>
          </div>

          {cols.map((col, i) => (
            <div key={i}>
              <h4 className="text-white font-bold text-sm uppercase tracking-wide mb-3 pb-1 border-b border-white/10">{col.title}</h4>
              <ul className="space-y-2 text-sm">
                {col.links.map(l => <li key={l.href}><Link href={l.href} className="text-slate-400 hover:text-sky-300 transition-colors">{l.label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 sm:px-9 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} yotweek. {content.copyrightNote}</p>
          <p>{content.poweredByNote}</p>
        </div>
      </div>
    </footer>
  );
}
