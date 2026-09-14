"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Film, Loader2, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import type { HeroVideo } from "@/db/schema";

type FormState = {
  videoUrl: string;
  thumbnailUrl: string;
  label: string;
  title: string;
  subtitle: string;
  bottomText: string;
  durationLabel: string;
  displayOrder: number;
  isActive: boolean;
};

const EMPTY: FormState = {
  videoUrl: "",
  thumbnailUrl: "",
  label: "NEW ARRIVALS",
  title: "",
  subtitle: "",
  bottomText: "",
  durationLabel: "",
  displayOrder: 0,
  isActive: true,
};

const inputCls =
  "w-full rounded-lg border border-line bg-transparent px-4 py-2.5 text-sm text-foam placeholder:text-mist/40 focus:border-soft/60 focus:outline-none";

export default function HeroVideosManager({ initialVideos }: { initialVideos: HeroVideo[] }) {
  const router = useRouter();
  const [videos, setVideos] = useState<HeroVideo[]>(initialVideos);
  const [editing, setEditing] = useState<HeroVideo | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"video" | "thumb" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<HeroVideo | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3500);
  };

  const openAdd = () => {
    setEditing(null);
    setError("");
    const nextOrder = videos.reduce((max, v) => Math.max(max, v.displayOrder), -1) + 1;
    setForm({ ...EMPTY, displayOrder: nextOrder });
  };

  const openEdit = (v: HeroVideo) => {
    setEditing(v);
    setError("");
    setForm({
      videoUrl: v.videoUrl,
      thumbnailUrl: v.thumbnailUrl,
      label: v.label,
      title: v.title,
      subtitle: v.subtitle,
      bottomText: v.bottomText,
      durationLabel: v.durationLabel,
      displayOrder: v.displayOrder,
      isActive: v.isActive,
    });
  };

  /* shared upload helper — prevents duplicate submits while uploading */
  const upload = async (file: File, kind: "video" | "thumb") => {
    if (uploading) return;
    setUploading(kind);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { ok: boolean; url?: string; message?: string };
      if (data.ok && data.url) {
        if (kind === "video") set("videoUrl", data.url);
        else set("thumbnailUrl", data.url);
      } else {
        setError(data.message ?? "Upload failed.");
      }
    } catch {
      setError("Upload failed — please try again.");
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    if (!form || busy || uploading) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        editing ? `/api/admin/hero-videos/${editing.id}` : "/api/admin/hero-videos",
        {
          method: editing ? "PUT" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = (await res.json()) as { ok: boolean; video?: HeroVideo; message?: string };
      if (!data.ok) {
        setError(data.message ?? "Save failed.");
        return;
      }
      flash(editing ? "Video updated." : "Video added.");
      setForm(null);
      setEditing(null);
      const list = await fetch("/api/admin/hero-videos").then((r) => r.json()) as { ok: boolean; videos: HeroVideo[] };
      if (list.ok) setVideos(list.videos);
      router.refresh();
    } catch {
      setError("Save failed — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (v: HeroVideo) => {
    setVideos((list) => list.map((x) => (x.id === v.id ? { ...x, isActive: !x.isActive } : x)));
    try {
      const res = await fetch(`/api/admin/hero-videos/${v.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...v, isActive: !v.isActive }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!data.ok) {
        setVideos((list) => list.map((x) => (x.id === v.id ? { ...x, isActive: v.isActive } : x)));
        setError(data.message ?? "Could not update status.");
      } else {
        router.refresh();
      }
    } catch {
      setVideos((list) => list.map((x) => (x.id === v.id ? { ...x, isActive: v.isActive } : x)));
      setError("Could not update status.");
    }
  };

  const doDelete = async () => {
    if (!confirmDelete || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/hero-videos/${confirmDelete.id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (data.ok) {
        setVideos((list) => list.filter((x) => x.id !== confirmDelete.id));
        flash("Video deleted.");
        router.refresh();
      } else {
        setError(data.message ?? "Delete failed.");
      }
    } catch {
      setError("Delete failed — please try again.");
    } finally {
      setBusy(false);
      setConfirmDelete(null);
    }
  };

  return (
    <div>
      {/* toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <p className="text-sm text-mist">
          {videos.length} video{videos.length === 1 ? "" : "s"} · ordered by display order
        </p>
        <button
          type="button"
          onClick={openAdd}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-foam hover:bg-white/15"
        >
          <Plus className="h-4 w-4" /> Add New Arrival
        </button>
      </div>

      {notice && (
        <p role="status" className="adm-badge adm-badge--success mb-4 inline-block">
          {notice}
        </p>
      )}
      {error && !form && (
        <p role="alert" className="mb-4 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* empty state */}
      {videos.length === 0 && !form && (
        <div className="rounded-xl border border-dashed border-line-soft px-6 py-16 text-center">
          <Film className="mx-auto h-10 w-10 text-mist/40" strokeWidth={1.25} />
          <p className="mt-4 text-sm text-mist">No hero videos yet.</p>
          <p className="mt-1 text-xs text-mist/60">
            Add one to replace the default homepage video card.
          </p>
        </div>
      )}

      {/* list */}
      <div className="grid gap-4 md:grid-cols-2">
        {videos.map((v) => (
          <div key={v.id} className="rounded-xl border border-line-soft bg-white/[0.02] p-4">
            <div className="flex gap-4">
              {/* preview */}
              <div className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-lg border border-line-soft bg-[#071a2b]">
                {v.thumbnailUrl ? (
                  <Image src={v.thumbnailUrl} alt={`${v.label} video thumbnail`} fill sizes="96px" className="object-cover" unoptimized />
                ) : (
                  <video src={v.videoUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                )}
              </div>

              {/* meta */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="adm-badge adm-badge--info">{v.label}</span>
                  <span className="adm-badge adm-badge--neutral">#{v.displayOrder + 1}</span>
                  {v.isActive ? (
                    <span className="adm-badge adm-badge--success">Active</span>
                  ) : (
                    <span className="adm-badge adm-badge--warn">Inactive</span>
                  )}
                </div>
                <h3 className="mt-2 truncate text-sm font-semibold text-foam">{v.title}</h3>
                {v.subtitle && <p className="mt-1 line-clamp-2 text-xs text-mist/70">{v.subtitle}</p>}
                {v.bottomText && <p className="mt-1 text-[0.7rem] uppercase tracking-wider text-mist/50">{v.bottomText}</p>}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(v)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line-soft px-3 py-1.5 text-xs text-mist hover:text-foam"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(v)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-accent hover:bg-accent/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={v.isActive}
                    aria-label={`${v.isActive ? "Deactivate" : "Activate"} ${v.title}`}
                    onClick={() => void toggleActive(v)}
                    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${v.isActive ? "bg-emerald-500/70" : "bg-white/15"}`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${v.isActive ? "left-[1.15rem]" : "left-0.5"}`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* add/edit form */}
      {form && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={editing ? "Edit hero video" : "Add hero video"}>
          <div className="mx-auto my-8 w-full max-w-2xl rounded-2xl border border-line bg-[#0a1f33] p-6 shadow-2xl md:p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foam">
                {editing ? "Edit video" : "Add new arrival video"}
              </h2>
              <button type="button" onClick={() => setForm(null)} aria-label="Close form" className="rounded-lg p-2 text-mist hover:bg-white/10 hover:text-foam">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* video */}
            <label className="block text-xs font-semibold uppercase tracking-wider text-mist">
              Video (MP4/WebM, max 50 MB) *
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                value={form.videoUrl}
                onChange={(e) => set("videoUrl", e.target.value)}
                placeholder="Upload a file or paste a video URL"
                className={`${inputCls} flex-1 min-w-0`}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f, "video");
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={uploading !== null}
                onClick={() => videoInputRef.current?.click()}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-line-soft px-4 py-2.5 text-xs text-mist hover:text-foam disabled:opacity-50"
              >
                {uploading === "video" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading === "video" ? "Uploading…" : "Upload"}
              </button>
            </div>
            {form.videoUrl && (
              <video src={form.videoUrl} controls muted playsInline preload="metadata" className="mt-3 max-h-48 w-full rounded-lg border border-line-soft bg-black" />
            )}

            {/* thumbnail */}
            <label className="mt-6 block text-xs font-semibold uppercase tracking-wider text-mist">
              Poster / thumbnail (optional)
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                value={form.thumbnailUrl}
                onChange={(e) => set("thumbnailUrl", e.target.value)}
                placeholder="Shown until the video loads / if autoplay is blocked"
                className={`${inputCls} flex-1 min-w-0`}
              />
              <input
                ref={thumbInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f, "thumb");
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={uploading !== null}
                onClick={() => thumbInputRef.current?.click()}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-line-soft px-4 py-2.5 text-xs text-mist hover:text-foam disabled:opacity-50"
              >
                {uploading === "thumb" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading === "thumb" ? "Uploading…" : "Upload"}
              </button>
            </div>

            {/* text fields */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-mist">Small label</label>
                <input value={form.label} onChange={(e) => set("label", e.target.value)} maxLength={80} className={`${inputCls} mt-2`} placeholder="NEW ARRIVALS" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-mist">Display order</label>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={form.displayOrder}
                  onChange={(e) => set("displayOrder", Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                  className={`${inputCls} mt-2`}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-mist">Main title *</label>
                <input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={160} className={`${inputCls} mt-2`} placeholder="Everyday Essentials" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-mist">Subtitle / description</label>
                <input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} maxLength={300} className={`${inputCls} mt-2`} placeholder="Considered essentials for the quiet hours of the day" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-mist">Bottom text</label>
                <input value={form.bottomText} onChange={(e) => set("bottomText", e.target.value)} maxLength={120} className={`${inputCls} mt-2`} placeholder="No. 01 — Everyday Essentials" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-mist">Duration label</label>
                <input value={form.durationLabel} onChange={(e) => set("durationLabel", e.target.value)} maxLength={20} className={`${inputCls} mt-2`} placeholder="00:15" />
              </div>
            </div>

            {/* active toggle */}
            <label className="mt-6 flex cursor-pointer items-center gap-3 text-sm text-mist">
              <button
                type="button"
                role="switch"
                aria-checked={form.isActive}
                onClick={() => set("isActive", !form.isActive)}
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${form.isActive ? "bg-emerald-500/70" : "bg-white/15"}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${form.isActive ? "left-[1.15rem]" : "left-0.5"}`} />
              </button>
              Active — visible on the homepage
            </label>

            {error && (
              <p role="alert" className="mt-4 text-sm text-red-300">
                {error}
              </p>
            )}

            {/* actions */}
            <div className="mt-8 flex justify-end gap-3">
              <button type="button" onClick={() => setForm(null)} className="rounded-lg border border-line-soft px-5 py-2.5 text-sm text-mist hover:text-foam">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy || uploading !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-soft/25 px-5 py-2.5 text-sm font-semibold text-ice hover:bg-soft/35 disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Add video"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Confirm deletion">
          <div className="w-full max-w-md rounded-2xl border border-line bg-[#0a1f33] p-6 shadow-2xl">
            <h2 className="font-display text-lg font-bold text-foam">Delete this video?</h2>
            <p className="mt-3 text-sm text-mist">
              “<span className="font-semibold text-foam">{confirmDelete.title}</span>” ({confirmDelete.label}) will be
              permanently removed from the homepage. Its uploaded video and thumbnail files will also be cleaned up.
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
