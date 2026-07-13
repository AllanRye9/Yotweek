"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/Toast";

const INIT = { name: "", description: "", city: "", country: "", interestTag: "", coverImageUrl: "" };
const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif";

export default function CreateCommunityPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(INIT);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  function u(k: keyof typeof INIT, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleCoverPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image is too large (max 8MB)."); return; }
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const r = await api.post("/uploads/image", formData);
      u("coverImageUrl", r.data.url);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not upload image.");
    } finally {
      setUploadingCover(false);
    }
  }

  if (!loading && !user) {
    if (typeof window !== "undefined") router.push("/auth/login?next=/communities/create");
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.city && !form.interestTag) {
      toast.error("Give your community a place, an interest, or both.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await api.post("/communities", { ...form, coverImageUrl: form.coverImageUrl.trim() || undefined });
      toast.success("Community created! 🎉");
      router.push(`/communities/${r.data.community.slug}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.errors?.[0]?.msg || "Could not create community.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-shell">
          <h1 className="font-extrabold text-2xl sm:text-3xl">Start a community</h1>
          <p className="text-white/70 text-sm mt-1">Bring people together around a place, an interest, or both.</p>
        </div>
      </div>

      <form onSubmit={submit} className="page-shell py-9 max-w-2xl space-y-5">
        <label className="block">
          <span className="block text-sm font-semibold text-gray-700 mb-1.5">Community name<span className="text-red-500 ml-0.5">*</span></span>
          <input required minLength={3} value={form.name} onChange={e => u("name", e.target.value)} className="input-base" placeholder="e.g. Gulu Creatives" />
        </label>
        <label className="block">
          <span className="block text-sm font-semibold text-gray-700 mb-1.5">Description<span className="text-red-500 ml-0.5">*</span></span>
          <textarea required minLength={10} rows={4} value={form.description} onChange={e => u("description", e.target.value)} className="textarea-base" placeholder="What's this community about? Who's it for?" />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-1.5">City</span>
            <input value={form.city} onChange={e => u("city", e.target.value)} className="input-base" placeholder="Gulu" />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-1.5">Country</span>
            <input value={form.country} onChange={e => u("country", e.target.value)} className="input-base" placeholder="Uganda" />
          </label>
        </div>
        <label className="block">
          <span className="block text-sm font-semibold text-gray-700 mb-1.5">Interest tag <span className="text-gray-400 font-normal">(optional if you gave a place)</span></span>
          <input value={form.interestTag} onChange={e => u("interestTag", e.target.value)} className="input-base" placeholder="e.g. Wildlife Photography" />
        </label>
        <div className="pt-1 border-t border-gray-100">
          <p className="text-sm font-bold text-gray-900 mb-3 mt-4">📸 Cover photo <span className="text-gray-400 font-normal">(optional)</span></p>
          <div className="flex gap-3 items-center">
            <div className="w-20 h-14 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
              {uploadingCover ? (
                <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
              ) : form.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.coverImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl text-gray-300">🖼️</span>
              )}
            </div>
            <input type="file" accept={ACCEPTED} onChange={handleCoverPick} className="hidden" id="community-cover-input" />
            <label htmlFor="community-cover-input" className="btn-secondary cursor-pointer !px-4 !py-2 !text-sm">
              {uploadingCover ? "Uploading…" : form.coverImageUrl ? "Change photo" : "Upload photo"}
            </label>
          </div>
        </div>
        <button type="submit" disabled={submitting} className="btn-primary w-full !py-3 !rounded-xl !justify-center">
          {submitting ? "Creating…" : "Create community"}
        </button>
      </form>
    </div>
  );
}
