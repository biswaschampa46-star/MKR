import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { Alert, Badge, ErrorState, SectionHeading } from "@/components/ui";
import { ProductCard } from "@/components/product/product-card";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductPurchase } from "@/components/product/product-purchase";
import { ReviewForm } from "@/components/product/review-form";
import { getProductBySlug, listApprovedReviews, listRelatedProducts } from "@/lib/data/catalog";
import { getCurrentCustomer } from "@/lib/auth/customer";
import { isWishlisted } from "@/lib/data/commerce";
import { formatDate, formatTaka } from "@/lib/utils";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) return { title: "Product not found" };
  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.shortDescription ?? undefined,
    keywords: product.keywords.length > 0 ? product.keywords : undefined,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: product.seoTitle ?? product.name,
      description: product.seoDescription ?? product.shortDescription ?? undefined,
      images: product.mainImage ? [{ url: product.mainImage.publicUrl }] : undefined,
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;

  let product;
  try {
    product = await getProductBySlug(slug);
  } catch (error) {
    return (
      <ErrorState
        title="This product could not be loaded"
        description="The catalogue request failed. Please retry — we do not disguise errors as missing products."
        retryHref={`/product/${slug}`}
      />
    );
  }
  if (!product) notFound();

  const [customer, reviews, related] = await Promise.all([
    getCurrentCustomer().catch(() => null),
    listApprovedReviews(product.id).catch(() => []),
    listRelatedProducts(product.id, product.categoryId ?? null, 4).catch(() => []),
  ]);
  const wishlisted = customer ? await isWishlisted(customer.id, product.id).catch(() => false) : false;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription ?? product.description ?? product.name,
    sku: product.sku,
    brand: { "@type": "Brand", name: product.brand },
    image: product.images.map((image) => `${env.siteUrl}${image.publicUrl.startsWith("/") ? image.publicUrl : ""}`).filter(Boolean),
    offers: {
      "@type": "Offer",
      priceCurrency: "BDT",
      price: product.price,
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${env.siteUrl}/product/${product.slug}`,
    },
    ...(product.ratingAverage
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.ratingAverage, reviewCount: product.ratingCount } }
      : {}),
  };

  return (
    <div className="mx-auto w-full max-w-[88rem] space-y-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <nav aria-label="Breadcrumb" className="meta-label-muted flex flex-wrap items-center gap-3">
        <Link href="/" className="transition-colors hover:text-[#f4faff]">Home</Link>
        <span aria-hidden>/</span>
        <Link href="/shop" className="transition-colors hover:text-[#f4faff]">Shop</Link>
        {product.categorySlug ? (
          <>
            <span aria-hidden>/</span>
            <Link href={`/shop?category=${product.categorySlug}`} className="transition-colors hover:text-[#f4faff]">{product.categoryName}</Link>
          </>
        ) : null}
        <span aria-hidden>/</span>
        <span className="text-[#f4faff]">{product.name}</span>
      </nav>

      <div className="grid gap-[clamp(2rem,5vw,4rem)] lg:grid-cols-2">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ProductGallery images={product.images} name={product.name} />
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">{product.categoryName ?? product.brand}</Badge>
              {product.discountPercent > 0 ? <Badge tone="warn">-{product.discountPercent}%</Badge> : null}
              {product.stock <= 0 ? <Badge tone="danger">Sold out</Badge> : null}
            </div>
            <h1 className="display-1 text-[#f4faff]">{product.name}</h1>
            {product.shortDescription ? <p className="text-sm text-[#a8c0d5]">{product.shortDescription}</p> : null}
            <div className="flex items-baseline gap-3">
              <span className="font-display text-[clamp(1.75rem,3vw,2.5rem)] text-[#f4faff]">
                ৳<span data-countup={product.price}>{product.price.toLocaleString("en-BD")}</span>
              </span>
              {product.comparePrice && product.comparePrice > product.price ? (
                <span className="text-sm text-[#a8c0d5]/70 line-through">{formatTaka(product.comparePrice)}</span>
              ) : null}
            </div>
            {product.ratingAverage ? (
              <p className="flex items-center gap-2 text-sm text-[#a8c0d5]">
                <Star className="h-4 w-4 fill-[#8ccbff] text-[#8ccbff]" />
                {product.ratingAverage.toFixed(1)} · {product.ratingCount} review{product.ratingCount === 1 ? "" : "s"}
              </p>
            ) : null}
            <p className="text-xs uppercase tracking-[0.24em] text-[#8ccbff]">SKU {product.sku}</p>
          </div>

          <ProductPurchase product={product} />

          <dl className="hairline-t grid gap-x-8 gap-y-4 pt-6 sm:grid-cols-2">
            {[
              { label: "Material", value: product.material },
              { label: "Fabric", value: product.fabric },
              { label: "Fit", value: product.fit },
              { label: "Designed for", value: product.gender },
            ]
              .filter((spec) => spec.value)
              .map((spec, index) => (
                <div key={spec.label} className="flex items-baseline gap-3">
                  <span className="spec-index">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <dt className="meta-label-muted">{spec.label}</dt>
                    <dd className="mt-1 text-sm text-[#f4faff]">{spec.value}</dd>
                  </div>
                </div>
              ))}
          </dl>

          {product.careInstructions ? (
            <Alert tone="info">{product.careInstructions}</Alert>
          ) : null}
          {product.shippingInformation ? (
            <p className="text-xs text-[#a8c0d5]">{product.shippingInformation}</p>
          ) : null}
        </div>
      </div>

      {(product.description || product.richContent) ? (
        <section className="grid gap-8 rounded-[24px] border border-[#a8c0d5]/10 bg-[#0a1d2e]/40 p-[clamp(1.5rem,4vw,3rem)] lg:grid-cols-[240px_1fr] lg:gap-14" data-reveal="scale" suppressHydrationWarning>
          <div>
            <p className="meta-label">The piece</p>
            <h2 className="display-2 mt-3 text-[#f4faff]">Details</h2>
          </div>
          {product.description ? <p className="whitespace-pre-line text-sm text-[#a8c0d5]">{product.description}</p> : null}
          {product.richContent ? <p className="whitespace-pre-line text-sm text-[#a8c0d5]">{product.richContent}</p> : null}
        </section>
      ) : null}

      <section className="space-y-6" data-reveal suppressHydrationWarning>
        <SectionHeading eyebrow="Feedback" title={`Reviews (${reviews.length})`} />
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <p className="text-sm text-[#a8c0d5]">No approved reviews yet. Be the first to review this piece.</p>
            ) : (
              reviews.map((review) => (
                <article key={review.id} className="glass rounded-3xl p-5">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm text-[#f4faff]">{review.customerName ?? "MKR customer"}</p>
                    <span className="flex items-center gap-1 text-xs text-[#8ccbff]">
                      {Array.from({ length: review.rating }).map((_, index) => (
                        <Star key={index} className="h-3.5 w-3.5 fill-[#8ccbff]" />
                      ))}
                    </span>
                  </div>
                  {review.title ? <p className="font-display text-base text-[#f4faff]">{review.title}</p> : null}
                  <p className="mt-1 whitespace-pre-line text-sm text-[#a8c0d5]">{review.body}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-[#a8c0d5]/70">{formatDate(review.createdAt)}</p>
                </article>
              ))
            )}
          </div>
          <div className="glass rounded-3xl p-5">
            <h3 className="mb-4 font-display text-lg text-[#f4faff]">Write a review</h3>
            <ReviewForm productId={product.id} authenticated={Boolean(customer)} />
          </div>
        </div>
      </section>

      {related.length > 0 ? (
        <section data-reveal suppressHydrationWarning>
          <SectionHeading eyebrow="Complete the look" title="You may also like" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((item, index) => (
              <ProductCard
                key={item.id}
                product={item}
                wishlisted={false}
                authenticated={Boolean(customer)}
                revealIndex={index}
                /* Phase 19: art-directed L/R alternation in the related grid. */
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
