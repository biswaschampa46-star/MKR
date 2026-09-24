import { notFound } from "next/navigation";
import { Alert, Badge, Button, SectionHeading } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { MediaImage } from "@/components/media-image";
import { ProductForm } from "@/components/admin/product-form";
import { ProductMediaForms } from "@/components/admin/product-media-forms";
import { removeProductImageAction, updateProductImageAction, replaceProductImageAction } from "@/app/actions/admin-products";
import { getProductById, listCategories } from "@/lib/data/catalog";
import { listMediaForPicker } from "@/lib/data/catalog";
import { formatTaka } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

export default async function AdminProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories, media] = await Promise.all([
    getProductById(id).catch(() => null),
    listCategories(true),
    listMediaForPicker().catch(() => []),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Product"
        title={product.name}
        description={`SKU ${product.sku} · ${formatTaka(product.price)} · ${product.variants.length} variant(s)`}
        action={<Badge tone={product.status === "active" ? "success" : "warn"}>{product.status}</Badge>}
      />

      <section className="glass space-y-4 rounded-3xl p-6">
        <h2 className="font-display text-lg text-[#f4faff]">Media library ({product.images.length})</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {product.images.map((image) => (
            <div key={image.productImageId ?? image.id} className="space-y-2">
              {image.kind === "video" ? (
                <video src={image.publicUrl} className="aspect-square w-full rounded-2xl object-cover" muted />
              ) : (
                <MediaImage src={image.publicUrl} alt={image.altText ?? product.name} className="aspect-square w-full rounded-2xl" sizes="200px" />
              )}
              <form action={replaceProductImageAction} className="space-y-2">
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="imageId" value={image.productImageId} />
                <Select name="role" defaultValue={image.role} className="rounded-xl py-1.5 text-[11px]">
                  {["main", "gallery", "variant", "size_chart", "promo"].map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </Select>
                <SubmitButton pendingLabel="Setting…" className="w-full px-2 py-1 text-[11px]">Set role</SubmitButton>
              </form>
              <form action={removeProductImageAction}>
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="imageId" value={image.productImageId} />
                <input type="hidden" name="mediaId" value={image.id} />
                <SubmitButton pendingLabel="Deleting…" variant="danger" className="w-full px-2 py-1 text-[11px]">Delete</SubmitButton>
              </form>
            </div>
          ))}
        </div>

        <form action={updateProductImageAction} className="flex flex-wrap items-center gap-3 text-xs text-[#a8c0d5]">
          <input type="hidden" name="productId" value={product.id} />
          <input
            name="orderedIds"
            placeholder="Comma separated image ids to reorder"
            className="min-w-64 flex-1 rounded-2xl border border-[#a8c0d5]/25 bg-[#071a2b]/70 px-3 py-2"
          />
          <SubmitButton pendingLabel="Applying…">Apply order</SubmitButton>
        </form>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="glass space-y-4 rounded-3xl p-6">
          <h2 className="font-display text-lg text-[#f4faff]">Upload media</h2>
          <ProductMediaForms
            productId={product.id}
            existingMedia={media.map((asset) => ({ id: asset.id, role: asset.role, storagePath: asset.storagePath }))}
          />
        </section>

        <section className="glass space-y-4 rounded-3xl p-6">
          <h2 className="font-display text-lg text-[#f4faff]">Storage rules</h2>
          <Alert tone="info">
            Files are validated (MIME + size) before upload. With Supabase Storage configured the object lands in the
            <span className="mx-1 font-semibold">uploads</span> bucket and only the path/URL/metadata is stored in Postgres.
          </Alert>
          <Alert tone="warn">
            Broken images fall back to a branded MKR placeholder — never a fake product photo.
          </Alert>
        </section>
      </div>

      <ProductForm product={product} categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
