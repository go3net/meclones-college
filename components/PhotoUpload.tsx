"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2, X, AlertCircle } from "lucide-react";

interface Props {
  /** Field name on the surrounding form. The current URL is exposed via a hidden input. */
  name: string;
  /** Existing photo URL when editing. */
  defaultUrl?: string | null;
  /** Display name used to initial-render the placeholder avatar. */
  alt?: string;
  /** Round (avatar) or rectangle (cover). Defaults to round. */
  shape?: "circle" | "square";
  /** Diameter in pixels (default 96). */
  size?: number;
}

/**
 * Drop-in file picker that uploads to /api/upload (Cloudinary) and tracks
 * the resulting URL in a hidden input so the surrounding <form> picks it up
 * on submit. Shows a live preview + tiny remove button after upload.
 */
export function PhotoUpload({ name, defaultUrl, alt = "Photo", shape = "circle", size = 96 }: Props) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed");
      setUrl(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const clear = () => { setUrl(""); setError(""); };
  const initials = alt.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  const rounded = shape === "circle" ? "rounded-full" : "rounded-xl";

  return (
    <div className="flex items-start gap-4">
      <input type="hidden" name={name} value={url} />

      <div
        className={`relative bg-brand-100 text-brand-700 flex items-center justify-center font-bold ring-2 ring-gold-200 ${rounded} overflow-hidden shrink-0`}
        style={{ width: size, height: size, fontSize: size * 0.3 }}
      >
        {url ? (
          <Image src={url} alt={alt} fill sizes={`${size}px`} className="object-cover" />
        ) : (
          initials || "?"
        )}

        {busy && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-brand-700" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            <Camera className="h-3.5 w-3.5" /> {url ? "Change photo" : "Upload photo"}
          </button>
          {url && (
            <button
              type="button"
              onClick={clear}
              disabled={busy}
              className="inline-flex items-center gap-1 text-xs text-rose-700 hover:bg-rose-50 px-2 py-1.5 rounded-lg"
            >
              <X className="h-3 w-3" /> Remove
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5">JPG, PNG or WebP · max 2 MB · auto-cropped to a square focused on the face.</p>
        {error && (
          <p className="text-[11px] text-rose-700 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {error}</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onPick}
        />
      </div>
    </div>
  );
}
