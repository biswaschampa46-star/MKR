"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import type { AboutMedia } from "@/db/schema";

const inputCls =
  "w-full rounded-lg border border-line bg-transparent px-4 py-2.5 text-sm text-foam placeholder:text-mist/40 focus:border-soft/60 focus:outline-none";

type Uploaded = { url: string; kind: "image" | "video" };

export default function AboutMediaManager({ initialMedia }: { initialMedia: AboutMedia[] }) {
  const router = useRouter();
  const [media, setMedia] = useState<AboutMedia[]>(initialMedia);
  const [uploaded, setUploaded] = useState<Uploaded | null>(null);
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<AboutMedia | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  };

  const onFile = async (file: File) => {
    if (uploading || busy) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { ok: boolean; url?: string; message?: string };
      if (data.ok && data.url) {
        setUploaded({ url: data.url, kind: file.type.startsWith("video/") ? "video" : "image" });
      } else {
        setError(data.message ?? "Upload failed.");
      }
    } catch {
      setError("Upload failed — please try again.");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!uploaded || busy || uploading) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/about-media", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: uploaded.url, kind: uploaded.kind, alt, isActive: true }),
      });
      const data = (await res.json()) as { ok: boolean; media?: AboutMedia; message?: string };
      if (!data.ok || !data.media) {
        setError(data.message ?? "Could not save the media.");
        return;
      }
      const created = data.media;
      setMedia((list) => [created, ...list.map((m) => ({ ...m, isActive: false }))]);
      setUploaded(null);
      setAlt("");
      flash("About media updated — it is now live on the About page.");
      router.refresh();
    } catch {
      setError("Could not save the media — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const activate = async (m: AboutMedia) => {
    if (m.isActive || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/about-media/${m.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      const data = (await res.json()) as { ok: boolean };
      if (data.ok) {
        setMedia((list) => list.map((x) => (x.id === m.id ? { ...x, isActive: true } : { ...x, isActive: false })));
        flash("Media is now live on the About page.");
        router.refresh();
      }
    } catch {
      setError("Could not activate the media.");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/about-media/${confirmDelete.id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (data.ok) {
        setMedia((list) => list.filter((m) => m.id !== confirmDelete.id));
        setConfirmDelete(null);
        flash("Media deleted.");
        router.refresh();
      } else {
        setError(data.message ?? "Could not delete the media.");
      }
    } catch {
      setError("Could not delete the media.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {notice && (
        <p className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-6 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* upload / replace card */}
      <div className="rounded-2xl border border-line-soft bg-white/[0.02] p-6">
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-foam">
          Upgrade the About picture / video
        </h2>
        <p className="mt-2 text-sm text-mist">
          Upload an image (JPG, PNG, WEBP, AVIF, GIF — under 5 MB) or a video (MP4, WEBM — under 50 MB). The
          newest upload becomes the story media on the About page automatically.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void onFile(f);
          }}
        />

        {uploaded ? (
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="media-frame relative aspect-[16/11] w-full shrink-0 sm:w-64">
              {uploaded.kind === "video" ? (
                <video src={uploaded.url} className="h-full w-full rounded-[1.15rem] object-cover" muted loop playsInline autoPlay />
              ) : (
                <Image src={uploaded.url} alt="Selected upload preview" fill sizes="256px" className="object-cover" unoptimized />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <label className="block">
                <span className="text-xs uppercase tracking-[0.18em] text-mist">Alt text (accessibility)</span>
                <input
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                  maxLength={200}
                  placeholder="Describe the picture or video…"
                  className={`${inputCls} mt-2`}
                />
              </label>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={busy || uploading}
                  className="inline-flex items-center gap-2 rounded-lg bg-soft/25 px-5 py-2.5 text-sm font-semibold text-ice hover:bg-soft/35 disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Apply to About page
                </button>
                <button
                  type="button"
                  onClick={() => setUploaded(null)}
                  className="rounded-lg border border-line-soft px-5 py-2.5 text-sm text-mist hover:text-foam"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || busy}
            className="mt-5 flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line px-6 py-10 text-mist transition-colors hover:border-soft/50 hover:text-foam disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" strokeWidth={1.5} />}
            <span className="text-sm">{uploading ? "Uploading…" : "Choose a picture or video to upload"}</span>
          </button>
        )}
      </div>

      {/* existing media */}
      <h2 className="font-display mt-10 text-sm font-bold uppercase tracking-[0.14em] text-foam">
        Library — click “Set live” to switch the About page
      </h2>
      {media.length === 0 ? (
        <p className="mt-4 text-sm text-mist">
          No uploads yet — the About page shows its built-in default picture.
        </p>
      ) : (
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {media.map((m) => (
            <li key={m.id} className={`flex items-center gap-4 rounded-xl border p-4 ${m.isActive ? "border-soft/40 bg-soft/[0.06]" : "border-line-soft"}`}>
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-white/5">
                {m.kind === "video" ? (
                  <video src={m.url} className="h-full w-full object-cover" muted loop playsInline autoPlay />
                ) : (
                  <Image src={m.url} alt={m.alt || "About media"} fill sizes="96px" className="object-cover" unoptimized />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foam">{m.alt || (m.url.split("/").pop() ?? m.url)}</p>
                <p className="mt-0.5 text-xs text-mist/70">
                  {m.kind === "video" ? "Video" : "Picture"}
                  {m.isActive && <span className="text-emerald-300"> • live</span>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!m.isActive && (
                  <button
                    type="button"
                    onClick={() => void activate(m)}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-soft/20 px-3 py-2 text-xs font-semibold text-ice hover:bg-soft/30 disabled:opacity-50"
                  >
                    Set live
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmDelete(m)}
                  aria-label={`Delete ${m.alt || "media"}`}
                  className="rounded-lg border border-line-soft p-2 text-mist hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Confirm deletion">
          <div className="w-full max-w-md rounded-2xl border border-line bg-[#0a1f33] p-6 shadow-2xl">
            <h2 className="font-display text-lg font-bold text-foam">Delete this media?</h2>
            <p className="mt-3 text-sm text-mist">
              “<span className="font-semibold text-foam">{confirmDelete.alt || confirmDelete.url.split("/").pop()}</span>” will be
              permanently removed and its uploaded file cleaned up.
            </p>
            <p className="mt-2 text-xs text-mist/60">This cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-lg border border-line-soft px-5 py-2.5 text-sm text-mist hover:text-foam">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void doDelete()}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-red-500/20 px-5 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/30 disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

