import type { Metadata } from "next";
import CheckoutView from "@/components/CheckoutView";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default async function CheckoutPage() {
  /* Store settings (admin panel → Settings) are fetched server-side and passed
     down so the checkout page always shows the current delivery fees and the
     bKash / Nagad / Rocket advance-payment numbers. */
  const s = await getSettings();
  return (
    <CheckoutView
      fees={{ inside: s.deliveryFeeInside, outside: s.deliveryFeeOutside }}
      paymentNumbers={{ bkash: s.bkashNumber, nagad: s.nagadNumber, rocket: s.rocketNumber }}
    />
  );
}

