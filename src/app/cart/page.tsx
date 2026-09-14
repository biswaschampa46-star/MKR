import type { Metadata } from "next";
import CartView from "@/components/CartView";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage() {
  /* Live delivery fees from admin Settings, same source as Checkout/Footer. */
  const s = await getSettings();
  return <CartView fees={{ inside: s.deliveryFeeInside, outside: s.deliveryFeeOutside }} />;
}
