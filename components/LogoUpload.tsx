"use client";

import { useRef, useState } from "react";
import { Image as ImageIcon, Loader2, X, AlertCircle, Upload } from "lucide-react";

interface Props {
  /** Field name on the surrounding form. Hidden input carries the URL. */
  name: string;
  defaultUrl?: string | null;
  /** Display label for the placeholder + remove text. */
  label?: string;
  /** Shape — wide rectangle for the full logo, square for icon variant. */
  shape?: "wide" | "square";
}

/**
 * Drop-in file picker that uploads to /api/upload/logo (Cloudinary) and
 * tracks the resulting URL in a hidden input. Same pattern as
 * <PhotoUpload> but accepts SVG and stores under the branding folder.
 */
export function LogoUpload({ name, defaultUrl, label = "Logo", shape = "wide" }: Props) {
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(""); setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/logo", { method: "POST", body: fd });
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

  const wrapperClass = shape === "wide"
    ? "h-24 w-full max-w-xs rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden"
    : "h-24 w-24 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden";

  return (
    <div>
      <input type="hidden" name={name} value={url} />
      <div className={wrapperClass}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="max-h-full max-w-full object-contain" />
        ) : (
          <ImageIcon className="h-8 w-8 text-slate-300" />
        )}
        {busy && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-brand-700" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" /> {url ? `Change ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
        </button>
        {url && (
          <button
            type="button"
            onClick={() => { setUrl(""); setError(""); }}
            disabled={busy}
            className="inline-flex items-center gap-1 text-xs text-rose-700 hover:bg-rose-50 px-2 py-1.5 rounded-lg"
          >
            <X className="h-3 w-3" /> Remove
          </button>
        )}
      </div>
      <p className="text-[11px] text-slate-500 mt-1.5">PNG, JPG, WebP or SVG · max 2 MB</p>
      {error && (
        <p className="text-[11px] text-rose-700 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {error}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={onPick}
      />
    </div>
  );
}
