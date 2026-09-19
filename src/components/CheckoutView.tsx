"use client";

import { useMemo, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ShoppingBag,
  Smartphone,
  Loader2,
  TicketPercent,
  BadgeCheck,
  Truck,
  Banknote,
  Wallet,
  X,
} from "lucide-react";
import { useCart, useCartTotals, useHydrated } from "@/lib/store";
import { bdt } from "@/lib/format";
import { variantLabel } from "@/lib/variant-attributes";
import { useAuth } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";
import { fetchProfile, fetchAddresses, type CustomerAddress } from "@/lib/customer";
import { trackTask } from "@/lib/loading-store";
import { extractDistrict } from "@/lib/districts";
import DistrictSelect from "@/components/DistrictSelect";

type CheckoutSettings = {
  /** Delivery fees from admin Settings (BDT). */
  fees: { inside: number; outside: number };
  /** Advance-payment numbers from admin Settings (bKash / Nagad / Rocket). */
  paymentNumbers: { bkash: string; nagad: string; rocket: string };
};

/* Fallbacks used only when no server settings were passed in. */
const FEES = { inside: 70, outside: 130 };
const NO_NUMBERS = { bkash: "", nagad: "", rocket: "" };

const METHODS = [
  { id: "bkash", label: "bKash", hint: "Send Money from your bKash app", logo: "/images/payments/bkash.png" },
  { id: "nagad", label: "Nagad", hint: "Send Money from your Nagad app", logo: "/images/payments/nagad.png" },
  { id: "rocket", label: "Rocket", hint: "Send Money from your Rocket app", logo: "/images/payments/rocket.png" },
] as const;

type Fields = {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  notes: string;
  senderNumber: string;
  transactionId: string;
};

type AppliedCoupon = { code: string; discount: number };

export default function CheckoutView({
  fees = FEES,
  paymentNumbers = NO_NUMBERS,
}: CheckoutSettings) {
  const hydrated = useHydrated();
  const { items, subtotal } = useCartTotals();
  const clear = useCart((s) => s.clear);
  const router = useRouter();

  const [fields, setFields] = useState<Fields>({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    notes: "",
    senderNumber: "",
    transactionId: "",
  });
  const [method, setMethod] = useState("bkash");
  const [paymentPurpose, setPaymentPurpose] = useState<"delivery_charge" | "full_order">("delivery_charge");
  const [state, setState] = useState<"idle" | "placing">("idle");
  const [error, setError] = useState("");
  const [clientRequestId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  );

  /* ———— coupon state ———— */
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponMsg, setCouponMsg] = useState("");
  const [couponState, setCouponState] = useState<"idle" | "checking">("idle");

  /* ———— customer account: prefill name/phone/email + offer saved addresses ———— */
  const accountUser = useAuth((s) => s.user);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [prefillDone, setPrefillDone] = useState(false);

  useEffect(() => {
    if (!accountUser || prefillDone) return;
    setPrefillDone(true);
    (async () => {
      const [profile, addresses] = await trackTask(Promise.all([
        fetchProfile(accountUser.id),
        fetchAddresses(accountUser.id),
      ]));
      setSavedAddresses(addresses);
      const fav = addresses.find((a) => a.is_default) ?? addresses[0] ?? null;
      setSelectedAddressId(fav ? fav.id : "");
      setFields((f) => ({
        ...f,
        name: f.name || profile?.full_name || accountUser.user_metadata?.full_name || accountUser.user_metadata?.name || "",
        phone: f.phone || profile?.phone || "",
        email: f.email || profile?.email || accountUser.email || "",
        address: f.address || fav?.address || "",
        city: f.city || (fav ? (extractDistrict(`${fav.upazila}, ${fav.district}`) ?? extractDistrict(fav.district) ?? "") : ""),
      }));
    })();
  }, [accountUser, prefillDone]);

  const applyAddress = (id: string) => {
    setSelectedAddressId(id);
    const a = savedAddresses.find((x) => x.id === id);
    if (!a) return;
    setFields((f) => ({
      ...f,
      name: a.full_name,
      phone: a.phone,
      address: a.address,
      city: extractDistrict(`${a.upazila}, ${a.district}`) ?? extractDistrict(a.district) ?? f.city,
      senderNumber: f.senderNumber,
      transactionId: f.transactionId,
    }));
  };

  const insideCtg = /chittagong|chattogram|chatgaon|ctg/i.test(fields.city.trim());
  const cityFilled = fields.city.trim().length >= 2;
  const shipping = !cityFilled ? fees.outside : insideCtg ? fees.inside : fees.outside;

  /* Advance-payment number of the currently selected method (admin Settings). */
  const selectedNumber = (paymentNumbers as Record<string, string>)[method]?.trim() ?? "";

  const discount = coupon ? Math.min(coupon.discount, subtotal) : 0;
  const productTotal = Math.max(0, subtotal - discount);
  const grandTotal = productTotal + shipping;
  const amountDueNow = paymentPurpose === "full_order" ? grandTotal : shipping;
  const codAmount = paymentPurpose === "full_order" ? 0 : productTotal;

  const summary = useMemo(
    () => ({ subtotal, discount, productTotal, shipping, grandTotal, amountDueNow, codAmount }),
    [subtotal, discount, productTotal, shipping, grandTotal, amountDueNow, codAmount],
  );

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFields((f) => ({ ...f, [k]: e.target.value }));

  const setDistrict = (district: string) => setFields((f) => ({ ...f, city: district }));

  /* ———— coupon apply ———— */
  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code || subtotal <= 0) return;
    setCouponState("checking");
    setCouponMsg("");
    try {
      const res = await trackTask(fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal, phone: fields.phone }),
      }));
      const data = (await res.json()) as { ok: boolean; message?: string; code?: string; discount?: number };
      if (data.ok && data.code && typeof data.discount === "number") {
        setCoupon({ code: data.code, discount: data.discount });
        setCouponMsg("");
        setCouponInput("");
      } else {
        setCoupon(null);
        setCouponMsg(data.message ?? "This coupon is not valid.");
      }
    } catch {
      setCouponMsg("Could not check the coupon. Try again.");
    } finally {
      setCouponState("idle");
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponMsg("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setState("placing");
    try {
      let userId: string | null = null;
      let accessToken: string | null = null;
      if (supabase && accountUser) {
        const { data } = await supabase.auth.getSession();
        accessToken = data.session?.access_token ?? null;
        userId = accountUser.id;
      }
      const res = await trackTask(fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fields,
          method,
          paymentPurpose,
          couponCode: coupon?.code ?? "",
          clientRequestId,
          items: items.map((i) => ({
            productId: i.productId,
            variant: i.variant,
            qty: i.qty,
            ...(i.attributes && i.attributes.length
              ? { attributes: i.attributes.filter((a) => a.value).map((a) => ({ label: a.label, value: a.value })) }
              : {}),
          })),
          userId,
          accessToken,
        }),
      }));
      const data = (await res.json()) as { ok: boolean; message?: string; orderId?: string };
      if (!res.ok || !data.ok || !data.orderId) {
        setError(data.message ?? "We could not place your order. Please try again.");
        setState("idle");
        return;
      }
      clear();
      router.push(`/order/${data.orderId}?placed=1`);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setState("idle");
    }
  };

  /* ———— empty cart state (post-hydration) ———— */
  if (hydrated && items.length === 0) {
    return (
      <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-7 px-6 pb-32 pt-48 text-center md:px-10">
        <ShoppingBag className="h-9 w-9 text-mist/40" strokeWidth={1} />
        <div>
          <p className="font-display text-xl font-bold uppercase tracking-[0.14em] text-foam">
            Your cart is empty
          </p>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-mist">
            Add something to your cart before checking out.
          </p>
        </div>
        <Link href="/shop" className="btn btn-solid">
          Explore Shop <ArrowRight className="btn-arrow h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-6 pb-28 pt-36 md:px-10 md:pt-44">
      <header className="mb-14 md:mb-20">
        <p className="label">Almost There</p>
        <h1 className="display-2 mt-6 text-foam">Checkout</h1>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-mist">
          Delivery inside Bangladesh only. Pay the delivery charge now with bKash,
          Nagad or Rocket — then pay for your products on delivery, or upfront.
        </p>
      </header>

      <form onSubmit={submit} className="grid gap-16 lg:grid-cols-12">
        {/* ———— form column ———— */}
        <div className="space-y-12 lg:col-span-7">
          {/* contact */}
          <fieldset>
            <legend className="font-display mb-7 text-xs font-semibold uppercase tracking-[0.28em] text-foam">
              01 · Contact
            </legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="co-name" className="label mb-2.5 block !tracking-[0.2em]">Full name *</label>
                <input id="co-name" required autoComplete="name" className="field" placeholder="Your name" value={fields.name} onChange={set("name")} />
              </div>
              <div>
                <label htmlFor="co-phone" className="label mb-2.5 block !tracking-[0.2em]">Phone *</label>
                <input id="co-phone" required autoComplete="tel" inputMode="tel" className="field" placeholder="01712345678" value={fields.phone} onChange={set("phone")} />
              </div>
              <div>
                <label htmlFor="co-email" className="label mb-2.5 block !tracking-[0.2em]">Email <span className="normal-case tracking-normal text-mist/50">(optional)</span></label>
                <input id="co-email" type="email" autoComplete="email" className="field" placeholder="you@example.com" value={fields.email} onChange={set("email")} />
              </div>
            </div>
          </fieldset>

          {/* saved address selector (signed-in customers) */}
          {accountUser && savedAddresses.length > 0 && (
            <fieldset>
              <legend className="font-display mb-7 text-xs font-semibold uppercase tracking-[0.28em] text-foam">
                Saved addresses
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {savedAddresses.map((a) => (
                  <label
                    key={a.id}
                    className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors ${
                      selectedAddressId === a.id ? "border-soft/40 bg-soft/10" : "border-line-soft hover:bg-white/5"
                    }`}
                  >
                    <input
                      type="radio"
                      name="saved-address"
                      className="h-4 w-4 accent-soft"
                      checked={selectedAddressId === a.id}
                      onChange={() => applyAddress(a.id)}
                    />
                    <span className="min-w-0 text-[0.72rem] leading-relaxed text-mist">
                      <span className="block font-semibold uppercase tracking-[0.08em] text-soft">{a.label}</span>
                      <span className="mt-1 block text-foam">{a.full_name}</span>
                      <span className="block">{a.address}</span>
                      <span className="block">{[a.upazila, a.district, a.division].filter(Boolean).join(", ")} · {a.phone}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {/* delivery */}
          <fieldset>
            <legend className="font-display mb-7 text-xs font-semibold uppercase tracking-[0.28em] text-foam">
              02 · Delivery
            </legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="co-address" className="label mb-2.5 block !tracking-[0.2em]">Address *</label>
                <input id="co-address" required autoComplete="street-address" className="field" placeholder="House, road, area" value={fields.address} onChange={set("address")} />
              </div>
              <div>
                <label htmlFor="co-city" className="label mb-2.5 block !tracking-[0.2em]">City / District *</label>
                <DistrictSelect id="co-city" required value={fields.city} onChange={setDistrict} />
                {cityFilled && (
                  <p className={`mt-2.5 flex items-center gap-1.5 text-[0.72rem] ${insideCtg ? "text-soft" : "text-mist"}`}>
                    <Truck className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {insideCtg
                      ? `Inside Chattogram — delivery charge ${bdt(fees.inside)}`
                      : `Outside Chattogram — delivery charge ${bdt(fees.outside)}`}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="co-notes" className="label mb-2.5 block !tracking-[0.2em]">Notes <span className="normal-case tracking-normal text-mist/50">(optional)</span></label>
                <input id="co-notes" className="field" placeholder="Anything we should know" value={fields.notes} onChange={set("notes")} />
              </div>
            </div>
          </fieldset>

          {/* coupon */}
          <fieldset>
            <legend className="font-display mb-7 text-xs font-semibold uppercase tracking-[0.28em] text-foam">
              03 · Coupon
            </legend>
            {coupon ? (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-soft/40 bg-soft/10 p-5">
                <div className="flex items-center gap-3">
                  <BadgeCheck className="h-5 w-5 shrink-0 text-soft" strokeWidth={1.5} />
                  <div>
                    <p className="font-display text-sm font-bold tracking-[0.08em] text-ice">{coupon.code}</p>
                    <p className="mt-0.5 text-xs text-mist">Discount applied: −{bdt(coupon.discount)}</p>
                  </div>
                </div>
                <button type="button" onClick={removeCoupon} aria-label="Remove coupon" className="rounded-lg p-2 text-mist transition-colors hover:bg-white/5 hover:text-foam">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-line p-5">
                <p className="flex items-center gap-2 text-sm text-foam">
                  <TicketPercent className="h-4 w-4 text-soft" strokeWidth={1.5} />
                  Have a coupon?
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="field flex-1 uppercase tracking-[0.1em]"
                    aria-label="Coupon code"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={couponState === "checking" || !couponInput.trim() || subtotal <= 0}
                    className="btn btn-line shrink-0 !px-6"
                  >
                    {couponState === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Coupon"}
                  </button>
                </div>
                {couponMsg && <p className="mt-3 text-xs leading-relaxed text-amber-200/90">{couponMsg}</p>}
              </div>
            )}
          </fieldset>

          {/* payment */}
          <fieldset>
            <legend className="font-display mb-7 text-xs font-semibold uppercase tracking-[0.28em] text-foam">
              04 · Payment
            </legend>

            {/* how do you want to pay? */}
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Payment option">
              <button
                type="button"
                role="radio"
                aria-checked={paymentPurpose === "delivery_charge"}
                onClick={() => setPaymentPurpose("delivery_charge")}
                className={`group relative rounded-2xl border p-5 text-left transition-all duration-300 ${
                  paymentPurpose === "delivery_charge"
                    ? "border-soft/70 bg-soft/10 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.65)]"
                    : "border-line hover:border-soft/40 hover:bg-white/[0.03]"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <Banknote className="h-5 w-5 text-soft" strokeWidth={1.5} />
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${paymentPurpose === "delivery_charge" ? "border-soft bg-soft/20" : "border-line group-hover:border-soft/40"}`}>
                    {paymentPurpose === "delivery_charge" && <span className="h-2 w-2 rounded-full bg-soft" />}
                  </span>
                </span>
                <span className={`font-display mt-4 block text-sm font-bold tracking-[0.08em] ${paymentPurpose === "delivery_charge" ? "text-ice" : "text-foam"}`}>
                  Delivery charge now + Cash on Delivery
                </span>
                <span className="mt-2 block text-[0.72rem] leading-relaxed text-mist/80">
                  Pay only the <span className="text-ice">{bdt(shipping)}</span> delivery charge now.
                  Pay the <span className="text-ice">{bdt(productTotal)}</span> product amount in cash when your order arrives.
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={paymentPurpose === "full_order"}
                onClick={() => setPaymentPurpose("full_order")}
                className={`group relative rounded-2xl border p-5 text-left transition-all duration-300 ${
                  paymentPurpose === "full_order"
                    ? "border-soft/70 bg-soft/10 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.65)]"
                    : "border-line hover:border-soft/40 hover:bg-white/[0.03]"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <Wallet className="h-5 w-5 text-soft" strokeWidth={1.5} />
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${paymentPurpose === "full_order" ? "border-soft bg-soft/20" : "border-line group-hover:border-soft/40"}`}>
                    {paymentPurpose === "full_order" && <span className="h-2 w-2 rounded-full bg-soft" />}
                  </span>
                </span>
                <span className={`font-display mt-4 block text-sm font-bold tracking-[0.08em] ${paymentPurpose === "full_order" ? "text-ice" : "text-foam"}`}>
                  Pay everything now
                </span>
                <span className="mt-2 block text-[0.72rem] leading-relaxed text-mist/80">
                  Pay the full <span className="text-ice">{bdt(grandTotal)}</span> (products + delivery) upfront.
                  Nothing to pay on delivery.
                </span>
              </button>
            </div>

            {/* gateway method */}
            <p className="label mt-8 mb-3.5 block !tracking-[0.2em]">Payment method</p>
            <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Payment method">
              {METHODS.map((m) => {
                const active = method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setMethod(m.id)}
                    className={`group relative flex flex-col rounded-2xl border p-5 text-left transition-all duration-300 ${
                      active
                        ? "border-soft/70 bg-soft/10 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.65)]"
                        : "border-line hover:border-soft/40 hover:bg-white/[0.03]"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="grid h-9 w-16 place-items-center rounded-lg bg-white px-2 shadow-sm">
                        <Image src={m.logo} alt={m.label} width={48} height={20} className="h-5 w-auto object-contain" />
                      </span>
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors duration-300 ${active ? "border-soft bg-soft/20" : "border-line group-hover:border-soft/40"}`}>
                        {active && <span className="h-2 w-2 rounded-full bg-soft" />}
                      </span>
                    </span>
                    <span className={`font-display mt-4 text-sm font-bold tracking-[0.08em] ${active ? "text-ice" : "text-foam"}`}>
                      {m.label}
                    </span>
                    <span className="mt-2 block text-[0.72rem] leading-relaxed text-mist/80">{m.hint}</span>
                    {((paymentNumbers as Record<string, string>)[m.id] ?? "").trim() && (
                      <span className="mt-2 block break-all font-mono text-[0.72rem] font-semibold tracking-wide text-ice">
                        {((paymentNumbers as Record<string, string>)[m.id]).trim()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedNumber && (
              <div className="mt-5 flex items-start gap-4 rounded-2xl border border-soft/60 bg-soft/10 px-6 py-5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.65)]">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-soft/15">
                  <Smartphone className="h-5 w-5 text-soft" strokeWidth={1.5} />
                </span>
                <div className="min-w-0">
                  <p className="label !tracking-[0.2em]">Advance payment</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foam">
                    Send your advance payment to{" "}
                    <span className="mx-0.5 inline-block break-all rounded-lg bg-deep/70 px-2.5 py-1 font-mono text-base font-bold tracking-wide text-ice">
                      {selectedNumber}
                    </span>{" "}
                    <span className="text-mist">({METHODS.find((m) => m.id === method)?.label})</span> — then
                    enter the Transaction ID below.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="co-sender" className="label mb-2.5 block !tracking-[0.2em]">
                  Your {METHODS.find((m) => m.id === method)?.label} number <span className="normal-case tracking-normal text-mist/50">(for the advance payment)</span>
                </label>
                <input id="co-sender" inputMode="tel" className="field" placeholder="01XXXXXXXXX" value={fields.senderNumber} onChange={set("senderNumber")} />
              </div>
              <div>
                <label htmlFor="co-trx" className="label mb-2.5 block !tracking-[0.2em]">
                  Transaction ID <span className="normal-case tracking-normal text-mist/50">(if already paid)</span>
                </label>
                <input id="co-trx" className="field" placeholder="e.g. 9HXK2…" value={fields.transactionId} onChange={set("transactionId")} />
              </div>
            </div>

            <p className="mt-6 flex gap-3 rounded-2xl border border-line-soft bg-deep/40 p-5 text-xs leading-relaxed text-mist">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-soft/80" strokeWidth={1.5} />
              Place your order first — payment instructions for your chosen method
              appear on the order page. Your order is confirmed once the store
              verifies your advance payment.
            </p>
          </fieldset>
        </div>

        {/* ———— summary column ———— */}
        <aside className="lg:col-span-4 lg:col-start-9">
          <div className="card-glass rounded-2xl p-8 lg:sticky lg:top-28">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.28em] text-foam">
              Order Summary
            </p>
            <ul className="mt-6 space-y-5">
              {items.map((i) => (
                <li key={i.key} className="flex items-center gap-4">
                  <div className="media-frame relative h-14 w-11 shrink-0">
                    <Image src={i.image || "/images/mkr-logo.jpg"} alt={i.name} fill sizes="44px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display truncate text-[0.8rem] font-semibold uppercase tracking-[0.05em] text-foam">
                      {i.name}
                    </p>
                    <p className="mt-1 text-[0.72rem] text-mist/70">
                      {variantLabel(i)} · ×{i.qty}
                    </p>
                  </div>
                  <p className="text-sm text-ice">{bdt(i.price * i.qty)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-7 space-y-3.5 border-t border-line-soft pt-6 text-sm">
              <div className="flex justify-between">
                <dt className="text-mist">Subtotal</dt>
                <dd className="text-foam">{bdt(summary.subtotal)}</dd>
              </div>
              {summary.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-mist">Coupon {coupon?.code ? `(${coupon.code})` : ""}</dt>
                  <dd className="text-soft">−{bdt(summary.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-mist">Product total</dt>
                <dd className="text-foam">{bdt(summary.productTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-mist">Delivery charge {cityFilled ? (insideCtg ? "(inside Chattogram)" : "(outside Chattogram)") : ""}</dt>
                <dd className="text-foam">{bdt(summary.shipping)}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-line-soft pt-4">
                <dt className="label">Grand Total</dt>
                <dd className="font-display text-2xl font-bold text-ice">{bdt(summary.grandTotal)}</dd>
              </div>
            </dl>

            {/* payment plan breakdown */}
            <div className="mt-6 rounded-2xl border border-soft/25 bg-deep/50 p-5">
              <p className="label !tracking-[0.2em]">
                {paymentPurpose === "full_order" ? "Full prepayment" : "Delivery charge prepaid + product COD"}
              </p>
              <dl className="mt-3.5 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-mist">
                    Pay now ({METHODS.find((m) => m.id === method)?.label})
                    {selectedNumber && (
                      <span className="mt-1 block font-mono text-[0.68rem] font-semibold tracking-wide text-soft">
                        → {selectedNumber}
                      </span>
                    )}
                  </dt>
                  <dd className="font-display font-semibold text-ice">{bdt(summary.amountDueNow)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-mist">Cash on delivery</dt>
                  <dd className="text-foam">{bdt(summary.codAmount)}</dd>
                </div>
              </dl>
            </div>

            {error && (
              <p className="mt-5 rounded-xl border border-amber-200/30 bg-amber-200/10 p-4 text-xs leading-relaxed text-amber-100/90">
                {error}
              </p>
            )}

            <button type="submit" disabled={state === "placing" || items.length === 0} aria-busy={state === "placing"} className="btn btn-solid mt-7 w-full">
              {state === "placing" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Placing order…
                </>
              ) : (
                <>
                  Place Order <ArrowRight className="btn-arrow h-3.5 w-3.5" />
                </>
              )}
            </button>
            <p className="mt-5 text-center text-[0.7rem] leading-relaxed text-mist/60">
              Bangladesh delivery only · advance payment via bKash / Nagad / Rocket
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
