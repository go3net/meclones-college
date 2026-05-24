"use client";

import { useRef, useState } from "react";
import { Paperclip, Loader2, X, AlertCircle, FileText, Image as ImageIcon } from "lucide-react";

interface Attachment {
  url: string;
  name: string;
  mime: string;
  size: number;
}

interface Props {
  /** Field name prefix; exposes hidden inputs `<name>Url|Name|Mime|Size`. */
  namePrefix?: string;
  /** Compact mode for inline use under a textarea. */
  compact?: boolean;
}

/**
 * File picker for in-portal messages. Uploads to /api/upload/attachment
 * and tracks the resulting URL + metadata in hidden inputs so the
 * surrounding <form> picks them up on submit. Accepts images + PDFs.
 */
export function AttachmentPicker({ namePrefix = "attachment", compact = false }: Props) {
  const [att, setAtt] = useState<Attachment | null>(null);
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
      const res = await fetch("/api/upload/attachment", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed");
      setAtt({ url: json.url, name: json.name, mime: json.mime, size: json.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const clear = () => { setAtt(null); setError(""); };

  const isImage = att?.mime.startsWith("image/");
  const sizeLabel = att ? formatBytes(att.size) : "";

  return (
    <div className={compact ? "" : "space-y-2"}>
      {/* Hidden inputs that the surrounding form picks up. */}
      <input type="hidden" name={`${namePrefix}Url`} value={att?.url ?? ""} />
      <input type="hidden" name={`${namePrefix}Name`} value={att?.name ?? ""} />
      <input type="hidden" name={`${namePrefix}Mime`} value={att?.mime ?? ""} />
      <input type="hidden" name={`${namePrefix}Size`} value={att?.size ?? ""} />

      {att ? (
        <div className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs">
          {isImage ? (
            <img src={att.url} alt={att.name} className="h-8 w-8 rounded object-cover shrink-0" />
          ) : (
            <FileText className="h-5 w-5 text-rose-600 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-brand-900 truncate">{att.name}</p>
            <p className="text-[10px] text-slate-500">{sizeLabel}</p>
          </div>
          <button
            type="button"
            onClick={clear}
            disabled={busy}
            className="text-rose-700 hover:bg-rose-100 rounded p-1"
            aria-label="Remove attachment"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium px-2.5 py-1.5 rounded-lg disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
            {busy ? "Uploading…" : "Attach file"}
          </button>
          {!compact && (
            <p className="text-[11px] text-slate-500">Image or PDF · max 5 MB</p>
          )}
        </div>
      )}

      {error && (
        <p className="text-[11px] text-rose-700 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
        className="hidden"
        onChange={onPick}
      />
    </div>
  );
}

/**
 * Read-only renderer for an attached file inside a message bubble.
 * Image previews open in a new tab; PDFs show a file chip with a download link.
 */
export function AttachmentChip({
  url,
  name,
  mime,
  size,
  mine,
}: {
  url: string;
  name: string;
  mime: string | null;
  size: number | null;
  mine: boolean;
}) {
  const isImage = mime?.startsWith("image/");
  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noreferrer noopener" className="block mt-2">
        <img
          src={url}
          alt={name}
          className="max-h-60 max-w-full rounded-lg border border-white/20 object-cover"
        />
      </a>
    );
  }
  const sizeLabel = size ? formatBytes(size) : "";
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      download={name}
      className={`mt-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs border ${mine
        ? "bg-white/10 border-white/20 text-white hover:bg-white/20"
        : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"}`}
    >
      <FileText className={`h-4 w-4 ${mine ? "text-white" : "text-rose-600"}`} />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{name}</p>
        {sizeLabel && <p className={`text-[10px] ${mine ? "text-white/70" : "text-slate-500"}`}>{sizeLabel}</p>}
      </div>
    </a>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
