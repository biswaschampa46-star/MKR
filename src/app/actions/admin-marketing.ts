"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin";
import {
  BUCKETS,
  createSignedUploadIntent,
  deleteObject,
  extensionFor,
  objectExists,
  validateUpload,
  type BucketName,
} from "@/lib/storage";
import {
  createMarketingVideo,
  deleteMarketingVideo,
  getMarketingVideo,
  updateMarketingVideo,
} from "@/lib/data/marketing";
import type { ActionResult } from "@/types";

type FormState = ActionResult | undefined;

const OVERLAY_POSITIONS = ["left", "center", "bottom"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeCtaUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim() ?? "";
  if (!value) return null;
  if (/^(https?:\/\/|\/)/i.test(value)) return value;
  return null;
}

/* ------------------------- signed direct uploads ------------------------- */

export type MarketingUploadIntentInput = {
  videoId: string;
  kind: "video" | "poster";
  fileName: string;
  contentType: string;
  sizeBytes: number;
  replace?: boolean;
};

export type MarketingUploadIntentResult =
  | { ok: true; bucket: BucketName; path: string; signedUrl: string; token: string; publicUrl: string }
  | { ok: false; error: string };

/**
 * Step 1 of a marketing upload. Validates the file metadata and returns a
 * short-lived signed upload URL so the browser can push the bytes directly
 * into Supabase Storage — the file never passes through this server, so the
 * 1 MB Server Action body limit never applies.
 */
export async function createMarketingUploadIntentAction(input: MarketingUploadIntentInput): Promise<MarketingUploadIntentResult> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Admin session expired. Please sign in again." };
  if (!UUID_PATTERN.test(String(input.videoId ?? ""))) return { ok: false, error: "Invalid video reference." };
  if (input.kind !== "video" && input.kind !== "poster") return { ok: false, error: "Unknown asset kind." };

  const bucket = BUCKETS.marketingVideos;
  const validation = validateUpload(
    { type: String(input.contentType ?? ""), size: Number(input.sizeBytes ?? 0), name: String(input.fileName ?? "") },
    bucket,
  );
  if (!validation.ok) return { ok: false, error: validation.error };

  const extension = extensionFor(String(input.contentType ?? ""), String(input.fileName ?? ""));
  const base = input.kind === "video" ? "video-file" : "poster-file";
  // Replacement files get a fresh version suffix so the CDN URL changes and
  // the previous object can be cleaned up after the DB update.
  const version = input.replace ? `-${Date.now().toString(36)}` : "";
  const storagePath = `marketing-videos/${input.videoId}/${base}${version}.${extension}`;

  const intent = await createSignedUploadIntent(bucket, storagePath);
  if ("error" in intent) return { ok: false, error: intent.error };
  return {
    ok: true,
    bucket: intent.bucket,
    path: intent.path,
    signedUrl: intent.signedUrl,
    token: intent.token,
    publicUrl: intent.publicUrl,
  };
}

export type MarketingFileRef = {
  bucket: string;
  path: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
};

/* ------------------------------- finalize -------------------------------- */

export async function finalizeMarketingVideoUploadAction(payload: {
  videoId: string;
  title: string;
  description?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  overlayPosition?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  showControls?: boolean;
  isActive?: boolean;
  isPublished?: boolean;
  displayOrder?: number;
  video: MarketingFileRef;
  poster?: MarketingFileRef | null;
}): Promise<{ ok: true; id: string; message: string } | { ok: false; error: string }> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Admin session expired. Please sign in again." };
  if (!UUID_PATTERN.test(String(payload.videoId ?? ""))) return { ok: false, error: "Invalid video reference." };

  const title = String(payload.title ?? "").trim();
  if (title.length < 3) return { ok: false, error: "Give the video a title (3+ characters)." };
  if (!payload.video?.path || payload.video.sizeBytes <= 0) {
    return { ok: false, error: "The video upload did not complete — nothing was saved." };
  }

  // The row is only written once the bytes are confirmed in the bucket, so a
  // failed upload never leaves a broken video in the database.
  const videoStored = await objectExists(payload.video.bucket as BucketName, payload.video.path);
  if (!videoStored) return { ok: false, error: "The video never reached Supabase Storage. Please retry the upload." };

  let poster = payload.poster ?? null;
  if (poster) {
    const posterStored = await objectExists(poster.bucket as BucketName, poster.path);
    if (!posterStored) poster = null;
  }

  const id = await createMarketingVideo({
    title,
    description: payload.description?.trim() || null,
    videoBucket: payload.video.bucket,
    videoPath: payload.video.path,
    videoUrl: payload.video.publicUrl,
    videoMime: payload.video.mimeType,
    videoSizeBytes: payload.video.sizeBytes,
    posterBucket: poster?.bucket ?? null,
    posterPath: poster?.path ?? null,
    posterUrl: poster?.publicUrl ?? null,
    ctaText: payload.ctaText?.trim() || null,
    ctaUrl: safeCtaUrl(payload.ctaUrl),
    overlayPosition: OVERLAY_POSITIONS.includes(payload.overlayPosition ?? "") ? payload.overlayPosition! : "left",
    autoplay: payload.autoplay ?? true,
    muted: payload.muted ?? true,
    loop: payload.loop ?? true,
    showControls: payload.showControls ?? false,
    isActive: payload.isActive ?? true,
    isPublished: payload.isPublished ?? false,
    displayOrder: Number.isFinite(payload.displayOrder) ? Math.max(0, Math.floor(payload.displayOrder!)) : 0,
    uploadedBy: `admin:${admin.subject}`,
  });

  revalidatePath("/admin/marketing-videos");
  revalidatePath("/");
  return { ok: true, id, message: "Marketing video saved to Supabase Storage." };
}

/* ------------------------------- replace --------------------------------- */

export async function replaceMarketingVideoFileAction(payload: {
  videoId: string;
  kind: "video" | "poster";
  file: MarketingFileRef;
}): Promise<{ ok: true; message: string } | { ok: false, error: string }> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Admin session expired. Please sign in again." };
  if (!UUID_PATTERN.test(String(payload.videoId ?? ""))) return { ok: false, error: "Invalid video reference." };

  const video = await getMarketingVideo(payload.videoId);
  if (!video) return { ok: false, error: "This video no longer exists." };

  const stored = await objectExists(payload.file.bucket as BucketName, payload.file.path);
  if (!stored) return { ok: false, error: "The replacement file never reached Supabase Storage. Please retry." };

  if (payload.kind === "video") {
    const previous = { bucket: video.videoBucket, path: video.videoPath };
    await updateMarketingVideo(video.id, {
      videoBucket: payload.file.bucket,
      videoPath: payload.file.path,
      videoUrl: payload.file.publicUrl,
      videoMime: payload.file.mimeType,
      videoSizeBytes: payload.file.sizeBytes,
    });
    if (previous.path && previous.path !== payload.file.path) {
      await deleteObject(previous.bucket as BucketName, previous.path);
    }
  } else {
    const previous = video.posterPath ? { bucket: video.posterBucket, path: video.posterPath } : null;
    await updateMarketingVideo(video.id, {
      posterBucket: payload.file.bucket,
      posterPath: payload.file.path,
      posterUrl: payload.file.publicUrl,
    });
    if (previous?.bucket && previous.path && previous.path !== payload.file.path) {
      await deleteObject(previous.bucket as BucketName, previous.path);
    }
  }

  revalidatePath("/admin/marketing-videos");
  revalidatePath("/");
  return { ok: true, message: payload.kind === "video" ? "Video file replaced." : "Poster image replaced." };
}

/* ---------------------------- metadata / flags --------------------------- */

export async function updateMarketingVideoAction(_prev: FormState, formData: FormData): Promise<ActionResult> {
  const admin = await getAdminSession();
  if (!admin) return { ok: false, error: "Admin session expired." };

  const id = String(formData.get("id") ?? "");
  if (!UUID_PATTERN.test(id)) return { ok: false, error: "Invalid video reference." };

  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 3) return { ok: false, error: "Give the video a title (3+ characters)." };

  const overlayPosition = String(formData.get("overlayPosition") ?? "left");

  await updateMarketingVideo(id, {
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    ctaText: String(formData.get("ctaText") ?? "").trim() || null,
    ctaUrl: safeCtaUrl(String(formData.get("ctaUrl") ?? "")),
    overlayPosition: OVERLAY_POSITIONS.includes(overlayPosition) ? overlayPosition : "left",
    autoplay: formData.get("autoplay") === "on",
    muted: formData.get("muted") === "on",
    loop: formData.get("loop") === "on",
    showControls: formData.get("showControls") === "on",
    isActive: formData.get("isActive") === "on",
    isPublished: String(formData.get("publishState") ?? "draft") === "published",
    displayOrder: Math.max(0, Math.floor(Number(formData.get("displayOrder") ?? 0)) || 0),
  });

  revalidatePath("/admin/marketing-videos");
  revalidatePath("/");
  return { ok: true, message: "Marketing video updated." };
}

/** Quick publish/unpublish + show/hide toggles from the video cards. */
export async function setMarketingVideoFlagAction(formData: FormData): Promise<void> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login"); // Phase 26: never fail silently
  const id = String(formData.get("id") ?? "");
  const flag = String(formData.get("flag") ?? "");
  const value = String(formData.get("value") ?? "") === "true";
  if (!UUID_PATTERN.test(id)) return;
  if (flag === "isPublished") {
    await updateMarketingVideo(id, { isPublished: value });
  } else if (flag === "isActive") {
    await updateMarketingVideo(id, { isActive: value });
  }
  revalidatePath("/admin/marketing-videos");
  revalidatePath("/");
}

export async function deleteMarketingVideoAction(formData: FormData): Promise<void> {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login"); // Phase 26: never fail silently
  const id = String(formData.get("id") ?? "");
  if (!UUID_PATTERN.test(id)) return;
  await deleteMarketingVideo(id);
  revalidatePath("/admin/marketing-videos");
  revalidatePath("/");
}
