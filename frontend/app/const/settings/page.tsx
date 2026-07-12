"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";
import { AdminGuard } from "../../../components/AdminGuard";

const EMPTY = {
  siteName: "", supportEmail: "", maintenanceMode: false, announcementBanner: "",
  requireEventApproval: true, requireBusinessApproval: true, defaultCommissionPct: 10, autoApproveVerified: false,
};

export default function AdminSettingsPage() {
  const { user } = useAuth(); const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    api.get("/admin/settings").then(r => setForm({ ...EMPTY, ...r.data.settings, announcementBanner: r.data.settings.announcementBanner || "" })).finally(() => setFetching(false));
  }, [user]);

  function u<K extends keyof typeof EMPTY>(k: K, v: typeof EMPTY[K]) { setForm(f => ({ ...f, [k]: v })); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/admin/settings", { ...form, announcementBanner: form.announcementBanner || null });
      toast.success("Settings saved.");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminGuard>
    <div className="animate-fade-in">
      <div className="bg-gradient-to-r from-violet-700 to-indigo-700 text-white px-6 sm:px-9 py-11"><div className="max-w-7xl mx-auto"><h1 className="font-extrabold text-2xl">Site Settings</h1><p className="text-white/70 text-sm mt-1">Platform-wide configuration — changes apply immediately, no redeploy needed.</p></div></div>
      <div className="max-w-7xl mx-auto px-6 sm:px-9 py-9 max-w-2xl">
        {fetching ? <p className="text-gray-400 text-sm">Loading…</p> : (
          <form onSubmit={save} className="card-base p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Site name</label>
              <input value={form.siteName} onChange={e=>u("siteName", e.target.value)} className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Support email</label>
              <input value={form.supportEmail} onChange={e=>u("supportEmail", e.target.value)} type="email" className="input-base" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Announcement banner <span className="text-gray-400 font-normal">(optional, shown site-wide)</span></label>
              <input value={form.announcementBanner} onChange={e=>u("announcementBanner", e.target.value)} className="input-base" placeholder="e.g. Scheduled maintenance Sunday 2am–4am EAT" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Default commission (%)</label>
              <input value={form.defaultCommissionPct} onChange={e=>u("defaultCommissionPct", Number(e.target.value))} type="number" step="0.1" min="0" max="100" className="input-base !w-40" />
            </div>

            <div className="space-y-3 pt-2 border-t border-gray-100">
              <label className="flex items-center justify-between gap-4 cursor-pointer">
                <span className="text-sm font-semibold text-gray-700">Require admin approval for new events</span>
                <input type="checkbox" checked={form.requireEventApproval} onChange={e=>u("requireEventApproval", e.target.checked)} className="w-5 h-5 accent-sky-600" />
              </label>
              <label className="flex items-center justify-between gap-4 cursor-pointer">
                <span className="text-sm font-semibold text-gray-700">Require admin approval for new businesses</span>
                <input type="checkbox" checked={form.requireBusinessApproval} onChange={e=>u("requireBusinessApproval", e.target.checked)} className="w-5 h-5 accent-sky-600" />
              </label>
              <label className="flex items-center justify-between gap-4 cursor-pointer">
                <span className="text-sm font-semibold text-gray-700">Auto-approve submissions from verified organizers</span>
                <input type="checkbox" checked={form.autoApproveVerified} onChange={e=>u("autoApproveVerified", e.target.checked)} className="w-5 h-5 accent-sky-600" />
              </label>
              <label className="flex items-center justify-between gap-4 cursor-pointer">
                <span className="text-sm font-semibold text-gray-700">🚧 Maintenance mode</span>
                <input type="checkbox" checked={form.maintenanceMode} onChange={e=>u("maintenanceMode", e.target.checked)} className="w-5 h-5 accent-red-600" />
              </label>
            </div>

            <button type="submit" disabled={saving} className="btn-primary !px-6 !py-2.5 w-full !justify-center">{saving ? "Saving…" : "Save settings"}</button>
            <p className="text-xs text-gray-400">
              Approval toggles take effect immediately for new submissions. Flagged/suspicious listings still always go to the review queue, regardless of these settings.
            </p>
          </form>
        )}
      </div>
    </div>
    </AdminGuard>
  );
}
