import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { mediaAssets } from "@/db/schema";
import { getMediaBinary } from "@/lib/data/media";
import { signedReadUrl, BUCKETS } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Serves an avatar for an AUTHENTICATED viewer (customer or admin) by
 * redirecting to a short-lived (1 h) Supabase signed URL. Profile photos are
 * private data (migration 0008) and are never anonymously readable — an
 * unauthenticated request gets an anonymous 404, so nothing about the
 * asset's existence leaks.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  if (!(await hasAuthenticatedViewer())) {
    return new Response("Not found", { status: 404 });
  }

  const roleRows = await db
    .select({ role: mediaAssets.role, storageProvider: mediaAssets.storageProvider, bucket: mediaAssets.bucket, storagePath: mediaAssets.storagePath })
    .from(mediaAssets)
    .where(eq(mediaAssets.id, id))
    .limit(1);
  const asset = roleRows[0];
  if (!asset || asset.role !== "avatar") {
    return new Response("Not found", { status: 404 });
  }

  if (asset.storageProvider === "supabase") {
    const url = await signedReadUrl(asset.bucket as (typeof BUCKETS)[keyof typeof BUCKETS], asset.storagePath, 3600);
    if (!url) return new Response("Not found", { status: 404 });
    return Response.redirect(url, 307);
  }

  // Database driver: avatar bytes live in media_assets.bytes.
  const binary = await getMediaBinary(id);
  if (!binary?.bytes) return new Response("Not found", { status: 404 });
  const body = new Uint8Array(binary.bytes);
  return new Response(body, {
    headers: {
      "Content-Type": binary.mimeType,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "private, max-age=600",
    },
  });
}

async function hasAuthenticatedViewer(): Promise<boolean> {
  try {
    const { getCurrentCustomer } = await import("@/lib/auth/customer");
    const { getAdminSession } = await import("@/lib/auth/admin");
    return Boolean((await getCurrentCustomer()) || (await getAdminSession()));
  } catch {
    return false;
  }
}
