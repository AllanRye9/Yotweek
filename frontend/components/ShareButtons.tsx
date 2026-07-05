"use client";
import { useToast } from "./Toast";
export function ShareButtons({ title, url }: { title:string; url:string }) {
  const toast = useToast();
  const enc = encodeURIComponent;
  return (
    <div className="flex flex-wrap gap-2">
      {[
        { label:"WhatsApp", icon:"💬", href:`https://wa.me/?text=${enc(title+" "+url)}`, c:"hover:bg-green-50 hover:border-green-300 hover:text-green-700" },
        { label:"Facebook", icon:"f",  href:`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, c:"hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700" },
        { label:"X",        icon:"𝕏",  href:`https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`, c:"hover:bg-gray-100" },
      ].map(l => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 bg-white transition-all ${l.c}`}>
          <span style={{fontSize:"0.85rem"}}>{l.icon}</span> {l.label}
        </a>
      ))}
      <button onClick={() => { navigator.clipboard.writeText(url); toast.success("Link copied!"); }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 bg-white hover:bg-sky-50 hover:border-sky-300 hover:text-sky-700 transition-all">
        🔗 Copy link
      </button>
    </div>
  );
}
