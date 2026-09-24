import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { addresses, customers } from "@/db/schema";
import { Alert, SectionHeading } from "@/components/ui";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getCurrentCustomer } from "@/lib/auth/customer";
import { getDeliverySettings, getPaymentSettings } from "@/lib/data/content";
import { BD_DISTRICTS } from "@/lib/bd-districts";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [customer, delivery, payments] = await Promise.all([
    getCurrentCustomer(),
    getDeliverySettings(),
    getPaymentSettings(),
  ]);

  let prefill = null;
  if (customer) {
    const rows = await db
      .select()
      .from(addresses)
      .where(eq(addresses.customerId, customer.id))
      .limit(10);
    const preferred = rows.find((row) => row.isDefault) ?? rows[0];
    const profile = await db.select().from(customers).where(eq(customers.id, customer.id)).limit(1);
    prefill = {
      email: customer.email,
      fullName: preferred?.fullName ?? customer.fullName ?? "",
      phone: preferred?.phone ?? customer.phone ?? profile[0]?.phone ?? "",
      addressLine: preferred?.addressLine ?? "",
      district: preferred?.district ?? "Chattogram",
      area: preferred?.area ?? "",
      postalCode: preferred?.postalCode ?? "",
    };
  }

  return (
    <div className="mx-auto w-full max-w-[88rem] space-y-8">
      <header className="max-w-2xl">
        <p className="meta-label">Secure checkout</p>
        <h1 className="display-1 mt-4 text-[#f4faff]">Complete your order</h1>
        <p className="mt-4 text-sm leading-relaxed text-[#a8c0d5]">
          Bangladesh delivery only — fees come from the live delivery settings.
        </p>
      </header>

      {payments.configuredSource === "none" ? (
        <Alert tone="warn">
          No mobile payment numbers are configured yet. Cash on delivery works today; add bKash/Nagad/Rocket numbers in
          /admin/payments (or via PAYMENT_* environment variables) to enable prepaid options.
        </Alert>
      ) : null}

      <CheckoutForm districts={BD_DISTRICTS} zones={delivery.zones} payments={payments} prefill={prefill} />
    </div>
  );
}
