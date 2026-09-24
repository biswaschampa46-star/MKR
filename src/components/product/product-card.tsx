import Link from "next/link";
import { Badge, ProductPrice } from "@/components/ui";
import { MediaImage } from "@/components/media-image";
import { WishlistButton } from "@/components/product/wishlist-button";
import type { ProductSummary } from "@/types";

/* ═══════════ EDITORIAL SLIDE ENTRANCE ═══════════
   Premium scroll-driven entrance: the PRODUCT IMAGE slides in from
   alternating horizontal directions (even index → from left, odd → from
   right) while the text block softly fades up afterwards. Direction is
   passed from the server by grid index, so the sequence always alternates
   LEFT / RIGHT / LEFT … regardless of product id. The card itself never
   leaves its layout slot — only the image travels, clipped by the image
   wrapper's overflow-hidden, so no horizontal page overflow is possible. */
export function ProductCard({
  product,
  wishlisted = false,
  authenticated = false,
  featured = false,
  revealDelay = 0,
  revealIndex = 0,
  revealOffset = 0,
}: {
  product: ProductSummary;
  wishlisted?: boolean;
  authenticated?: boolean;
  /** Featured cards span two grid columns with a taller crop (editorial lead). */
  featured?: boolean;
  /** Stagger offset for the scroll-reveal sequence (ms). */
  revealDelay?: number;
  /** Grid index — even enters from the left, odd from the right. */
  revealIndex?: number;
  /** Phase 19: added to the index before computing direction, so later page
      sections CONTINUE the page-wide left/right rhythm instead of restarting. */
  revealOffset?: number;
}) {
  const soldOut = product.stock <= 0;
  const fromLeft = (revealIndex + revealOffset) % 2 === 0;

  return (
    <article
      data-reveal="editorial"
      data-editorial-from={fromLeft ? "left" : "right"}
      suppressHydrationWarning
      style={{ "--reveal-delay": `${revealDelay}ms` } as React.CSSProperties}
      className={`group relative ${featured ? "col-span-2" : ""}`}
    >
      <Link
        href={`/product/${product.slug}`}
        className="block overflow-hidden rounded-[20px] border border-[#a8c0d5]/10 bg-[#0a1d2e]/40 transition-colors duration-500 group-hover:border-[#8ccbff]/30"
        aria-label={product.name}
      >
        <div className={`relative overflow-hidden ${featured ? "aspect-[4/5] md:aspect-[16/12]" : "aspect-[4/5]"}`}>
          <div
            data-editorial-image
            className="absolute inset-0"
          >
            <MediaImage
              src={product.mainImage?.publicUrl}
              alt={product.mainImage?.altText ?? product.name}
              className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.035]"
            />
            {product.hoverImage ? (
              <MediaImage
                src={product.hoverImage.publicUrl}
                alt={product.name}
                className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-700 group-hover:opacity-100"
              />
            ) : null}
          </div>
          <div className="absolute left-3 top-3 flex flex-col items-start gap-2">
            {product.discountPercent > 0 ? <Badge tone="info">-{product.discountPercent}%</Badge> : null}
            {soldOut ? <Badge tone="danger">Sold out</Badge> : null}
            {product.isFeatured && !soldOut && !featured ? <Badge tone="warn">Featured</Badge> : null}
          </div>
        </div>
      </Link>

      <div className="absolute right-3 top-3">
        <WishlistButton productId={product.id} initialActive={wishlisted} authenticated={authenticated} />
      </div>

      <div data-editorial-text className={`space-y-1.5 px-1 pt-4 ${featured ? "sm:px-2" : ""}`}>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#8ccbff]/90">
          {product.categoryName ?? product.brand}
        </p>
        <Link href={`/product/${product.slug}`} className="block">
          <h3
            className={`line-clamp-2 font-display text-[#f4faff] transition-colors duration-300 group-hover:text-[#8ccbff] ${
              featured ? "text-lg sm:text-xl" : "text-base"
            }`}
          >
            {product.name}
          </h3>
        </Link>
        <ProductPrice price={product.price} comparePrice={product.comparePrice} />
        {product.sizes.length > 0 ? (
          <p className="truncate text-xs text-[#a8c0d5]/80">Sizes: {product.sizes.join(" · ")}</p>
        ) : (
          <p className="text-xs text-[#a8c0d5]/80">{soldOut ? "Restocking soon" : "Ready to ship"}</p>
        )}
      </div>
    </article>
  );
}
