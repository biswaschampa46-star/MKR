import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, SectionHeading } from "@/components/ui";
import { getFaqSettings } from "@/lib/data/content";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers about sizing, delivery inside Bangladesh, payments and returns at MKR.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const { items } = await getFaqSettings();

  const structuredData =
    items.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: { "@type": "Answer", text: item.answer },
          })),
        }
      : null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      {structuredData ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      ) : null}
      <SectionHeading
        eyebrow="Support"
        title="Frequently asked questions"
        description="Delivery, payments and fabric care — answered in full."
      />

      {items.length === 0 ? (
        <EmptyState
          title="No FAQ entries published yet"
          description="Add questions and answers in the admin settings and they appear here immediately."
          action={
            <Link href="/contact" className="text-sm text-[#8ccbff] hover:underline">
              Ask us directly instead
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <details key={item.question} className="mkr-faq glass group rounded-3xl px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-display text-base text-[#f4faff] marker:hidden">
                {item.question}
                <svg
                  aria-hidden
                  className="mkr-faq-chevron h-4 w-4 shrink-0 text-[#8ccbff]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <p className="mt-3 whitespace-pre-line text-sm text-[#a8c0d5]">{item.answer}</p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
