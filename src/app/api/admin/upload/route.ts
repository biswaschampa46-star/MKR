import { NextResponse } from "next/server";
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
 * Upload via a service-role client when SUPABASE_SERVICE_ROLE_KEY is set
 * (production/Vercel). Otherwise — local dev — sign in to Supabase Auth
 * with the existing ADMIN_EMAIL/ADMIN_PASSWORD credentials and upload as
 * that authenticated user; the `uploads_admin_insert` RLS policy admits
 * allow-listed admin emails. No local-disk fallback: Supabase Storage is
 * the only file store.
 */
async function uploadToSupabaseStorage(
  name: string,
  bytes: Buffer,
  contentType: string,
): Promise<{ url?: string; reason?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPass = process.env.ADMIN_PASSWORD ?? "";
  if (!url || !anonKey) return { reason: "unconfigured" };
  if (!serviceKey && !(adminEmail && adminPass)) return { reason: "unconfigured" };
  try {
    const { createClient } = await import("@supabase/supabase-js");
    if (serviceKey) {
      const admin = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await admin.storage.from(STORAGE_BUCKET).upload(name, bytes, {
        contentType,
        upsert: true,
      });
      if (error) {
        console.error("supabase storage upload failed", error.message);
        return { reason: error.message };
      }
      return { url: `${url.replace(/\/$/, "")}/storage/v1/object/public/${STORAGE_BUCKET}/${name}` };
    }
    // Local dev path: authenticated-admin upload through RLS.
    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInError } = await client.auth.signInWithPassword({
      email: adminEmail!,
      password: adminPass,
    });
    if (signInError) {
      console.error("supabase storage admin sign-in failed", signInError.message);
      return { reason: "admin sign-in failed" };
    }
    // upsert: false — the RLS policy grants INSERT only, and filenames are
    // unique (timestamp + random), so overwrite semantics are never needed.
    const { error } = await client.storage.from(STORAGE_BUCKET).upload(name, bytes, {
      contentType,
      upsert: false,
    });
    await client.auth.signOut();
    if (error) {
      console.error("supabase storage upload failed", error.message);
      return { reason: error.message };
    }
    return { url: `${url.replace(/\/$/, "")}/storage/v1/object/public/${STORAGE_BUCKET}/${name}` };
  } catch (err) {
    console.error("supabase storage client error", err);
    return { reason: "client error" };
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

    // Supabase Storage is the ONLY backend (no local-disk fallback).
    const remote = await uploadToSupabaseStorage(name, bytes, file.type);
    if (remote.url) {
      return NextResponse.json({ ok: true, url: remote.url });
    }
    const hint =
      remote.reason === "unconfigured"
        ? "Set SUPABASE_SERVICE_ROLE_KEY (production) or NEXT_PUBLIC_SUPABASE_URL + ADMIN_EMAIL/ADMIN_PASSWORD (local) in the server environment."
        : "Check that the public 'uploads' bucket exists and the admin email is allow-listed in Supabase → Storage policies.";
    console.error("admin upload failed: storage unavailable:", remote.reason);
    return NextResponse.json(
      { ok: false, message: `Image storage is not ready. ${hint}` },
      { status: 503 },
    );
  } catch (err) {
    console.error("admin upload failed", err);
    return NextResponse.json({ ok: false, message: "Upload failed." }, { status: 500 });
  }
}

