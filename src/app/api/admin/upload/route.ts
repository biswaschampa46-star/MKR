import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomInt } from "crypto";
import { isAdmin, unauthorized } from "@/lib/auth";

const ALLOWED = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/avif", ".avif"],
  ["image/gif", ".gif"],
]);

/* Hero/section videos: larger cap, stored in the same bucket/folder. */
const VIDEO_ALLOWED = new Map([
  ["video/mp4", ".mp4"],
  ["video/webm", ".webm"],
]);
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

const STORAGE_BUCKET = "uploads";

/**
 * Server-side Supabase Storage client (service role). Used on hosting
 * platforms (e.g. Vercel) where the filesystem is read-only — files are
 * uploaded to a PUBLIC "uploads" bucket and served from its public URL.
 * Configure SUPABASE_SERVICE_ROLE_KEY to enable; otherwise files fall
 * back to ./public/uploads (localhost / self-hosted with writable disk).
 */
async function uploadToSupabaseStorage(
  name: string,
  bytes: Buffer,
  contentType: string,
): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await admin.storage.from(STORAGE_BUCKET).upload(name, bytes, {
      contentType,
      upsert: true,
    });
    if (error) {
      console.error("supabase storage upload failed", error.message);
      return null;
    }
    return `${url.replace(/\/$/, "")}/storage/v1/object/public/${STORAGE_BUCKET}/${name}`;
  } catch (err) {
    console.error("supabase storage client error", err);
    return null;
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return unauthorized();
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: "No file received." }, { status: 400 });
    }
    const ext = ALLOWED.get(file.type) ?? VIDEO_ALLOWED.get(file.type);
    if (!ext) {
      return NextResponse.json({ ok: false, message: "Only JPG, PNG, WEBP, AVIF, GIF, MP4 or WEBM files are allowed." }, { status: 400 });
    }
    const isVideo = VIDEO_ALLOWED.has(file.type);
    if (isVideo && file.size > VIDEO_MAX_BYTES) {
      return NextResponse.json({ ok: false, message: "Video must be under 50 MB." }, { status: 400 });
    }
    if (!isVideo && file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ ok: false, message: "Image must be under 5 MB." }, { status: 400 });
    }
    const name = `${Date.now()}-${randomInt(1000, 9999)}${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    // Preferred: Supabase Storage (works on Vercel / any read-only host).
    const remoteUrl = await uploadToSupabaseStorage(name, bytes, file.type);
    if (remoteUrl) {
      return NextResponse.json({ ok: true, url: remoteUrl });
    }

    // Fallback: writable local disk (localhost / self-hosted VPS).
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), bytes);
    return NextResponse.json({ ok: true, url: `/uploads/${name}` });
  } catch (err) {
    console.error("admin upload failed", err);
    return NextResponse.json({ ok: false, message: "Upload failed." }, { status: 500 });
  }
}

