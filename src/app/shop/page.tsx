import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ProductCard from "@/components/ProductCard";
import ShopSort from "@/components/ShopSort";
import PromoSlot from "@/components/promo/PromoSlot";
import { getAllProducts, sortProducts, filterProducts, type SortKey } from "@/lib/products";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Shop" };

const SORTS: SortKey[] = ["featured", "newest", "price-asc", "price-desc", "name"];

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const view = typeof sp.view === "string" ? sp.view : undefined;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const sort: SortKey = SORTS.includes(sp.sort as SortKey) ? (sp.sort as SortKey) : "featured";

  const all = await getAllProducts();
  const filtered = sortProducts(filterProducts(all, { view, q }), sort);

  const title = q ? `“${q}”` : view === "new" ? "New Arrivals" : "Shop All";

  const params: Record<string, string> = {};
  if (view) params.view = view;
  if (q) params.q = q;
  const filterHref = (patch: Record<string, string | null>) => {
    const merged = { ...params };
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) delete merged[k];
      else merged[k] = v;
    }
    const str = new URLSearchParams(merged).toString();
    return `/shop${str ? `?${str}` : ""}`;
  };

  const chips = [
    { label: "All", href: filterHref({ view: null }), active: !view },
    { label: "New Arrivals", href: filterHref({ view: "new" }), active: view === "new" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-6 pb-28 pt-36 md:px-10 md:pt-44">
      {/* header */}
      <header className="mb-12 md:mb-16">
        <p className="label">{q ? "Search results" : "The Catalogue"}</p>
        <h1 className="display-2 mt-6 text-foam">{title}</h1>
        <p className="mt-5 text-sm text-mist">
          {filtered.length} {filtered.length === 1 ? "product" : "products"}
        </p>
      </header>

      {/* category-page placement (the shop doubles as the category page) */}
      <PromoSlot placements={["category_page", "above_products"]} className="mt-8" />

      {/* controls */}
      <div className="mb-14 flex flex-wrap items-center justify-between gap-x-8 gap-y-5 border-b border-line-soft pb-5">
        <nav aria-label="Filters" className="flex flex-wrap gap-x-7 gap-y-2">
          {chips.map((c) => (
            <Link key={c.label} href={c.href} className="chip" aria-pressed={c.active}>
              {c.label}
            </Link>
          ))}
        </nav>
        <Suspense>
          <ShopSort sort={sort} params={{ ...params, sort }} />
        </Suspense>
      </div>

      {/* grid — subtle editorial stagger (replays on filter/sort/search change) */}
      {filtered.length > 0 ? (
        <div key={`${view ?? "all"}-${q ?? ""}-${sort}`} className="grid grid-cols-12 gap-x-6 gap-y-14 md:gap-x-8">
          {filtered.map((p, i) => (
            <div
              key={p.id}
              style={{ "--d": `${Math.min(i, 8) * 70}ms` } as React.CSSProperties}
              className={`shop-grid-in col-span-12 sm:col-span-6 lg:col-span-4 ${
                i % 3 === 1 ? "lg:mt-14" : ""
              }`}
            >
              <ProductCard product={p} priority={i < 3} sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw" />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center">
          <p className="font-display text-xl font-bold uppercase tracking-[0.12em] text-foam">
            Nothing here yet
          </p>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-mist">
            {q
              ? `No products matched “${q}”. Try a different search.`
              : "This collection is being restocked. Explore the full catalogue instead."}
          </p>
          <Link href="/shop" className="btn btn-line mt-9">
            Explore Shop
          </Link>
        </div>
      )}
    </div>
  );
}
