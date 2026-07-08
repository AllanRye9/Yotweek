"use client";
import { useState } from "react";

/**
 * Cover image + photo gallery input for listing forms (events, businesses).
 * There's no file-upload/storage backend wired up yet, so this takes direct
 * media URLs (host on Cloudinary/S3/your CDN and paste the link) — same
 * pattern already used for the admin hero slideshow.
 */
export function ImageUrlInput({
  coverImageUrl, onCoverChange, galleryUrls, onGalleryChange,
}: {
  coverImageUrl: string;
  onCoverChange: (v: string) => void;
  galleryUrls: string[];
  onGalleryChange: (v: string[]) => void;
}) {
  const [newGalleryUrl, setNewGalleryUrl] = useState("");
  const [coverError, setCoverError] = useState(false);

  function addGalleryUrl() {
    const url = newGalleryUrl.trim();
    if (!url) return;
    if (galleryUrls.includes(url)) { setNewGalleryUrl(""); return; }
    onGalleryChange([...galleryUrls, url]);
    setNewGalleryUrl("");
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
        <div className="flex gap-3 items-start">
          <input
            type="url"
            value={coverImageUrl}
            onChange={e => { onCoverChange(e.target.value); setCoverError(false); }}
            className="input-base flex-1"
            placeholder="https://…/photo.jpg"
          />
          <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
            {coverImageUrl && !coverError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImageUrl} alt="Cover preview" className="w-full h-full object-cover" onError={() => setCoverError(true)} />
            ) : (
              <span className="text-xl text-gray-300">🖼️</span>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">Paste a direct image link (from Cloudinary, S3, Google Photos share, etc). This shows on cards and at the top of your listing.</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Photo gallery <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={newGalleryUrl}
            onChange={e => setNewGalleryUrl(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addGalleryUrl(); } }}
            className="input-base flex-1"
            placeholder="https://…/another-photo.jpg"
          />
          <button type="button" onClick={addGalleryUrl} className="btn-secondary !px-4 shrink-0">+ Add</button>
        </div>
        {galleryUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {galleryUrls.map(url => (
              <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Gallery preview" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.opacity = "0.15"; }} />
                <button type="button" onClick={() => removeGalleryUrl(url)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-400 mt-1">Add a few extra photos — these appear as a scrollable gallery on your listing page.</p>
      </div>
    </div>
  );
}
