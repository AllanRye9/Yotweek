"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { LogoUploadInput } from "../../components/LogoUploadInput";

export default function ProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    name: "", phone: "", country: "", city: "", organizationName: "", bio: "", avatarUrl: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "", phone: user.phone || "", country: user.country || "",
        city: user.city || "", organizationName: user.organizationName || "",
        bio: user.bio || "", avatarUrl: user.avatarUrl || "",
      });
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login?next=/profile");
  }, [loading, user, router]);

  function u(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/users/me", form);
      await refreshUser();
      toast.success("Profile updated!");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-gray-400">Loading…</div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-extrabold text-2xl sm:text-3xl mb-1">Your profile</h1>
          <p className="text-white/70 text-sm">Update how you appear across yotweek.</p>
        </div>
      </div>

      <form onSubmit={save} className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <div className="card-base p-5 sm:p-6 space-y-5">
          <LogoUploadInput logoUrl={form.avatarUrl} onChange={v => u("avatarUrl", v)} />

          <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-1.5">Full name</span>
            <input value={form.name} onChange={e => u("name", e.target.value)} className="input-base" required />
          </label>

          <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-1.5">Bio</span>
            <textarea value={form.bio} onChange={e => u("bio", e.target.value)} rows={3}
              placeholder="A short line about you — what you're into, what you organize, where you explore."
              className="input-base" maxLength={300} />
            <p className="text-xs text-gray-400 mt-1">{form.bio.length}/300</p>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-semibold text-gray-700 mb-1.5">Phone</span>
              <input value={form.phone} onChange={e => u("phone", e.target.value)} className="input-base" />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-gray-700 mb-1.5">Organization</span>
              <input value={form.organizationName} onChange={e => u("organizationName", e.target.value)} className="input-base" placeholder="Optional" />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-gray-700 mb-1.5">City</span>
              <input value={form.city} onChange={e => u("city", e.target.value)} className="input-base" />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-gray-700 mb-1.5">Country</span>
              <input value={form.country} onChange={e => u("country", e.target.value)} className="input-base" />
            </label>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Email: <span className="text-gray-600 font-medium">{user.email}</span> · Role: <span className="text-gray-600 font-medium">{user.role}</span>
            </p>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full !py-3 !rounded-xl !justify-center">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
