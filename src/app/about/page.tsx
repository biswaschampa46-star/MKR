import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import { getActiveAboutMedia } from "@/lib/about-media";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "About" };

export default async function AboutPage() {
  const media = await getActiveAboutMedia();
  return (
    <div className="mx-auto max-w-[1400px] px-6 pb-28 pt-36 md:px-10 md:pt-44">
      {/* statement */}
      <header className="max-w-5xl">
        <Reveal>
          <p className="label">About MKR</p>
        </Reveal>
        <Reveal delay={90}>
          <h1 className="display-2 mt-8 text-foam">
            Fewer, better things
            <br />
            <span className="text-stroke">for everyday life.</span>
          </h1>
        </Reveal>
      </header>

      {/* story grid */}
      <div className="mt-20 grid items-start gap-14 md:mt-28 md:grid-cols-12">
        <Reveal className="md:col-span-7">
          <div className="media-frame relative aspect-[16/11]">
            {media?.kind === "video" ? (
              <video
                src={media.url}
                className="absolute inset-0 h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                aria-label={media.alt || "About MKR story video"}
              />
            ) : (
              <Image
                src={media?.url ?? "/images/promo.jpg"}
                alt={media?.alt || "MKR pieces in calm blue morning light"}
                fill
                sizes="(max-width: 768px) 100vw, 58vw"
                className="object-cover"
              />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(7,26,43,0.45)] to-transparent" aria-hidden="true" />
          </div>
        </Reveal>
        <Reveal delay={140} className="md:col-span-4 md:col-start-9 md:pt-10">
          <div className="hairline mb-8 w-24" aria-hidden="true" />
          <p className="body-lead">
            MKR is a small, considered wardrobe of everyday pieces. We
            believe a wardrobe is built from a few pieces chosen carefully —
            not many things chosen quickly.
          </p>
          <p className="mt-6 text-sm leading-relaxed text-mist/80">
            Every product is photographed as it is, described as it is, and
            priced plainly in taka. When something sells out, it leaves. When
            something earns its place, it stays.
          </p>
        </Reveal>
      </div>

      {/* principles */}
      <div className="mt-28 grid gap-12 border-t border-line-soft pt-16 md:grid-cols-3">
        {[
          {
            n: "i.",
            title: "Slow selection",
            text: "We would rather list eight pieces we love than eight hundred we tolerate.",
          },
          {
            n: "ii.",
            title: "Honest commerce",
            text: "Clear prices, cash on delivery for products, advance payment for the delivery charge, and an order status that tells the truth at every step.",
          },
          {
            n: "iii.",
            title: "Calm design",
            text: "From the packaging to this website — less noise, more space.",
          },
        ].map((p, i) => (
          <Reveal key={p.n} delay={i * 100}>
            <p className="font-display text-lg text-soft/80">{p.n}</p>
            <h2 className="font-display mt-5 text-sm font-semibold uppercase tracking-[0.28em] text-foam">
              {p.title}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-mist">{p.text}</p>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-28">
        <div className="media-frame card-glass flex flex-col items-start justify-between gap-8 rounded-3xl p-10 md:flex-row md:items-center md:p-16">
          <div>
            <p className="label label--bright">The Catalogue</p>
            <h2 className="display-3 mt-5 max-w-xl text-foam">
              See what earned its place.
            </h2>
          </div>
          <Link href="/shop" className="btn btn-solid shrink-0">
            Explore Shop <ArrowRight className="btn-arrow h-3.5 w-3.5" />
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
