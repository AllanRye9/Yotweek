"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";

interface Itinerary { id:string; title:string; startDate:string; endDate:string; items:any[]; }

export default function ItineraryPage() {
  const { user, loading } = useAuth();
  const toast = useToast();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [form, setForm] = useState({ title:"", startDate:"", endDate:"" });
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string|null>(null);

  function load() { api.get("/itineraries").then(r => setItineraries(r.data.itineraries)).catch(()=>{}); }
  useEffect(() => { if (user) load(); }, [user]);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setCreating(true);
    try { await api.post("/itineraries", form); toast.success("Itinerary created!"); setForm({title:"",startDate:"",endDate:""}); setShowForm(false); load(); }
    catch { toast.error("Could not create itinerary."); }
    finally { setCreating(false); }
  }

  async function addStop(itineraryId: string, day: number) {
    const title = prompt("What's the plan? (e.g. Lunch at Acholi Inn)"); if (!title) return;
    const time = prompt("Time? (e.g. 09:00) — leave blank to skip") || undefined;
    try { await api.post(`/itineraries/${itineraryId}/items`, { customTitle:title, day, startTime:time }); toast.success("Stop added!"); load(); }
    catch { toast.error("Could not add stop."); }
  }

  async function removeItem(itemId: string) {
    try { await api.delete(`/itineraries/items/${itemId}`); load(); }
    catch { toast.error("Could not remove stop."); }
  }

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-400">Loading…</div>;
  if (!user) return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="card-base p-10 text-center max-w-md">
        <div style={{fontSize:"3rem"}} className="mb-4">📅</div>
        <h1 className="font-extrabold text-2xl text-gray-900 mb-2">Sign in to build itineraries</h1>
        <Link href="/auth/login" className="btn-primary !px-8 !py-3 !rounded-xl mt-4 inline-flex">Sign in</Link>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-extrabold text-2xl sm:text-3xl mb-1">Itinerary Builder</h1>
            <p className="text-white/70 text-sm">Plan your trip day by day — events, businesses, and custom stops.</p>
          </div>
          <button onClick={() => setShowForm(p=>!p)} className="btn-secondary !bg-white/10 !border-white/30 !text-white hover:!bg-white/20">
            {showForm ? "✕ Cancel" : "➕ New itinerary"}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-9 py-9">
        {showForm && (
          <form onSubmit={create} className="card-base p-5 mb-6 animate-fade-up">
            <h2 className="font-bold text-gray-900 mb-4">New itinerary</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
                <input required value={form.title} onChange={e => setForm({...form,title:e.target.value})} className="input-base" placeholder="Northern Uganda Weekend" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start <span className="text-red-500">*</span></label>
                <input required type="date" value={form.startDate} onChange={e => setForm({...form,startDate:e.target.value})} className="input-base" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">End <span className="text-red-500">*</span></label>
                <input required type="date" min={form.startDate} value={form.endDate} onChange={e => setForm({...form,endDate:e.target.value})} className="input-base" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="submit" disabled={creating} className="btn-primary !px-6">{creating?"Creating…":"Create"}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            </div>
          </form>
        )}

        {itineraries.length === 0 ? (
          <div className="card-base p-14 text-center">
            <div style={{fontSize:"3.5rem"}} className="mb-4">🗺️</div>
            <h2 className="font-extrabold text-xl text-gray-900 mb-2">No itineraries yet</h2>
            <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">Build a day-by-day travel plan, combining events you discover on yotweek with your own stops.</p>
            <button onClick={() => setShowForm(true)} className="btn-primary !px-8 !py-3">Create your first itinerary</button>
          </div>
        ) : (
          <div className="space-y-4">
            {itineraries.map(it => {
              const dayCount = Math.max(1, Math.ceil((new Date(it.endDate).getTime()-new Date(it.startDate).getTime())/86400000)+1);
              const isExpanded = expanded === it.id;
              return (
                <div key={it.id} className="card-base overflow-hidden">
                  <button onClick={() => setExpanded(isExpanded?null:it.id)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-lg shrink-0">{dayCount}</div>
                      <div>
                        <h2 className="font-extrabold text-gray-900">{it.title}</h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {format(new Date(it.startDate),"d MMM")} – {format(new Date(it.endDate),"d MMM yyyy")} · {dayCount} day{dayCount!==1?"s":""} · {it.items.length} stop{it.items.length!==1?"s":""}
                        </p>
                      </div>
                    </div>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded?"rotate-180":""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 p-5 animate-fade-up">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({length:dayCount},(_,i)=>i+1).map(day => {
                          const dayDate = new Date(it.startDate);
                          dayDate.setDate(dayDate.getDate()+day-1);
                          const stops = it.items.filter((s:any)=>s.day===day).sort((a:any,b:any)=>(a.sortOrder||0)-(b.sortOrder||0));
                          return (
                            <div key={day} className="rounded-xl border border-gray-100 bg-slate-50 p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="text-xs font-bold text-sky-600 uppercase tracking-wide">Day {day}</p>
                                  <p className="text-[10px] text-gray-400">{format(dayDate,"EEE, d MMM")}</p>
                                </div>
                                <button onClick={() => addStop(it.id,day)} className="text-[10px] font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-1 rounded-lg transition-colors">+ Add</button>
                              </div>
                              <div className="space-y-1.5">
                                {stops.length===0 ? (
                                  <p className="text-[11px] text-gray-300 italic text-center py-3">Nothing planned</p>
                                ) : stops.map((s:any) => (
                                  <div key={s.id} className="flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100 shadow-sm">
                                    <div className="min-w-0">
                                      {s.startTime && <p className="text-[10px] text-sky-500 font-bold">{s.startTime}</p>}
                                      <p className="text-xs font-semibold text-gray-800 truncate">{s.event?.title||s.customTitle}</p>
                                    </div>
                                    <button onClick={() => removeItem(s.id)} className="text-gray-200 hover:text-red-400 transition-colors shrink-0">✕</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <Link href="/events" className="btn-secondary !text-xs !px-4 !py-2">Browse events to add →</Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
