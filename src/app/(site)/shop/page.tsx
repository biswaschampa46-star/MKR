import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState, ErrorState, LinkButton, ProductGridSkeleton, SectionHeading } from "@/components/ui";
import { ProductCard } from "@/components/product/product-card";
import { listAvailableFilters, listCategories, listProducts, recordSearch } from "@/lib/data/catalog";
import { getCurrentCustomer } from "@/lib/auth/customer";
import { listWishlist } from "@/lib/data/commerce";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop premium clothing",
  description: "Browse the full MKR collection — filter by category, size, colour and price. Delivery across Bangladesh.",
  alternates: { canonical: "/shop" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

async function ProductResults({ params }: { params: Record<string, string | string[] | undefined> }) {
  const query = single(params.q)?.trim() ?? "";
  const categorySlug = single(params.category);
  const size = single(params.size);
  const color = single(params.color);
  const sort = (single(params.sort) as "newest" | "price-asc" | "price-desc" | "popular" | "discount" | undefined) ?? "newest";
  const page = Number(single(params.page) ?? 1) || 1;
  const onSaleOnly = single(params.onSale) === "1";
  const inStockOnly = single(params.inStock) === "1";

  let result;
  try {
    result = await listProducts({
      search: query || undefined,
      categorySlug: categorySlug || undefined,
      size: size || undefined,
      color: color || undefined,
      sort,
      page,
      perPage: 12,
      onSaleOnly,
      inStockOnly,
    });
  } catch (error) {
    return (
      <ErrorState
        title="Products could not be loaded"
        description="The product service returned an error. This is not an empty catalogue — please retry."
        retryHref="/shop"
      />
    );
  }

  if (query) {
    const customer = await getCurrentCustomer().catch(() => null);
    await recordSearch(query, customer?.id ?? null, result.total).catch(() => {});
  }

  if (result.items.length === 0) {
    return (
      <EmptyState
        title={query ? `No matches for “${query}”` : "Nothing published here yet"}
        description={
          query
            ? "Try a different keyword, or clear the filters to browse the full catalogue."
            : "New pieces are on the way — check back shortly for the latest arrivals."
        }
        action={<LinkButton href="/shop" size="sm" variant="outline">Clear filters</LinkButton>}
      />
    );
  }

  const customer = await getCurrentCustomer().catch(() => null);
  const wishlist = customer ? await listWishlist(customer.id).catch(() => []) : [];
  const wishIds = new Set(wishlist.map((item) => item.productId));
  const totalPages = Math.max(1, Math.ceil(result.total / result.perPage));

  return (
    <div className="mx-auto w-full max-w-[88rem] space-y-8">
      <p className="text-xs uppercase tracking-[0.3em] text-[#a8c0d5]">
        {result.total} {result.total === 1 ? "piece" : "pieces"}
      </p>
      <div className="grid grid-cols-2 gap-[clamp(0.75rem,2vw,1.5rem)] sm:grid-cols-3 xl:grid-cols-4">
        {result.items.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            wishlisted={wishIds.has(product.id)}
            authenticated={Boolean(customer)}
            featured={index === 0 && page === 1}
            revealDelay={(index % 8) * 60}
            revealIndex={index}
            /* Keep the alternating rhythm across pagination boundaries. */
            revealOffset={(page - 1) * result.items.length}
          />
        ))}
      </div>

      {totalPages > 1 ? (
        <nav className="flex flex-wrap items-center justify-center gap-2 pt-4">
          {Array.from({ length: totalPages }).slice(0, 10).map((_, index) => {
            const target = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
              const v = single(value);
              if (v && key !== "page") target.set(key, v);
            });
            target.set("page", String(index + 1));
            return (
              <Link
                key={index}
                href={`/shop?${target.toString()}`}
                className={`rounded-full border px-3.5 py-2 text-xs transition ${
                  page === index + 1 ? "border-[#8ccbff] bg-[#8ccbff]/15 text-[#f4faff]" : "border-[#a8c0d5]/25 text-[#ddf3ff]"
                }`}
              >
                {index + 1}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const [filters, categories] = await Promise.all([
    listAvailableFilters().catch(() => ({ sizes: [], colors: [], price: { min: 0, max: 0 } })),
    listCategories().catch(() => []),
  ]);
  const currentCategory = single(params.category);
  const sort = single(params.sort) ?? "newest";

  const buildHref = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      const v = single(value);
      if (v && !(key in patch)) next.set(key, v);
    });
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value);
    });
    const queryString = next.toString();
    return queryString ? `/shop?${queryString}` : "/shop";
  };

  return (
    <div className="mx-auto w-full max-w-[88rem] space-y-8">
      <header className="max-w-3xl">
        <p className="meta-label">Collection</p>
        <h1 className="display-1 mt-4 text-[#f4faff]">
          {single(params.q) ? `Results for “${single(params.q)}”` : "The full collection"}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[#a8c0d5]">
          Every piece, price and stock count is live from the MKR catalogue.
        </p>
      </header>

      <div className="no-scrollbar h-tray flex gap-2 overflow-x-auto pb-1">
        <Link
          href={buildHref({ category: undefined, page: undefined })}
          className={`shrink-0 rounded-xl border px-4 py-2 text-xs uppercase tracking-[0.14em] transition-all duration-300 ${
            !currentCategory ? "border-[#8ccbff]/70 bg-[#8ccbff]/10 text-[#f4faff]" : "border-[#a8c0d5]/20 text-[#ddf3ff] hover:border-[#8ccbff]/50"
          }`}
        >
          All products
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={buildHref({ category: category.slug, page: undefined })}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs transition ${
              currentCategory === category.slug ? "border-[#8ccbff] bg-[#8ccbff]/15 text-[#f4faff]" : "border-[#a8c0d5]/25 text-[#ddf3ff]"
            }`}
          >
            {category.name} ({category.productCount})
          </Link>
        ))}
      </div>

      <div className="hairline-b hairline-t flex flex-wrap items-center gap-3 px-1 py-4">
        <span className="meta-label-muted">Sort</span>
        {[
          { key: "newest", label: "Newest" },
          { key: "price-asc", label: "Price ↑" },
          { key: "price-desc", label: "Price ↓" },
          { key: "popular", label: "Best selling" },
          { key: "discount", label: "On sale" },
        ].map((option) => (
          <Link
            key={option.key}
            href={buildHref({ sort: option.key, page: undefined })}
            className={`rounded-full px-3 py-1.5 text-xs transition ${
              sort === option.key ? "bg-[#8ccbff]/20 text-[#f4faff]" : "text-[#ddf3ff] hover:bg-[#ddf3ff]/10"
            }`}
          >
            {option.label}
          </Link>
        ))}
        <span className="ml-auto flex flex-wrap gap-2">
          <Link
            href={buildHref({ onSale: single(params.onSale) === "1" ? undefined : "1", page: undefined })}
            className={`rounded-full border px-3 py-1.5 text-xs ${
              single(params.onSale) === "1" ? "border-[#8ccbff] text-[#f4faff]" : "border-[#a8c0d5]/25 text-[#ddf3ff]"
            }`}
          >
            On sale
          </Link>
          <Link
            href={buildHref({ inStock: single(params.inStock) === "1" ? undefined : "1", page: undefined })}
            className={`rounded-full border px-3 py-1.5 text-xs ${
              single(params.inStock) === "1" ? "border-[#8ccbff] text-[#f4faff]" : "border-[#a8c0d5]/25 text-[#ddf3ff]"
            }`}
          >
            In stock
          </Link>
        </span>
      </div>

      {filters.sizes.length > 0 || filters.colors.length > 0 ? (
        <div className="space-y-3">
          {filters.sizes.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="meta-label-muted">Sizes</span>
              {filters.sizes.map((size) => (
                <Link
                  key={size}
                  href={buildHref({ size: single(params.size) === size ? undefined : size, page: undefined })}
                  className={`rounded-full border px-3 py-1.5 text-xs ${
                    single(params.size) === size ? "border-[#8ccbff] bg-[#8ccbff]/15 text-[#f4faff]" : "border-[#a8c0d5]/25 text-[#ddf3ff]"
                  }`}
                >
                  {size}
                </Link>
              ))}
            </div>
          ) : null}
          {filters.colors.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="meta-label-muted">Colours</span>
              {filters.colors.map((color) => (
                <Link
                  key={color.name}
                  href={buildHref({ color: single(params.color) === color.name ? undefined : color.name, page: undefined })}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
                    single(params.color) === color.name ? "border-[#8ccbff] bg-[#8ccbff]/15 text-[#f4faff]" : "border-[#a8c0d5]/25 text-[#ddf3ff]"
                  }`}
                >
                  <span className="h-3 w-3 rounded-full border border-[#a8c0d5]/40" style={{ background: color.hex ?? "#0e2f4a" }} />
                  {color.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <Suspense fallback={<ProductGridSkeleton />}>
        <ProductResults params={params} />
      </Suspense>
    </div>
  );
}
