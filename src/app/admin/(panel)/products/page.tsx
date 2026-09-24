import Link from "next/link";
import { Badge, LinkButton, SectionHeading } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { MediaImage } from "@/components/media-image";
import { bulkProductAction, setProductStatusAction } from "@/app/actions/admin-products";
import { listProducts } from "@/lib/data/catalog";
import { formatTaka } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; status?: string }> }) {
  const params = await searchParams;
  const result = await listProducts({
    includeUnpublished: true,
    search: params.q,
    page: Number(params.page ?? 1) || 1,
    perPage: 20,
    sort: "newest",
  });
  const filtered = params.status ? result.items.filter((item) => item.stock >= 0) : result.items;

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Catalogue"
        title="Products"
        description={`${result.total} products in the database. Images live in Supabase Storage; only paths and metadata are stored in Postgres.`}
        action={<LinkButton href="/admin/products/new" size="sm">New product</LinkButton>}
      />

      <form className="glass flex flex-wrap items-center gap-3 rounded-3xl px-4 py-3">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search name, SKU, description…"
          className="min-w-56 flex-1 rounded-2xl border border-[#a8c0d5]/25 bg-[#071a2b]/70 px-4 py-2.5 text-sm"
        />
        <button type="submit" className="rounded-full border border-[#a8c0d5]/25 px-4 py-2 text-xs text-[#ddf3ff]">Search</button>
      </form>

      <form action={bulkProductAction} className="space-y-3">
        <div className="glass flex flex-wrap items-center gap-3 rounded-3xl px-4 py-3 text-xs text-[#a8c0d5]">
          <Select name="bulkAction" className="w-auto min-w-44 py-2 text-xs">
            <option value="publish">Publish selected</option>
            <option value="draft">Move to draft</option>
            <option value="archive">Archive selected</option>
            <option value="delete">Delete selected</option>
          </Select>
          <SubmitButton pendingLabel="Applying…">Apply</SubmitButton>
          <span>Bulk actions run server-side with FK-safe deletes.</span>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <p className="glass rounded-3xl p-6 text-sm text-[#a8c0d5]">No products match this search.</p>
          ) : (
            filtered.map((product) => (
              <article key={product.id} className="glass flex flex-wrap items-center gap-4 rounded-3xl p-4">
                <input type="checkbox" name="ids" value={product.id} className="h-4 w-4" />
                <MediaImage src={product.mainImage?.publicUrl} alt={product.name} className="h-16 w-14 shrink-0 rounded-xl" sizes="56px" />
                <div className="min-w-48 flex-1">
                  <Link href={`/admin/products/${product.id}`} className="font-display text-base text-[#f4faff] hover:text-[#8ccbff]">
                    {product.name}
                  </Link>
                  <p className="text-xs text-[#a8c0d5]">{product.categoryName ?? "Uncategorised"} · stock {product.stock}</p>
                </div>
                <Badge tone={product.stock > 0 ? "success" : "danger"}>{product.stock > 0 ? "In stock" : "Out of stock"}</Badge>
                <span className="font-display text-base text-[#f4faff]"> {formatTaka(product.price)}</span>
                <div className="flex gap-2">
                  <Link href={`/product/${product.slug}`} className="text-xs text-[#8ccbff]">View</Link>
                </div>
              </article>
            ))
          )}
        </div>
      </form>

      <div className="glass space-y-2 rounded-3xl p-5">
        <h2 className="font-display text-base text-[#f4faff]">Quick status change</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {result.items.slice(0, 6).map((product) => (
            <form key={product.id} action={setProductStatusAction} className="flex items-center gap-2 rounded-2xl border border-[#a8c0d5]/12 p-2">
              <input type="hidden" name="id" value={product.id} />
              <input type="hidden" name="status" value={product.stock > 0 ? "active" : "draft"} />
              <span className="flex-1 truncate text-xs text-[#ddf3ff]">{product.name}</span>
              <SubmitButton pendingLabel="Saving…" className="px-3 py-1 text-[11px]">Publish</SubmitButton>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
