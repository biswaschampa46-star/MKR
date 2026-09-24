import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, LinkButton, SectionHeading } from "@/components/ui";
import { MediaImage } from "@/components/media-image";
import { removeWishlistItemAction } from "@/app/actions/profile";
import { requireCustomer } from "@/lib/auth/customer";
import { listWishlist } from "@/lib/data/commerce";
import { formatTaka } from "@/lib/utils";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const customer = await requireCustomer("/profile/wishlist");
  const items = await listWishlist(customer.id);

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Saved" title="My wishlist" description="Saved to your account and available on every device." />
      {items.length === 0 ? (
        <EmptyState
          title="Your wishlist is empty"
          description="Tap the heart on any product to save it here."
          action={<LinkButton href="/shop" size="sm">Browse products</LinkButton>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="premium-hover overflow-hidden rounded-3xl border border-[#a8c0d5]/12 bg-[#0b263d]/45">
              <MediaImage src={item.imageUrl} alt={item.name} className="aspect-[4/5] w-full" />
              <div className="space-y-2 p-4">
                <Link href={`/product/${item.slug}`} className="block font-display text-base text-[#f4faff] hover:text-[#8ccbff]">
                  {item.name}
                </Link>
                <p className="text-sm text-[#a8c0d5]">
                  {formatTaka(item.price)} {item.stock <= 0 ? "· out of stock" : ""}
                </p>
                <form action={removeWishlistItemAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <button type="submit" className="rounded-full border border-rose-400/40 px-3 py-1.5 text-xs text-rose-200 transition hover:bg-rose-500/10">
                    Remove
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
