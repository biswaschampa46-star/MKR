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

/* Hero/section videos: larger cap, stored in the same uploads folder. */
const VIDEO_ALLOWED = new Map([
  ["video/mp4", ".mp4"],
  ["video/webm", ".webm"],
]);
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

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
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const name = `${Date.now()}-${randomInt(1000, 9999)}${ext}`;
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ ok: true, url: `/uploads/${name}` });
  } catch (err) {
    console.error("admin upload failed", err);
    return NextResponse.json({ ok: false, message: "Upload failed." }, { status: 500 });
  }
}
