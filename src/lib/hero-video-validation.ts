/**
 * Server-side validation + sanitization for hero-video payloads.
 * Same philosophy as product-validation: never trust the browser.
 */

export type HeroVideoPayload = Partial<Record<string, unknown>>;

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max) : "";

export type HeroVideoResult =
  | { ok: true; data: ReturnType<typeof buildValues> }
  | { ok: false; message: string };

export function validateHeroVideo(body: HeroVideoPayload): HeroVideoResult {
  const title = str(body.title, 160);
  if (title.length < 2) return { ok: false, message: "Title is required (at least 2 characters)." };

  const videoUrl = str(body.videoUrl, 500);
  if (!videoUrl) return { ok: false, message: "A video file or video URL is required." };
  if (!/^(https?:\/\/|\/uploads\/)/.test(videoUrl)) {
    return { ok: false, message: "Video must be an https:// URL or an uploaded file." };
  }

  const thumbnailUrl = str(body.thumbnailUrl, 500);
  if (thumbnailUrl && !/^(https?:\/\/|\/uploads\/|\/images\/)/.test(thumbnailUrl)) {
    return { ok: false, message: "Thumbnail must be an https:// URL or an uploaded file." };
  }

  const orderRaw = Math.floor(Number(body.displayOrder));
  const displayOrder = Number.isFinite(orderRaw) ? Math.max(0, Math.min(999, orderRaw)) : 0;

  return { ok: true, data: buildValues(body, { title, videoUrl, thumbnailUrl, displayOrder }) };
}

function buildValues(
  body: HeroVideoPayload,
  core: { title: string; videoUrl: string; thumbnailUrl: string; displayOrder: number },
) {
  return {
    videoUrl: core.videoUrl,
    thumbnailUrl: core.thumbnailUrl,
    label: str(body.label, 80) || "NEW ARRIVALS",
    title: core.title,
    subtitle: str(body.subtitle, 300),
    bottomText: str(body.bottomText, 120),
    durationLabel: str(body.durationLabel, 20),
    displayOrder: core.displayOrder,
    isActive: body.isActive === undefined ? true : body.isActive === true || body.isActive === "true",
    updatedAt: new Date(),
  };
}

/** Local storage paths managed by /api/admin/upload (safe to unlink). */
export function localUploadPath(url: string): string | null {
  return url.startsWith("/uploads/") ? url : null;
}
