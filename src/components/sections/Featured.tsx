"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import type { ProductCard as ProductCardType } from "@/lib/products";

const TABS = [
  { id: "all", label: "All" },
  { id: "new", label: "New Arrivals" },
] as const;

/** asymmetric editorial placement pattern (12-col grid) */
const PLACEMENT = [
  "col-span-12 md:col-span-7",
  "col-span-10 col-start-2 md:col-span-5 md:col-start-8 md:mt-28",
  "col-span-12 md:col-span-5 md:mt-6",
  "col-span-10 col-start-2 md:col-span-5 md:col-start-8 md:mt-20",
];

export default function Featured({ products }: { products: ProductCardType[] }) {
  const [tab, setTab] = useState<string>("all");

  const visible = useMemo(() => {
    let list =
      tab === "new"
        ? products.filter((p) => p.isNew)
        : products.filter((p) => p.isFeatured);
    if (list.length === 0 && tab !== "all") list = products.slice(0, 4);
    if (tab === "all" && list.length < 4) {
      const extra = products.filter((p) => !list.includes(p));
      list = [...list, ...extra].slice(0, 4);
    }
    return list.slice(0, 4);
  }, [tab, products]);

  return (
    <section className="relative py-24 md:py-36" aria-label="Featured products">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        {/* header row */}
        <div className="mb-14 flex flex-col justify-between gap-8 md:mb-20 md:flex-row md:items-end">
          <div>
            <p className="label">Featured Products</p>
            <h2 className="display-2 mt-7 text-foam">
              Chosen with
              <br />
              <span className="text-stroke">intention.</span>
            </h2>
          </div>
          <Link
            href="/shop"
            className="group inline-flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-soft hover:text-ice"
          >
            View all products
            <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* editorial filter navigation */}
        <div
          role="group"
          aria-label="Filter products"
          className="mb-12 flex flex-wrap gap-x-8 gap-y-2 overflow-x-auto border-b border-line-soft pb-1 md:mb-16 md:gap-x-10"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className="chip"
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* asymmetric composition */}
        <div key={tab} className="grid grid-cols-12 gap-x-6 gap-y-14 md:gap-x-8 md:gap-y-8">
          {visible.map((p, i) => (
            <div
              key={p.id}
              className={`grid-in ${PLACEMENT[i % PLACEMENT.length]}`}
              style={{ "--d": `${i * 110}ms` } as CSSProperties}
            >
              <ProductCard
                product={p}
                priority={i === 0}
                sizes="(max-width: 768px) 85vw, 45vw"
              />
            </div>
          ))}
        </div>

        {visible.length === 0 && (
          <p className="py-16 text-center text-sm text-mist">
            Products are on their way. Check back shortly.
          </p>
        )}
      </div>
    </section>
  );
}
