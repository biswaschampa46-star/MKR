"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Input, LinkButton, Skeleton, Textarea } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { formatTaka } from "@/lib/utils";
import type { CartView, DeliverySettings, PaymentSettings } from "@/types";

type PaymentMethod = "cod" | "bkash" | "nagad" | "rocket";
type PrepaidMethod = "bkash" | "nagad" | "rocket";

const PREPAID_LABELS: Record<PrepaidMethod, string> = { bkash: "bKash", nagad: "Nagad", rocket: "Rocket" };

export function CheckoutForm({
  districts,
  zones,
  payments,
  prefill,
}: {
  districts: { name: string; zone: string }[];
  zones: DeliverySettings["zones"];
  payments: PaymentSettings;
  prefill: {
    email: string;
    fullName: string;
    phone: string;
    addressLine: string;
    district: string;
    area: string;
    postalCode: string;
  } | null;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<CartView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [couponCode, setCouponCode] = useState("");
  const [couponPending, setCouponPending] = useState(false);
  const [couponMessage, setCouponMessage] = useState<{ tone: "info" | "success" | "error"; text: string } | null>(null);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [district, setDistrict] = useState(prefill?.district ?? "Chattogram");
  // Delivery fee is ALWAYS prepaid via mobile money (bKash/Nagad/Rocket).
  const [deliveryPrepaidMethod, setDeliveryPrepaidMethod] = useState<"bkash" | "nagad" | "rocket">("bkash");

  const zoneKey = useMemo(() => districts.find((d) => d.name === district)?.zone ?? zones[0]?.key ?? "other", [district, districts, zones]);
  const zone = zones.find((z) => z.key === zoneKey) ?? zones[0];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/checkout", { cache: "no-store" });
        const payload = (await response.json()) as { ok: boolean; cart?: CartView; error?: string };
        if (cancelled) return;
        if (!payload.ok || !payload.cart) throw new Error(payload.error ?? "Unable to load checkout.");
        setCart(payload.cart);
      } catch (cause) {
        if (!cancelled) setLoadError(cause instanceof Error ? cause.message : "Unable to load checkout.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyCoupon = async () => {
    if (!couponCode.trim() || couponPending) return;
    setCouponPending(true);
    try {
      const response = await fetch("/api/checkout/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, deliveryZone: zoneKey }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        coupon?: { valid: boolean; discount: number; message: string };
        error?: string;
      };
      if (!payload.ok || !payload.coupon) throw new Error(payload.error ?? "Coupon could not be checked.");
      setDiscount(payload.coupon.valid ? payload.coupon.discount : 0);
      setCouponMessage({ tone: payload.coupon.valid ? "success" : "error", text: payload.coupon.message });
    } catch (cause) {
      setCouponMessage({ tone: "error", text: cause instanceof Error ? cause.message : "Coupon could not be checked." });
    } finally {
      setCouponPending(false);
    }
  };

  const subTotal = cart?.subtotal ?? 0;
  const deliveryFee = zone?.fee ?? 0;
  const total = Math.max(subTotal - discount + deliveryFee, 0);
  // COD = pay products to the courier. Delivery fee is ALWAYS prepaid via
  // mobile money, so "pay now" differs by method.
  const isDeliveryPrepaidOnly = paymentMethod === "cod";
  const payNow = isDeliveryPrepaidOnly ? deliveryFee : total;
  const dueOnDelivery = isDeliveryPrepaidOnly ? Math.max(subTotal - discount, 0) : 0;
  const prepaidNumber =
    deliveryPrepaidMethod === "bkash" ? payments.bkash : deliveryPrepaidMethod === "nagad" ? payments.nagad : payments.rocket;
  const fullPrepaidNumber =
    paymentMethod === "bkash" ? payments.bkash : paymentMethod === "nagad" ? payments.nagad : paymentMethod === "rocket" ? payments.rocket : null;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    const formData = new FormData(event.currentTarget);
    const deliverySenderNumber = String(formData.get("deliverySenderNumber") ?? "").trim();
    const deliveryTransactionId = String(formData.get("deliveryTransactionId") ?? "").trim();
    if (!deliverySenderNumber || !deliveryTransactionId) {
      setError("Delivery charge prepay proof is required — enter your sending number and transaction ID.");
      setSubmitting(false);
      return;
    }
    const body = {
      email: String(formData.get("email") ?? ""),
      customerName: String(formData.get("customerName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      addressLine: String(formData.get("addressLine") ?? ""),
      district: String(formData.get("district") ?? ""),
      area: String(formData.get("area") ?? ""),
      postalCode: String(formData.get("postalCode") ?? ""),
      deliveryZone: zoneKey,
      paymentMethod,
      deliveryPrepaidMethod,
      deliverySenderNumber,
      deliveryTransactionId,
      paymentPurpose: isDeliveryPrepaidOnly ? "delivery_prepaid" : "full_prepaid",
      senderNumber: String(formData.get("senderNumber") ?? ""),
      transactionId: String(formData.get("transactionId") ?? ""),
      couponCode: couponCode.trim(),
      notes: String(formData.get("notes") ?? ""),
      saveAddress: formData.get("saveAddress") === "on",
    };

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        orderId?: string;
        orderNumber?: string;
        error?: string;
        fieldErrors?: Record<string, string[]>;
      };
      if (!payload.ok || !payload.orderId) {
        if (payload.fieldErrors) setFieldErrors(payload.fieldErrors);
        throw new Error(payload.error ?? "We could not place your order.");
      }
      router.push(`/order/${payload.orderId}?placed=1`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not place your order.");
      setSubmitting(false);
    }
  };

  if (loadError) return <Alert tone="error">{loadError}</Alert>;
  // Part 13 — while the cart request is in flight we show a skeleton, NOT
  // the empty-cart warning (that would read as "loading = empty").
  if (!cart) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]" aria-busy="true" aria-live="polite">
        <div className="space-y-6">
          {[0, 1, 2].map((section) => (
            <div key={section} className="surface space-y-4 rounded-[24px] p-[clamp(1.25rem,3vw,1.75rem)]">
              <Skeleton className="h-5 w-32" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="surface h-max space-y-4 rounded-[24px] p-[clamp(1.25rem,3vw,2rem)]">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-5 w-full" />
          ))}
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
    );
  }
  if (cart.lines.length === 0) {
    return (
      <div className="space-y-4">
        <Alert tone="warn">
          Your cart is empty — add a piece before checking out. The delivery charge ({formatTaka(zone?.fee ?? 0)} ·{" "}
          {zone?.label ?? "selected zone"}) is always prepaid via bKash/Nagad/Rocket once you add something.
        </Alert>
        <LinkButton href="/shop">Browse the collection</LinkButton>
      </div>
    );
  }

  const needsTransaction = paymentMethod !== "cod";

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <section className="surface space-y-4 rounded-[24px] p-[clamp(1.25rem,3vw,1.75rem)]">
          <h2 className="font-display text-lg text-[#f4faff]">Contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" error={fieldErrors.email?.[0]}>
              <Input name="email" type="email" required defaultValue={prefill?.email ?? ""} placeholder="you@email.com" />
            </Field>
            <Field label="Phone" hint="Bangladeshi mobile" error={fieldErrors.phone?.[0]}>
              <Input name="phone" required defaultValue={prefill?.phone ?? ""} placeholder="01712345678" />
            </Field>
          </div>
        </section>

        <section className="surface space-y-4 rounded-[24px] p-[clamp(1.25rem,3vw,1.75rem)]">
          <h2 className="font-display text-lg text-[#f4faff]">Delivery address (Bangladesh only)</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Recipient name" error={fieldErrors.customerName?.[0]}>
              <Input name="customerName" required defaultValue={prefill?.fullName ?? ""} />
            </Field>
            <Field label="District" error={fieldErrors.district?.[0]}>
              <Select name="district" value={district} onChange={(event) => setDistrict(event.target.value)}>
                {districts.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Area / Thana" hint="optional">
              <Input name="area" defaultValue={prefill?.area ?? ""} />
            </Field>
            <Field label="Postal code" hint="optional">
              <Input name="postalCode" defaultValue={prefill?.postalCode ?? ""} />
            </Field>
          </div>
          <Field label="Full address" error={fieldErrors.addressLine?.[0]}>
            <Textarea name="addressLine" rows={3} required defaultValue={prefill?.addressLine ?? ""} placeholder="House, road, landmark…" />
          </Field>
          <Field label="Order notes" hint="optional">
            <Textarea name="notes" rows={2} placeholder="Delivery instructions, preferred time…" />
          </Field>
          <label className="flex items-center gap-2 text-xs text-[#a8c0d5]">
            <input type="checkbox" name="saveAddress" className="h-4 w-4 rounded border-[#a8c0d5]/40 bg-transparent" />
            Save this address to my profile
          </label>
        </section>

        <section className="surface space-y-4 rounded-[24px] p-[clamp(1.25rem,3vw,1.75rem)]">
          <h2 className="font-display text-lg text-[#f4faff]">Payment</h2>
          <div className="grid gap-2 sm:grid-cols-4">
            {(
              [
                { value: "cod", label: "Cash on delivery" },
                { value: "bkash", label: `bKash${payments.bkash ? ` · ${payments.bkash}` : ""}` },
                { value: "nagad", label: `Nagad${payments.nagad ? ` · ${payments.nagad}` : ""}` },
                { value: "rocket", label: `Rocket${payments.rocket ? ` · ${payments.rocket}` : ""}` },
              ] as { value: PaymentMethod; label: string }[]
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPaymentMethod(option.value)}
                className={`rounded-2xl border px-3 py-3 text-left text-xs transition ${
                  paymentMethod === option.value
                    ? "border-[#8ccbff] bg-[#8ccbff]/15 text-[#f4faff]"
                    : "border-[#a8c0d5]/25 text-[#ddf3ff] hover:border-[#8ccbff]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Step 1 - ALWAYS required: prepay the delivery charge via mobile money. */}
          <div className="space-y-4 rounded-2xl border border-[#8ccbff]/30 bg-[#8ccbff]/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8ccbff]">
                Step 1 - Delivery charge, prepay now ({formatTaka(deliveryFee)})
              </p>
              <span className="rounded-full border border-[#8ccbff]/40 px-2.5 py-1 text-[10px] uppercase tracking-widest text-[#ddf3ff]">
                Required
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "bkash", label: `bKash${payments.bkash ? ` · ${payments.bkash}` : ""}` },
                  { value: "nagad", label: `Nagad${payments.nagad ? ` · ${payments.nagad}` : ""}` },
                  { value: "rocket", label: `Rocket${payments.rocket ? ` · ${payments.rocket}` : ""}` },
                ] as { value: "bkash" | "nagad" | "rocket"; label: string }[]
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDeliveryPrepaidMethod(option.value)}
                  className={`rounded-full border px-4 py-2 text-xs ${
                    deliveryPrepaidMethod === option.value
                      ? "border-[#8ccbff] bg-[#8ccbff]/15 text-[#f4faff]"
                      : "border-[#a8c0d5]/25 text-[#ddf3ff] hover:border-[#8ccbff]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Alert tone="info">
              {`Send the delivery charge (${formatTaka(deliveryFee)} - ${zone?.label ?? "selected zone"}) to ${prepaidNumber ?? "the number configured in the admin payments page"} via ${PREPAID_LABELS[deliveryPrepaidMethod]} and enter the details below. Our team verifies every transaction manually.`}
              {payments.instructions ? <span className="mt-1 block text-xs opacity-80">{payments.instructions}</span> : null}
            </Alert>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Delivery sending number" error={fieldErrors.deliverySenderNumber?.[0]}>
                <Input name="deliverySenderNumber" required placeholder="01712345678" />
              </Field>
              <Field label="Delivery transaction ID" error={fieldErrors.deliveryTransactionId?.[0]}>
                <Input name="deliveryTransactionId" required placeholder="e.g. 8N7A2K9L" />
              </Field>
            </div>
          </div>

          {/* Step 2 — product payment depends on the method above. */}
          {paymentMethod === "cod" ? (
            <Alert tone="info">
              Step 2 · Pay {formatTaka(dueOnDelivery)} in cash to the courier when your parcel arrives. Delivery charge
              already prepaid above — it is not collected again.
            </Alert>
          ) : (
            <div className="space-y-4 rounded-2xl border border-[#a8c0d5]/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a8c0d5]">
                Step 2 · Products + delivery — full prepaid ({formatTaka(total)})
              </p>
              <Alert tone="info">
                Send {formatTaka(total)} to {fullPrepaidNumber ?? "the number configured in the admin payments page"} and
                enter the transaction details below. Our team verifies every transaction manually.
              </Alert>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your sending number" error={fieldErrors.senderNumber?.[0]}>
                  <Input name="senderNumber" placeholder="01712345678" />
                </Field>
                <Field label="Transaction ID" error={fieldErrors.transactionId?.[0]}>
                  <Input name="transactionId" placeholder="e.g. 8N7A2K9L" />
                </Field>
              </div>
            </div>
          )}
        </section>
      </div>

      <aside className="surface h-max space-y-5 rounded-[24px] p-[clamp(1.25rem,3vw,2rem)] lg:sticky lg:top-28">
        <p className="meta-label">Order summary</p>
        <ul className="space-y-3">
          {cart.lines.map((line) => (
            <li key={line.id} className="flex items-start justify-between gap-3 text-sm">
              <span className="text-[#ddf3ff]">
                {line.name}
                <span className="block text-xs text-[#a8c0d5]">
                  {[line.size, line.color].filter(Boolean).join(" · ")} · ×{line.quantity}
                </span>
              </span>
              <span className="text-[#f4faff]">{formatTaka(line.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
              placeholder="Coupon code"
              aria-label="Coupon code"
            />
            <Button type="button" variant="outline" onClick={() => void applyCoupon()} disabled={couponPending} aria-busy={couponPending}>
              {couponPending ? "Checking…" : "Apply"}
            </Button>
          </div>
          {couponMessage ? <Alert tone={couponMessage.tone === "success" ? "success" : "error"}>{couponMessage.text}</Alert> : null}
        </div>

        <div className="space-y-2 border-t border-[#a8c0d5]/15 pt-4 text-sm">
          <div className="flex justify-between text-[#a8c0d5]">
            <span>Subtotal</span>
            <span className="text-[#f4faff]">{formatTaka(subTotal)}</span>
          </div>
          {discount > 0 ? (
            <div className="flex justify-between text-[#a8c0d5]">
              <span>Coupon discount</span>
              <span className="text-emerald-300">−{formatTaka(discount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-[#a8c0d5]">
            <span>Delivery · {zone?.label ?? "Selected zone"} (prepaid)</span>
            <span className="text-[#f4faff]">{formatTaka(deliveryFee)}</span>
          </div>
          <div className="flex justify-between border-t border-[#a8c0d5]/15 pt-3 text-sm">
            <span className="text-[#a8c0d5]">Pay now (delivery prepay)</span>
            <span className="text-[#8ccbff]">{formatTaka(payNow)}</span>
          </div>
          {isDeliveryPrepaidOnly ? (
            <div className="flex justify-between text-sm">
              <span className="text-[#a8c0d5]">Due on delivery (cash)</span>
              <span className="text-[#f4faff]">{formatTaka(dueOnDelivery)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-[#a8c0d5]/15 pt-3 text-base">
            <span className="text-[#f4faff]">Total</span>
            <span className="font-display text-xl text-[#f4faff]">{formatTaka(total)}</span>
          </div>
        </div>

        {error ? <Alert tone="error">{error}</Alert> : null}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Placing order…" : isDeliveryPrepaidOnly ? `Place order · prepaid ${formatTaka(payNow)}` : "Place order"}
        </Button>
        <p className="text-[11px] text-[#a8c0d5]/80">
          Stock, prices, coupons and delivery fees are re-validated on the server inside a single database transaction.
        </p>
      </aside>
    </form>
  );
}
