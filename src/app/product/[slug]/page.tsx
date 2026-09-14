import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronDown, Check } from "lucide-react";
import { getProductBySlug, getRelatedProducts } from "@/lib/products";
import { effectiveVariants, stockStatusOf, type Product } from "@/db/schema";
import { bdt, discountPct } from "@/lib/format";
import PurchasePanel from "@/components/PurchasePanel";
import ProductCard from "@/components/ProductCard";
import Gallery from "@/components/Gallery";
import Reveal from "@/components/Reveal";
import TypewriterDescription from "@/components/TypewriterDescription";
import RatingSummary from "@/components/RatingSummary";
import ReviewSection from "@/components/ReviewSection";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found", robots: { index: false } };
  const siteUrl = (process.env.SITE_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
  const canonicalPath = `/product/${product.slug}`;
  const canonical = product.canonicalUrl?.trim() || `${siteUrl}${canonicalPath}`;
  const description =
    product.seoDescription || product.shortDescription || product.description.slice(0, 150);
  const ogImage = product.seoImage?.trim() || product.image;
  return {
    title: product.seoTitle || product.name,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: product.seoTitle || product.name,
      description,
      images: ogImage ? [{ url: ogImage, alt: product.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.seoTitle || product.name,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-[0.26em] text-mist transition-colors hover:text-ice">
        {title}
        <ChevronDown className="h-4 w-4 transition-transform duration-500 group-open:rotate-180" />
      </summary>
      <div className="acc-body mt-4 text-sm leading-relaxed text-mist/85">{children}</div>
    </details>
  );
}

function StockBadge({ product }: { product: Product }) {
  const status = stockStatusOf(product);
  if (status === "out_of_stock") {
    return <span className="adm-badge adm-badge--danger">Out of stock</span>;
  }
  if (status === "low_stock") {
    return <span className="adm-badge adm-badge--warn">Low stock — order soon</span>;
  }
  return <span className="adm-badge adm-badge--success">In stock</span>;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product);
  const pct = discountPct(product.price, product.compareAtPrice);
  const gallery = product.images.length > 0 ? product.images : [{ url: product.image, alt: product.name, order: 0 }];
  const deliveryText = product.deliveryInfo ||
    "Pay the delivery charge in advance with bKash, Nagad or Rocket — products are paid cash on delivery (or fully in advance if you prefer). Once your advance payment is verified, the order is confirmed and prepared for dispatch. You can follow every step from the order page or the Track Order page.";

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
            <Gallery images={gallery} name={product.name} isNew={product.isNew && !pct} sale={Boolean(pct)} />
          </Reveal>
        </div>

        {/* details */}
        <div className="lg:col-span-5">
          <Reveal delay={80}>
            {/* meta line — only when data exists */}
            {(product.brand || product.category) && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs uppercase tracking-[0.22em] text-mist/80">
                {product.brand && <span className="text-soft">{product.brand}</span>}
                {product.brand && product.category && <span aria-hidden="true">·</span>}
                {product.category && <Link href="/shop" className="transition-colors hover:text-ice">{product.category}</Link>}
                {product.subcategory && (
                  <>
                    <span aria-hidden="true">/</span>
                    <span>{product.subcategory}</span>
                  </>
                )}
              </div>
            )}

            <h1 className="display-3 mt-3 text-foam">{product.name}</h1>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
              <StockBadge product={product} />
              <RatingSummary productId={product.id} variant="inline" />
            </div>

            <div className="mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-2">
              <p className="font-display text-2xl font-bold text-ice">{bdt(product.price)}</p>
              {product.compareAtPrice ? (
                <>
                  <p className="text-base text-mist/70 line-through">{bdt(product.compareAtPrice)}</p>
                  {pct && <p className="text-sm text-accent">{pct}% off</p>}
                </>
              ) : null}
              {product.sku && (
                <p className="ml-auto text-xs text-mist/60">SKU: {product.sku}</p>
              )}
            </div>

            {product.shortDescription && (
              <p className="mt-6 max-w-md text-sm leading-relaxed text-mist/85">{product.shortDescription}</p>
            )}

            {!product.shortDescription && (
              <TypewriterDescription text={product.description} className="mt-8 max-w-md !text-[0.98rem]" />
            )}

            <PurchasePanel
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                image: product.image,
                price: product.price,
                variants: effectiveVariants(product),
                stock: product.stock,
                sizeRecommendationEnabled: product.sizeRecommendationEnabled ?? false,
              }}
            />

            {/* accordions — only sections with data are rendered */}
            <div className="mt-10 divide-y divide-line-soft border-t border-line-soft">
              <Accordion title="Description">
                <p className="whitespace-pre-line">{product.description}</p>
              </Accordion>

              {product.features.length > 0 && (
                <Accordion title="Features">
                  <ul className="space-y-2">
                    {product.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-soft" strokeWidth={2.5} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </Accordion>
              )}

              {product.specifications.length > 0 && (
                <Accordion title="Specifications">
                  <dl className="overflow-hidden rounded-lg border border-line-soft">
                    {product.specifications.map((s, i) => (
                      <div
                        key={i}
                        className={`grid grid-cols-1 gap-1 px-4 py-2.5 text-sm sm:grid-cols-[40%_60%] sm:gap-4 ${i % 2 === 0 ? "bg-white/[0.03]" : ""}`}
                      >
                        <dt className="min-w-0 break-words text-mist/70">{s.label}</dt>
                        <dd className="min-w-0 break-words text-foam [overflow-wrap:anywhere]">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                </Accordion>
              )}

              {product.material && (
                <Accordion title="Material & care">
                  <p className="whitespace-pre-line">{product.material}</p>
                </Accordion>
              )}

              <Accordion title="Delivery & payment">
                <p className="whitespace-pre-line">{deliveryText}</p>
              </Accordion>

              {product.warranty && (
                <Accordion title="Warranty">
                  <p className="whitespace-pre-line">{product.warranty}</p>
                </Accordion>
              )}

              {product.returnPolicy && (
                <Accordion title="Return Policy">
                  <p className="whitespace-pre-line">{product.returnPolicy}</p>
                </Accordion>
              )}

              {product.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 py-5">
                  {product.tags.map((t) => (
                    <span key={t} className="rounded-full border border-line-soft px-3 py-1 text-xs text-mist/80">
                      {t}
                    </span>
                  ))}
                </div>
              )}
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
