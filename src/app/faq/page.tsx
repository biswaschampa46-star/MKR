import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import Reveal from "@/components/Reveal";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "FAQ" };

export default async function FaqPage() {
  /* Delivery fees come from admin Settings so the FAQ always matches checkout. */
  const s = await getSettings();
  const FAQS = [
    {
      q: "How do I pay for my order?",
      a: "Pay only the delivery charge in advance with bKash, Nagad or Rocket — the products are paid cash on delivery. (You can also prepay the full order if you prefer.) Place your order first — the payment instructions for your chosen method appear on the order page, and our team steps in if anything is unclear.",
    },
    {
      q: "Do you offer cash on delivery?",
      a: "Yes. Products are paid in cash on delivery; only the delivery charge is paid in advance via bKash, Nagad or Rocket.",
    },
    {
      q: "When is my payment marked as verified?",
      a: "Only after the store team checks it. We never confirm payments automatically — once your transaction is verified, your order moves from Pending Payment to Confirmed, and you can watch each step on the order page.",
    },
    {
      q: "How can I track my order?",
      a: "Use the Track Order page with your order number and the phone number from checkout. You'll see the full journey: Pending Payment → Payment Verified → Confirmed → Processing → Shipped → Delivered.",
    },
    {
      q: "Where do you deliver?",
      a: `Across Bangladesh. The delivery charge is ৳${s.deliveryFeeInside} inside Chattogram and ৳${s.deliveryFeeOutside} outside Chattogram, paid in advance with your order — the same rates shown at checkout.`,
    },
    {
      q: "Can I change or cancel my order?",
      a: "If your order has not been confirmed yet, contact us with your order number and we will do our best. Confirmed orders are already being prepared and cannot be changed.",
    },
  ];

  return (
    <div className="mx-auto max-w-[1100px] px-6 pb-28 pt-36 md:px-10 md:pt-44">
      <header className="mb-16 md:mb-20">
        <Reveal>
          <p className="label">Good to Know</p>
        </Reveal>
        <Reveal delay={90}>
          <h1 className="display-2 mt-6 text-foam">
            Questions,
            <br />
            <span className="text-stroke">answered.</span>
          </h1>
        </Reveal>
      </header>

      <div className="divide-y divide-line-soft border-y border-line-soft">
        {FAQS.map((f, i) => (
          <Reveal key={f.q} delay={i * 60}>
            <details className="group py-7">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6">
                <span className="font-display text-base font-semibold tracking-[0.02em] text-foam transition-colors group-hover:text-ice md:text-lg">
                  {f.q}
                </span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line transition-all duration-500 group-open:rotate-180 group-open:border-soft/60">
                  <ChevronDown className="h-4 w-4 text-mist" strokeWidth={1.5} />
                </span>
              </summary>
              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-mist">
                {f.a}
              </p>
            </details>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-16">
        <p className="text-sm text-mist">
          Something else on your mind?{" "}
          <Link href="/contact" className="link-line text-soft hover:text-ice">
            Contact us
          </Link>
        </p>
      </Reveal>
    </div>
  );
}
