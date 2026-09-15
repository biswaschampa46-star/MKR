import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { getProductBySlug, getRelatedProducts } from "@/lib/products";
import { bdt, discountPct } from "@/lib/format";
import PurchasePanel from "@/components/PurchasePanel";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/Reveal";
import TypewriterDescription from "@/components/TypewriterDescription";
import RatingSummary from "@/components/RatingSummary";
import ReviewSection from "@/components/ReviewSection";
import DataErrorState from "@/components/DataErrorState";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProductBySlug(slug);
  if (!result.ok || !result.data) return { title: "Product not found" };
  return { title: result.data.name, description: result.data.description.slice(0, 150) };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getProductBySlug(slug);

  // B) Database/network failure — NEVER render the 404 page for this.
  if (!result.ok) {
    return (
      <DataErrorState
        title="We could not load this product."
        message="The store database did not respond just now. Your product still exists — this is temporary. Please try again."
      />
    );
  }

  // A) The query succeeded and genuinely no product has this slug.
  const product = result.data;
  if (!product) notFound();

  const relatedResult = await getRelatedProducts(product);
  const related = relatedResult.ok ? relatedResult.data : [];
  const pct = discountPct(product.price, product.compareAtPrice);

  return (
    <div className="mx-auto max-w-[1400px] px-6 pb-28 pt-28 md:px-10 md:pt-36">
      <Link
        href="/shop"
        className="group inline-flex items-center gap-3 text-xs uppercase tracking-[0.26em] text-mist transition-colors hover:text-ice"
      >
        <ArrowLeft className="h-4 w-4 transition-transform duration-500 group-hover:-translate-x-1" />
        Back to shop
      </Link>

      <div className="mt-10 grid gap-14 lg:grid-cols-12 lg:gap-16">
        {/* media */}
        <div className="lg:col-span-6">
          <Reveal className="lg:sticky lg:top-28">
            <div className="media-frame relative aspect-[4/5]">
              <Image
                src={product.image}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="media-zoom object-cover"
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(7,26,43,0.28)] to-transparent"
                aria-hidden="true"
              />
              {product.isNew && !pct && (
                <span className="badge-tag absolute left-5 top-5">New</span>
              )}
              {pct && <span className="badge-tag absolute left-5 top-5">Sale</span>}
            </div>
          </Reveal>
        </div>

        {/* details */}
        <div className="lg:col-span-5">
          <Reveal delay={80}>
            <h1 className="display-3 mt-5 text-foam">{product.name}</h1>

            <div className="mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-2">
              <p className="font-display text-2xl font-bold text-ice">{bdt(product.price)}</p>
              {product.compareAtPrice ? (
                <>
                  <p className="text-base text-mist/70 line-through">{bdt(product.compareAtPrice)}</p>
                  {pct && <p className="text-sm text-accent">{pct}% off</p>}
                </>
              ) : null}
            </div>

            <RatingSummary productId={product.id} variant="inline" className="mt-5" />

            <TypewriterDescription text={product.description} className="mt-8 max-w-md !text-[0.98rem]" />

            <PurchasePanel
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                image: product.image,
                price: product.price,
                variants: product.variants,
              }}
            />

            {/* accordions */}
            <div className="mt-10 divide-y divide-line-soft border-t border-line-soft">
              {product.material && (
                <details className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-[0.26em] text-mist transition-colors hover:text-ice">
                    Material & care
                    <ChevronDown className="h-4 w-4 transition-transform duration-500 group-open:rotate-180" />
                  </summary>
                  <p className="mt-4 text-sm leading-relaxed text-mist/85">{product.material}</p>
                </details>
              )}
              <details className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-[0.26em] text-mist transition-colors hover:text-ice">
                  Delivery & payment
                  <ChevronDown className="h-4 w-4 transition-transform duration-500 group-open:rotate-180" />
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-mist/85">
                  Orders are paid in advance with bKash, Nagad or Rocket. Once your
                  payment is verified, the order is confirmed and prepared for
                  dispatch. You can follow every step from the order page or the
                  Track Order page.
                </p>
              </details>
            </div>
          </Reveal>
        </div>
      </div>

      {/* reviews */}
      <ReviewSection productId={product.id} productName={product.name} />

      {/* related */}
      {related.length > 0 && (
        <section className="mt-32 border-t border-line-soft pt-16 md:pt-20" aria-label="Related products">
          <Reveal>
            <p className="label">Continue Exploring</p>
            <h2 className="display-3 mt-6 text-foam">You may also like</h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-12 gap-x-6 gap-y-12 md:gap-x-8">
            {related.map((p, i) => (
              <Reveal key={p.id} delay={i * 90} className="col-span-12 sm:col-span-6 lg:col-span-4">
                <ProductCard product={p} sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw" />
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
