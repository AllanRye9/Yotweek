"use client";
import { useRef, useState } from "react";
import { api } from "../lib/api";
import { useToast } from "./Toast";
import { GalleryThumb } from "./GalleryThumb";

const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif";
const ACCEPTED_GALLERY = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime";
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const r = await api.post("/uploads/image", formData);
  return r.data.url as string;
}

async function uploadGalleryVideo(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("video", file);
  const r = await api.post("/uploads/listing-video", formData);
  return r.data.url as string;
}

/**
 * Cover image + photo gallery uploader for listing forms (events,
 * businesses). Uploads real files to the backend (POST /api/uploads/image),
 * which stores them on disk and returns a public URL — no external
 * hosting/paste-a-link step required.
 */
export function ImageUrlInput({
  coverImageUrl, onCoverChange, galleryUrls, onGalleryChange,
}: {
  coverImageUrl: string;
  onCoverChange: (v: string) => void;
  galleryUrls: string[];
  onGalleryChange: (v: string[]) => void;
}) {
  const toast = useToast();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  function validate(file: File): string | null {
    if (!file.type.startsWith("image/")) return "Please choose an image file.";
    if (file.size > MAX_BYTES) return "Image is too large (max 8MB).";
    return null;
  }

  async function handleCoverPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (coverInputRef.current) coverInputRef.current.value = "";
    if (!file) return;
    const problem = validate(file);
    if (problem) { toast.error(problem); return; }
    setUploadingCover(true);
    try {
      const url = await uploadImage(file);
      onCoverChange(url);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Could not upload image.");
    } finally {
      setUploadingCover(false);
    }
  }

  function validateGalleryFile(file: File): string | null {
    if (file.type.startsWith("image/")) {
      if (file.size > MAX_BYTES) return "Image is too large (max 8MB).";
      return null;
    }
    if (file.type.startsWith("video/")) {
      if (file.size > MAX_VIDEO_BYTES) return "Video is too large (max 50MB).";
      return null;
    }
    return "Please choose an image or video file.";
  }

  async function handleGalleryPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (files.length === 0) return;
    setUploadingGallery(true);
    const results = await Promise.all(files.map(async file => {
      const problem = validateGalleryFile(file);
      if (problem) { toast.error(`${file.name}: ${problem}`); return null; }
      try {
        return file.type.startsWith("video/") ? await uploadGalleryVideo(file) : await uploadImage(file);
      } catch (err: any) {
        toast.error(`${file.name}: ${err?.response?.data?.error || "upload failed"}`);
        return null;
      }
    }));
    const uploaded = results.filter((u): u is string => !!u);
    if (uploaded.length) onGalleryChange([...galleryUrls, ...uploaded]);
    setUploadingGallery(false);
  }

  function removeGalleryUrl(url: string) {
    onGalleryChange(galleryUrls.filter(u => u !== url));
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Cover image <span className="text-gray-400 font-normal">(optional but recommended)</span>
        </label>
        <div className="flex gap-3 items-center">
          <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
            {uploadingCover ? (
              <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            ) : coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl text-gray-300">🖼️</span>
            )}
          </div>
          <input ref={coverInputRef} type="file" accept={ACCEPTED} onChange={handleCoverPick} className="hidden" id="cover-upload-input" />
          <label htmlFor="cover-upload-input" className="btn-secondary cursor-pointer !px-4 !py-2 !text-sm">
            {uploadingCover ? "Uploading…" : coverImageUrl ? "Change photo" : "Upload photo"}
          </label>
          {coverImageUrl && !uploadingCover && (
            <button type="button" onClick={() => onCoverChange("")} className="btn-ghost !px-3 !py-2 !text-xs">Remove</button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1.5">JPEG, PNG, WEBP, or GIF — up to 8MB. Shows on cards and at the top of your listing.</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Photo & video gallery <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input ref={galleryInputRef} type="file" accept={ACCEPTED_GALLERY} multiple onChange={handleGalleryPick} className="hidden" id="gallery-upload-input" />
        <label htmlFor="gallery-upload-input" className="btn-secondary cursor-pointer inline-flex !px-4 !py-2 !text-sm">
          {uploadingGallery ? "Uploading…" : "+ Add photos or videos"}
        </label>
        {galleryUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {galleryUrls.map(url => (
              <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 group">
                <GalleryThumb url={url} alt="Gallery preview" className="w-16 h-16" />
                <button type="button" onClick={() => removeGalleryUrl(url)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-1.5">Select several files at once — photos (JPEG/PNG/WEBP/GIF, up to 8MB each) or videos (MP4/WEBM/MOV, up to 50MB each). They appear as a scrollable gallery on your listing page.</p>
      </div>
    </div>
  );
}
