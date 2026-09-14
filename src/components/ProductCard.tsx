import Link from "next/link";
import type { ProductCard as ProductCardType } from "@/lib/products";
import { bdt, discountPct } from "@/lib/format";
import ProductCardRating from "@/components/ProductCardRating";
import ProductCardImage from "@/components/ProductCardImage";

export default function ProductCard({
  product,
  sizes = "(max-width: 768px) 90vw, 40vw",
  priority = false,
}: {
  product: ProductCardType;
  sizes?: string;
  priority?: boolean;
}) {
  const pct = discountPct(product.price, product.compareAtPrice);

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block"
      aria-label={`${product.name} — ${bdt(product.price)}`}
    >
      <div className="pcard-media media-frame relative aspect-[4/5]">
        <ProductCardImage src={product.image} alt={product.name} sizes={sizes} priority={priority} />
        {/* soft blue veil */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(7,26,43,0.35)] via-transparent to-transparent"
          aria-hidden="true"
        />
        {product.isNew && !pct && (
          <span className="badge-tag absolute left-4 top-4">New</span>
        )}
        {pct && <span className="badge-tag absolute left-4 top-4">Sale</span>}
      </div>

      <div className="pcard-meta mt-5 flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-display line-clamp-2 min-w-0 text-[0.95rem] font-semibold uppercase leading-snug tracking-[0.08em] text-foam">
            {product.name}
          </h3>
          <ProductCardRating productId={product.id} className="mt-2.5" />
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[0.95rem] font-medium text-ice">{bdt(product.price)}</p>
          {product.compareAtPrice ? (
            <p className="mt-1 flex items-center justify-end gap-2 text-xs text-mist/70">
              <span className="line-through">{bdt(product.compareAtPrice)}</span>
              {pct && <span className="text-accent">{pct}% off</span>}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
