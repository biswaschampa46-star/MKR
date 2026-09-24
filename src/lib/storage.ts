import { createServiceClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const BUCKETS = {
  uploads: "uploads",
  profilePhotos: "profile-photos",
  marketingVideos: "mkr-marketing-videos",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const LIMITS = {
  image: 8 * 1024 * 1024,
  video: 60 * 1024 * 1024,
  avatar: 4 * 1024 * 1024,
  marketingVideo: 200 * 1024 * 1024,
};

export type UploadValidation = { ok: true; kind: "image" | "video"; bucket: BucketName } | { ok: false; error: string };

/**
 * Phase 24 — content (magic byte) verification. The browser-supplied MIME type
 * is trusted only as a first filter; the leading bytes of the file must match
 * a real signature. Video containers get a lighter box-marker check.
 */
export function verifyMagicBytes(buffer: Buffer, mimeType: string): { ok: boolean; error?: string } {
  const sig = (offsets: number[], bytes: number[]) =>
    bytes.every((b, i) => buffer[offsets[i]] === b);

  switch (mimeType) {
    case "image/jpeg":
      return sig([0, 1], [0xff, 0xd8]) ? { ok: true } : { ok: false, error: "The file is not a valid JPG image." };
    case "image/png":
      return sig([0, 1, 2, 3], [0x89, 0x50, 0x4e, 0x47]) ? { ok: true } : { ok: false, error: "The file is not a valid PNG image." };
    case "image/gif":
      return sig([0, 1, 2], [0x47, 0x49, 0x46]) ? { ok: true } : { ok: false, error: "The file is not a valid GIF image." };
    case "image/webp":
      return sig([0, 1, 2, 3], [0x52, 0x49, 0x46, 0x46]) && sig([8, 9, 10, 11], [0x57, 0x45, 0x42, 0x50])
        ? { ok: true }
        : { ok: false, error: "The file is not a valid WEBP image." };
    case "image/avif":
      // ISO-BMFF box: bytes 4-7 are always 'ftyp', bytes 8-11 the brand ('avif'/'avis').
      return sig([4, 5, 6, 7], [0x66, 0x74, 0x79, 0x70])
        ? { ok: true }
        : { ok: false, error: "The file is not a valid AVIF image." };
    case "video/mp4":
    case "video/quicktime":
      return sig([4, 5, 6, 7], [0x66, 0x74, 0x79, 0x70])
        ? { ok: true }
        : { ok: false, error: "The file is not a valid MP4/MOV video." };
    case "video/webm":
      return sig([0, 1, 2, 3], [0x1a, 0x45, 0xdf, 0xa3]) ? { ok: true } : { ok: false, error: "The file is not a valid WebM video." };
    default:
      // Unknown-but-allowed type: accept only if it isn't a dangerous executable.
      const mz = sig([0, 1], [0x4d, 0x5a]); // Windows PE
      const elf = sig([0, 1, 2, 3], [0x7f, 0x45, 0x4c, 0x46]); // Linux ELF
      const shebang = sig([0, 1], [0x23, 0x21]); // #! script
      if (mz || elf || shebang) return { ok: false, error: "Executable files are not allowed." };
      return { ok: true };
  }
}

export function validateUpload(file: { type: string; size: number; name: string }, bucket: BucketName): UploadValidation {
  if (!file.size || file.size <= 0) return { ok: false, error: "The selected file is empty." };

  if (bucket === BUCKETS.profilePhotos) {
    if (!IMAGE_TYPES.includes(file.type)) {
      return { ok: false, error: "Profile photo must be a JPG, PNG, WEBP, AVIF or GIF image." };
    }
    if (file.size > LIMITS.avatar) return { ok: false, error: "Profile photo must be 4 MB or smaller." };
    return { ok: true, kind: "image", bucket };
  }

  if (bucket === BUCKETS.marketingVideos) {
    if (IMAGE_TYPES.includes(file.type)) {
      if (file.size > LIMITS.image) return { ok: false, error: "Poster images must be 8 MB or smaller." };
      return { ok: true, kind: "image", bucket };
    }
    if (VIDEO_TYPES.includes(file.type)) {
      if (file.size > LIMITS.marketingVideo) return { ok: false, error: "Marketing videos must be 200 MB or smaller." };
      return { ok: true, kind: "video", bucket };
    }
    return { ok: false, error: "The video must be MP4/WebM/MOV and the poster must be a JPG/PNG/WEBP image." };
  }

  if (IMAGE_TYPES.includes(file.type)) {
    if (file.size > LIMITS.image) return { ok: false, error: "Images must be 8 MB or smaller." };
    return { ok: true, kind: "image", bucket };
  }
  if (VIDEO_TYPES.includes(file.type)) {
    if (file.size > LIMITS.video) return { ok: false, error: "Videos must be 60 MB or smaller." };
    return { ok: true, kind: "video", bucket };
  }
  return { ok: false, error: `Unsupported file type: ${file.type || "unknown"}.` };
}

export function extensionFor(mimeType: string, fileName: string): string {
  const fromName = fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase() : "";
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };
  return map[mimeType] ?? "bin";
}

/** Deterministic, collision-free storage path. Never a local filesystem path. */
export function buildStoragePath(options: {
  bucket: BucketName;
  scope: string;
  slugOrId: string;
  extension: string;
  id: string;
}): string {
  const safeScope = options.scope.replace(/[^a-z0-9/_-]/gi, "").replace(/\/+/g, "/");
  const safeName = (options.slugOrId || "asset")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${safeScope}/${safeName}-${options.id}.${options.extension}`;
}

export type StoredObject = {
  id: string;
  provider: "supabase" | "database";
  bucket: BucketName;
  storagePath: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  kind: "image" | "video";
};

export const storageMode = (): "supabase" | "database" =>
  env.supabaseUrl && env.supabaseServiceRoleKey ? "supabase" : "database";

async function ensureBucket(client: NonNullable<ReturnType<typeof createServiceClient>>, bucket: BucketName) {
  const { data, error } = await client.storage.getBucket(bucket);
  if (error || !data) {
    await client.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit:
        bucket === BUCKETS.profilePhotos
          ? LIMITS.avatar
          : bucket === BUCKETS.marketingVideos
            ? LIMITS.marketingVideo
            : LIMITS.video,
    });
  }
}

/** Buckets whose objects are intentionally anonymous-readable (storefront media). */
const PUBLIC_BUCKETS: ReadonlySet<string> = new Set([BUCKETS.uploads, BUCKETS.marketingVideos]);

/**
 * Public (or signed) URL for a stored object.
 *
 * • Public buckets → permanent public URL (storefront product/marketing media).
 * • Private buckets (profile photos) → null; the caller stores the opaque
 *   /api/media/{id} path instead, and that route hands out short-lived signed
 *   URLs per request, so avatars are never anonymously readable.
 */
export function publicUrlFor(bucket: BucketName, storagePath: string): string | null {
  const client = createServiceClient();
  if (!client) return null;
  if (PUBLIC_BUCKETS.has(bucket)) {
    return client.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
  }
  return null;
}

/**
 * Short-lived signed read URL for an object in a private bucket. Requires the
 * service-role client, so it must only run on the server for authorized views.
 */
export async function signedReadUrl(
  bucket: BucketName,
  storagePath: string,
  expiresIn = 3600,
): Promise<string | null> {
  const client = createServiceClient();
  if (!client) return null;
  const { data, error } = await client.storage.from(bucket).createSignedUrl(storagePath, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Uploads an asset. Supabase Storage is the primary driver; when the storage
 * credentials are missing the bytes are kept in the media_assets row and served
 * through an authenticated route, so uploads never fall back to a local folder.
 */
export async function uploadObject(input: {
  id: string;
  bucket: BucketName;
  storagePath: string;
  bytes: Buffer;
  mimeType: string;
  kind: "image" | "video";
}): Promise<StoredObject | { error: string }> {
  const client = createServiceClient();
  if (client) {
    await ensureBucket(client, input.bucket);
    const { error } = await client.storage
      .from(input.bucket)
      .upload(input.storagePath, input.bytes, { contentType: input.mimeType, upsert: true });
    if (error) return { error: `Supabase Storage upload failed: ${error.message}` };
    const { data } = client.storage.from(input.bucket).getPublicUrl(input.storagePath);
    return {
      id: input.id,
      provider: "supabase",
      bucket: input.bucket,
      storagePath: input.storagePath,
      publicUrl: data.publicUrl,
      mimeType: input.mimeType,
      sizeBytes: input.bytes.byteLength,
      kind: input.kind,
    };
  }

  return {
    id: input.id,
    provider: "database",
    bucket: input.bucket,
    storagePath: input.storagePath,
    publicUrl: `/api/media/${input.id}`,
    mimeType: input.mimeType,
    sizeBytes: input.bytes.byteLength,
    kind: input.kind,
  };
}

export async function deleteObject(bucket: BucketName, storagePath: string) {
  const client = createServiceClient();
  if (!client) return;
  await client.storage.from(bucket).remove([storagePath]);
}

export type SignedUploadIntent = {
  bucket: BucketName;
  path: string;
  signedUrl: string;
  token: string;
  publicUrl: string;
};

/**
 * Creates a short-lived signed upload slot so the browser can push a file
 * straight into Supabase Storage. Large media never proxies through the
 * Next.js server (no Server Action body limit, no Vercel payload limit).
 */
export async function createSignedUploadIntent(bucket: BucketName, storagePath: string): Promise<SignedUploadIntent | { error: string }> {
  const client = createServiceClient();
  if (!client) return { error: "Supabase Storage is not configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)." };
  try {
    await ensureBucket(client, bucket);
  } catch (error) {
    return { error: `Storage bucket check failed: ${error instanceof Error ? error.message : "unknown error"}` };
  }
  const { data, error } = await client.storage.from(bucket).createSignedUploadUrl(storagePath);
  if (error || !data) return { error: `Could not open an upload slot: ${error?.message ?? "unknown error"}` };
  const { data: urlData } = client.storage.from(bucket).getPublicUrl(storagePath);
  return {
    bucket,
    path: data.path,
    signedUrl: data.signedUrl,
    token: data.token,
    publicUrl: urlData.publicUrl,
  };
}

/** Verifies a signed-upload actually landed in the bucket before DB registration. */
export async function objectExists(bucket: BucketName, storagePath: string): Promise<boolean> {
  const client = createServiceClient();
  if (!client) return false;
  const folder = storagePath.split("/").slice(0, -1).join("/");
  const name = storagePath.split("/").pop() ?? "";
  const { data } = await client.storage.from(bucket).list(folder, { search: name, limit: 5 });
  return Boolean(data?.some((object) => object.name === name));
}

export function mediaFailureMessage(): string {
  return storageMode() === "database"
    ? "Supabase Storage is not configured (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY). Uploads are stored in PostgreSQL media_assets and served from /api/media."
    : "";
}
