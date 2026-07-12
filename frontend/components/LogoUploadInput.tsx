"use client";
import { useRef, useState } from "react";
import { api } from "../lib/api";
import { useToast } from "./Toast";

const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif";
const MAX_BYTES = 4 * 1024 * 1024;

/** Small square logo uploader — separate from the wide cover photo, shown as a badge on cards and business pages. */
export function LogoUploadInput({ logoUrl, onChange }: { logoUrl: string; onChange: (v: string) => void }) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    if (file.size > MAX_BYTES) { toast.error("Logo is too large (max 4MB)."); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const r = await api.post("/uploads/image", formData);
      onChange(r.data.url);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not upload logo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        Logo <span className="text-gray-400 font-normal">(optional)</span>
      </label>
      <div className="flex gap-3 items-center">
        <div className="w-16 h-16 shrink-0 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
          {uploading ? (
            <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          ) : logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo preview" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl text-gray-300">🏷️</span>
          )}
        </div>
        <input ref={inputRef} type="file" accept={ACCEPTED} onChange={handlePick} className="hidden" id="logo-upload-input" />
        <label htmlFor="logo-upload-input" className="btn-secondary cursor-pointer !px-4 !py-2 !text-sm">
          {uploading ? "Uploading…" : logoUrl ? "Change logo" : "Upload logo"}
        </label>
        {logoUrl && !uploading && (
          <button type="button" onClick={() => onChange("")} className="btn-ghost !px-3 !py-2 !text-xs">Remove</button>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-1.5">Square image works best — shown on your business card and profile.</p>
    </div>
  );
}
