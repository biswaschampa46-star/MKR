import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import ProductCard from "@/components/ProductCard";
import type { ProductCard as ProductCardType } from "@/lib/products";
import { bdt } from "@/lib/format";

export default function NewArrivals({ products }: { products: ProductCardType[] }) {
  if (products.length === 0) return null;
  const [lead, ...rest] = products.slice(0, 3);

  return (
    <section className="relative py-24 md:py-36" aria-label="New arrivals">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
          {/* lead product — tall, left */}
          <Reveal className="lg:col-span-7">
            <div className="mb-10 lg:mb-0">
              <p className="label">Just Landed</p>
              <h2 className="display-2 mt-7 text-foam">
                New
                <br />
                <span className="text-stroke">arrivals.</span>
              </h2>
            </div>
            <div className="mt-12 max-w-[92%]">
              <ProductCard product={lead} sizes="(max-width: 1024px) 92vw, 55vw" />
            </div>
          </Reveal>

          {/* supporting stack — right */}
          <div className="flex flex-col justify-end gap-10 lg:col-span-5 lg:pb-6">
            <Reveal delay={120}>
              <div className="hairline mb-10 hidden w-28 lg:block" aria-hidden="true" />
              <p className="body-lead max-w-sm">
                The latest additions to the catalogue — small batches, quietly
                released.
              </p>
            </Reveal>

            {rest.map((p, i) => (
              <Reveal key={p.id} delay={200 + i * 110}>
                <Link href={`/product/${p.slug}`} className="group flex items-center gap-7">
                  <div className="media-frame relative aspect-[4/5] w-28 shrink-0 md:w-32">
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      sizes="(max-width: 768px) 112px, 128px"
                      className="object-cover transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display mt-2 text-base font-semibold uppercase tracking-[0.07em] text-foam transition-colors duration-300 group-hover:text-ice">
                      {p.name}
                    </h3>
                    <p className="mt-2.5 text-sm text-ice">{bdt(p.price)}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-mist/50 transition-all duration-500 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-ice" />
                </Link>
              </Reveal>
            ))}

            <Reveal delay={440}>
              <Link
                href="/shop?view=new"
                className="group inline-flex items-center gap-3 border-t border-line-soft pt-8 text-xs uppercase tracking-[0.28em] text-soft hover:text-ice"
              >
                View all new arrivals
                <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
