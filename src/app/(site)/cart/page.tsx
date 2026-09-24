import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui";
import { CartPageView } from "@/components/cart/cart-page-view";
import { getCurrentCustomer } from "@/lib/auth/customer";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const customer = await getCurrentCustomer();
  return (
    <div className="mx-auto w-full max-w-[88rem] space-y-8">
      <header className="max-w-2xl">
        <p className="meta-label">Your selection</p>
        <h1 className="display-1 mt-4 text-[#f4faff]">Your cart</h1>
        <p className="mt-4 text-sm leading-relaxed text-[#a8c0d5]">
          Saved to your MKR account — nothing is stored in your browser.
        </p>
      </header>
      <CartPageView authenticated={Boolean(customer)} />
    </div>
  );
}
