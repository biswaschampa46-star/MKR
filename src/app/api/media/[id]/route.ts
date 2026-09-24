import { getMediaBinary } from "@/lib/data/media";

export const dynamic = "force-dynamic";

/**
 * Serves assets held by the database storage driver (used when Supabase
 * Storage credentials are absent). Content is immutable per id, so it is
 * cached aggressively at the edge.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response("Not found", { status: 404 });
  }
  const asset = await getMediaBinary(id);
  if (!asset?.bytes) {
    return new Response("Not found", { status: 404 });
  }
  const body = new Uint8Array(asset.bytes);
  return new Response(body, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
