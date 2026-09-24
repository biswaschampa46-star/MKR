import Link from "next/link";
import { Fragment, Suspense } from "react";
import { ArrowDown, ArrowRight, Leaf, ShieldCheck, Truck } from "lucide-react";
import { Badge, ErrorState, LinkButton, ProductGridSkeleton, SectionHeading } from "@/components/ui";
import { MediaImage } from "@/components/media-image";
import { MobileHeroImage } from "@/components/mobile-hero-image";
import { HeroMedia, type HeroMediaSource } from "@/components/hero-media";
import { ProductCard } from "@/components/product/product-card";
import { getFeaturedProducts, listCategories, listProducts } from "@/lib/data/catalog";
import { heroMediaKind, listAboutSections, listHeroSlides } from "@/lib/data/media";
import { getCurrentCustomer } from "@/lib/auth/customer";
import { listWishlist } from "@/lib/data/commerce";
import { getContactSettings, getMobileHeroImage } from "@/lib/data/content";

export const dynamic = "force-dynamic";

/* ══════════════════════════════  HERO  ══════════════════════════════
   Full-bleed cinematic campaign opening: edge-to-edge admin media under a
   midnight gradient, oversized asymmetric editorial type, scroll indicator. */
async function Hero() {
  const slides = await listHeroSlides(true);
  const active = slides[0];
  // Kind per slot: the asset's real kind (magic-byte verified at upload) is
  // authoritative — hero_slides.media_type is only the legacy fallback, so a
  // stale type can never blank the stage (see heroMediaKind).
  // Responsive hero video: the slide row now carries BOTH compositions —
  // desktop (media_id, 16:9) and phone (mobile_*, admin-selected ratio).
  // HeroMedia picks the right one client-side; only that file downloads.
  const heroSource: HeroMediaSource = {
    desktopUrl: active?.mediaUrl ?? null,
    desktopKind: heroMediaKind(active?.mediaKind, active?.mediaType),
    desktopAlt: active?.heading ?? "MKR hero",
    mobileUrl: active?.mobileMediaUrl ?? null,
    mobileKind: heroMediaKind(active?.mobileMediaKind, active?.mobileMediaType),
    mobileAlt: `${active?.heading ?? "MKR hero"} (mobile)`,
    mobileRatio: active?.mobileAspectRatio ?? "9:16",
    mobileIsActive: active?.mobileIsActive ?? true,
  };
  // MOBILE HERO: one admin-uploaded garment shot shown only on phones —
  // the desktop peek composition never mounts there (SmoothScroll early-
  // returns). Unset → static gradient fallback (never the desktop stack).
  const mobileHero = await getMobileHeroImage();

  return (
    <section className="full-bleed relative -mt-6 flex min-h-[92svh] flex-col justify-end overflow-hidden">
      {/* Media stage — always the admin's real hero asset, never fake media.
          Responsive video system: desktop 16:9 / mobile portrait ratio,
          one element, viewport-picked source (see HeroMedia). */}
      <div className="absolute inset-0">
        {active && (active.mediaUrl || active.mobileMediaUrl) ? (
          <HeroMedia source={heroSource} />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(120%_90%_at_70%_10%,#12344d_0%,#0a1d2e_45%,#050b14_100%)]" />
        )}
        {/* Cinematic grade: tonal base → floor shadow for type legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050b14] via-[#050b14]/55 to-[#050b14]/25" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050b14]/80 via-transparent to-transparent" />

        {/* Mobile-only single garment image (hidden ≥769px by CSS so desktop
            keeps its full-bleed hero + floating peek composition untouched). */}
        {mobileHero.url ? (
          <div className="mobile-hero-mount absolute inset-0">
            <MobileHeroImage src={mobileHero.url} alt={mobileHero.altText ?? "MKR hero garment"} />
          </div>
        ) : null}
      </div>

      {/* Editorial composition — bottom-anchored, asymmetric */}
      <div className="relative mx-auto w-full max-w-[88rem] px-[var(--gutter)] pb-[clamp(3rem,7vw,5.5rem)]">
        <div className="max-w-[62rem]">
          <p
            className="hero-fade eyebrow mb-[clamp(1.25rem,3vw,2rem)]"
            style={{ "--line-delay": "150ms" } as React.CSSProperties}
          >
            {active?.eyebrow ?? "MKR — Casual Threads & Style"}
          </p>

          <h1 className="display-hero text-[#f4faff]">
            <span className="hero-line" style={{ "--line-delay": "300ms" } as React.CSSProperties}>
              <span>{active?.heading ?? "Dress with"}</span>
            </span>
            <span
              className="hero-line pl-[clamp(1.5rem,8vw,7rem)] text-[#8ccbff]"
              style={{ "--line-delay": "450ms" } as React.CSSProperties}
            >
              <span>{active ? null : "with intention."}</span>
            </span>
          </h1>
          {active ? (
            <span className="sr-only">{active.heading}</span>
          ) : null}

          {(active?.subheading ?? !active) && (
            <p
              className="hero-fade mt-[clamp(1.5rem,3vw,2.25rem)] max-w-xl text-sm leading-relaxed text-[#c9d9e8] sm:text-base"
              style={{ "--line-delay": "620ms" } as React.CSSProperties}
            >
            {active?.subheading ??
              "Everyday essentials cut from considered fabric — designed in Dhaka, delivered nationwide with cash on delivery."}
            </p>
          )}

          <div
            className="hero-fade mt-[clamp(2rem,4vw,3rem)] flex flex-wrap items-center gap-[clamp(0.75rem,2vw,1.25rem)]"
            style={{ "--line-delay": "760ms" } as React.CSSProperties}
          >
            <LinkButton href={active?.ctaHref || "/shop"} size="lg">
              {active?.ctaLabel || "Shop the collection"} <ArrowRight className="h-4 w-4" />
            </LinkButton>
            <LinkButton href="/about" variant="ghost" size="lg" className="px-2">
              Our story
            </LinkButton>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="hero-fade absolute bottom-[clamp(3rem,7vw,5.5rem)] right-[var(--gutter)] hidden flex-col items-center gap-3 md:flex"
          style={{ "--line-delay": "1000ms" } as React.CSSProperties}
        >
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#a8c0d5] [writing-mode:vertical-rl]">Scroll</span>
          <span className="relative h-14 w-px overflow-hidden bg-[#a8c0d5]/20">
            <span className="scroll-indicator-line absolute inset-0 bg-[#8ccbff]" />
          </span>
          <ArrowDown className="h-3.5 w-3.5 text-[#8ccbff]" />
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════  MKR MARQUEE  ═══════════════════════
   Oversized editorial band — alternating filled/outlined wordmarks. */
function Marquee() {
  const phrases = ["MKR", "Casual Threads", "Everyday Essentials", "New Season", "Made for Presence"];
  const strip = (key: string) => (
    <div key={key} className="flex shrink-0 items-center" aria-hidden={key === "b"}>
      {phrases.map((phrase, index) => (
        <span key={`${key}-${index}`} className="flex items-center">
          <span
            className={`display-2 whitespace-nowrap px-[clamp(1.5rem,4vw,3.5rem)] ${
              index % 2 === 1 ? "text-outline" : "text-[#ddf3ff]/80"
            }`}
          >
            {phrase}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#4da8ff]/50" />
        </span>
      ))}
    </div>
  );

  return (
    <section className="marquee-paused full-bleed overflow-hidden border-y border-[#a8c0d5]/10 bg-[#050b14]/70 py-[clamp(1.25rem,3vw,2rem)]">
      <div className="marquee-track">
        {strip("a")}
        {strip("b")}
      </div>
    </section>
  );
}

/* ═══════════════════  EDITORIAL BRAND STATEMENT  ═══════════════════
   Magazine-spread moment: oversized statement, small supporting note. */
function BrandStatement() {
  // Word tokens for the statement line. Colour treatment travels with each word
  // so the entrance can be driven one span at a time (see .statement-word in
  // globals.css) — the sentence still reads as plain, selectable text.
  const words: { text: string; tone?: string }[] = [
    { text: "Everyday" },
    { text: "clothing," },
    { text: "considered", tone: "text-outline" },
    { text: "like" },
    { text: "occasionwear" },
    { text: "—" },
    { text: "built" },
    { text: "for" },
    { text: "presence,", tone: "gradient-text statement-sheen" },
    { text: "not" },
    { text: "attention." },
  ];

  return (
    <section data-peek-zone className="relative mx-auto w-full max-w-[88rem] px-[var(--gutter)] py-[clamp(4rem,9vw,8rem)]">
      {/* Ghost wordmark: sits in the mobile dock band behind the floating
          garments (hidden on desktop — see .peek-watermark in globals). */}
      <span aria-hidden className="peek-watermark font-display pointer-events-none absolute left-1/2 top-[clamp(48px,14vw,110px)] -translate-x-1/2 select-none">
        MKR
      </span>
      <div data-reveal suppressHydrationWarning className="max-w-[56rem]">
        {/* Editorial colophon: index + hairline + provenance line. */}
        <div className="mb-8 flex items-center gap-4">
          <span className="spec-index">Nº 01</span>
          <span aria-hidden className="h-px flex-1 bg-[#a8c0d5]/15" />
          <span className="spec-index">Est. Dhaka — MMXXIV</span>
        </div>
        <p className="eyebrow mb-8">The MKR standard</p>
        <p className="display-1 text-[#f4faff]">
          {words.map((word, index) => (
            <Fragment key={`${index}-${word.text}`}>
              {/* A real space text node keeps wrapping, selection and screen
                  reader output byte-identical to the plain sentence. */}
              {index > 0 ? " " : null}
              <span
                className="statement-word"
                style={{ "--word-delay": `${120 + index * 55}ms` } as React.CSSProperties}
              >
                <span className={word.tone}>{word.text}</span>
              </span>
            </Fragment>
          ))}
        </p>
      </div>
      <div data-reveal suppressHydrationWarning style={{ "--reveal-delay": "160ms" } as React.CSSProperties} className="mt-10 flex max-w-xl flex-col gap-3 text-sm leading-relaxed text-[#a8c0d5]">
        <p>
          MKR is a casual threads label from Bangladesh. Fabric choice, fit and finishing are decided
          before a single piece is cut — so what reaches you feels <em className="serif-accent">resolved, not rushed</em>.
        </p>
        <Link
          href="/about"
          className="group mt-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#8ccbff]"
        >
          Read the story
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}

/* ═══════════════════════  FEATURE STRIP  ═══════════════════════ */
function FeatureStrip() {
  const features = [
    { icon: <Truck className="h-5 w-5" />, title: "Nationwide delivery", copy: "Chattogram and all 64 districts — flat, honest delivery fees on every order." },
    { icon: <ShieldCheck className="h-5 w-5" />, title: "COD & prepaid", copy: "bKash, Nagad and Rocket send money with manual verification." },
    { icon: <Leaf className="h-5 w-5" />, title: "Considered fabric", copy: "Breathable weaves selected for Bangladeshi weather." },
  ];
  return (
    <section className="full-bleed border-y border-[#a8c0d5]/10 bg-[#0a1d2e]/40">
      <div className="mx-auto grid w-full max-w-[88rem] gap-px overflow-hidden px-[var(--gutter)] py-[clamp(2.5rem,5vw,4rem)] sm:grid-cols-3">
        {features.map((item, index) => (
          <div
            key={item.title}
            data-reveal
            suppressHydrationWarning
            style={{ "--reveal-delay": `${index * 110}ms` } as React.CSSProperties}
            className="px-2 py-4 sm:px-8"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-[#4da8ff]/25 bg-[#4da8ff]/10 text-[#8ccbff]">
              {item.icon}
            </div>
            <h3 className="font-display text-base text-[#f4faff]">{item.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[#a8c0d5]">{item.copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════  COLLECTION INDEX (categories)  ═══════════════════
   Large editorial panels from real Supabase categories. */
async function CollectionIndex() {
  const categories = await listCategories();
  if (categories.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-[88rem] px-[var(--gutter)]">
      <SectionHeading
        eyebrow="Collections"
        title="Shop by category"
        description="Live collections, straight from the catalogue."
        action={<LinkButton href="/shop" variant="ghost" size="sm">View all</LinkButton>}
      />
      <div className="grid gap-4 md:grid-cols-2">
        {categories.slice(0, 4).map((category, index) => (
          <Link
            key={category.id}
            href={`/shop?category=${category.slug}`}
            data-reveal="clip"
            suppressHydrationWarning
            style={{ "--reveal-delay": `${(index % 2) * 120}ms` } as React.CSSProperties}
            className="group relative block overflow-hidden rounded-[24px] border border-[#a8c0d5]/10"
          >
            <MediaImage
              src={category.imageUrl}
              alt={category.name}
              className="media-settle aspect-[16/10] w-full transition-transform duration-700 ease-out group-hover:scale-[1.04] md:aspect-[16/9]"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050b14]/90 via-[#050b14]/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-[clamp(1.25rem,3vw,2rem)]">
              <div>
                <p className="text-[10px] uppercase tracking-[0.32em] text-[#8ccbff]">
                  {category.productCount} {category.productCount === 1 ? "piece" : "pieces"}
                </p>
                <p className="display-2 mt-1 text-[#f4faff]">{category.name}</p>
              </div>
              <span className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#a8c0d5]/30 bg-[#050b14]/50 text-[#f4faff] backdrop-blur transition-all duration-300 group-hover:border-[#8ccbff] group-hover:bg-[#4da8ff] group-hover:text-[#050b14]">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════  FEATURED — EDITORIAL GRID  ═══════════════════
   First product spans two columns on desktop; the rest flow around it. */
async function FeaturedRail() {
  const products = await getFeaturedProducts(8);
  if (products.length === 0) {
    return (
      <div className="glass rounded-3xl px-6 py-12 text-center">
        <h3 className="font-display text-xl text-[#f4faff]">The rail is being dressed</h3>
        <p className="mt-2 text-sm text-[#a8c0d5]">
          The collection is being curated. Signature pieces will appear here soon.
        </p>
        <div className="mt-6 flex justify-center">
          <LinkButton href="/admin/products/new" variant="outline" size="sm">
            Add the first product
          </LinkButton>
        </div>
      </div>
    );
  }
  const customer = await getCurrentCustomer();
  const wishlist = customer ? await listWishlist(customer.id) : [];
  const wishIds = new Set(wishlist.map((item) => item.productId));

  return (
    <div className="grid grid-cols-2 gap-[clamp(0.75rem,2vw,1.5rem)] lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          wishlisted={wishIds.has(product.id)}
          authenticated={Boolean(customer)}
          featured={index === 0}
          revealDelay={(index % 8) * 70}
          revealIndex={index}
          revealOffset={0}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════  NEW ARRIVALS  ═══════════════════════ */
async function NewArrivals() {
  const { items } = await listProducts({ sort: "newest", perPage: 4 });
  if (items.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-[88rem] px-[var(--gutter)]">
      <SectionHeading
        eyebrow="Just landed"
        title="New arrivals"
        description="Fresh from the studio, limited first runs."
        action={<LinkButton href="/shop?sort=newest" variant="ghost" size="sm">See more</LinkButton>}
      />
      <div className="grid grid-cols-2 gap-[clamp(0.75rem,2vw,1.5rem)] lg:grid-cols-4">
        {items.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            revealDelay={(index % 8) * 70}
            revealIndex={index}
            /* Phase 19: continue the page-wide editorial rhythm instead of restarting at LEFT. */
            revealOffset={2}
          />
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════  PAGE  ═══════════════════════════ */
export default async function HomePage() {
  let categories: Awaited<ReturnType<typeof listCategories>>;
  try {
    categories = await listCategories();
  } catch (error) {
    return (
      <ErrorState
        title="The store could not be loaded"
        description="We could not reach the product database. This is a real connection problem — not an empty catalogue."
        retryHref="/"
      />
    );
  }
  // Fetched above only to fail fast on a dead database; sections stream their own data.
  void categories;

  const [about, contact] = await Promise.all([listAboutSections(true).catch(() => []), getContactSettings()]);

  return (
    <div className="space-y-[var(--section-gap)]">
      <Suspense fallback={<div className="skeleton full-bleed -mt-6 h-[70svh] rounded-[2rem]" />}>
        <Hero />
      </Suspense>

      <Marquee />

      <BrandStatement />

      <section className="mx-auto w-full max-w-[88rem] px-[var(--gutter)]">
        <SectionHeading
          eyebrow="Signature"
          title="Featured pieces"
          description="Handpicked from the live catalogue."
          action={<LinkButton href="/shop" variant="outline" size="sm">Browse shop</LinkButton>}
        />
        <Suspense fallback={<ProductGridSkeleton />}>
          <FeaturedRail />
        </Suspense>
      </section>

      <CollectionIndex />

      <FeatureStrip />

      <Suspense fallback={<ProductGridSkeleton count={4} />}>
        <NewArrivals />
      </Suspense>

      {about.length > 0 ? (
        <section className="mx-auto w-full max-w-[88rem] px-[var(--gutter)]" data-reveal="scale" suppressHydrationWarning>
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-14">
            <div data-reveal="clip" suppressHydrationWarning className="order-2 overflow-hidden rounded-[24px] lg:order-1">
              <MediaImage
                src={about[0].mediaUrl}
                alt={about[0].heading}
                className="media-settle aspect-[4/3] w-full"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div data-reveal suppressHydrationWarning className="order-1 space-y-4 lg:order-2">
              <p className="eyebrow">{about[0].section === "story" ? "Our story" : about[0].section}</p>
              <h2 className="display-2 text-[#f4faff]">{about[0].heading}</h2>
              {about[0].body ? <p className="whitespace-pre-line text-sm leading-relaxed text-[#a8c0d5]">{about[0].body}</p> : null}
              <LinkButton href="/about" variant="outline" size="sm">
                Read more
              </LinkButton>
            </div>
          </div>
        </section>
      ) : null}

      {/* Closing editorial CTA */}
      <section className="mx-auto w-full max-w-[88rem] px-[var(--gutter)]" data-reveal suppressHydrationWarning>
        <div className="full-bleed mx-[-1px] border-y border-[#a8c0d5]/10 bg-[radial-gradient(120%_140%_at_50%_0%,#12344d_0%,#0a1d2e_50%,#050b14_100%)] px-[var(--gutter)] py-[clamp(3.5rem,8vw,6.5rem)] text-center">
          <p className="eyebrow mb-4">MKR assistant</p>
          <h2 className="display-1 mx-auto max-w-3xl text-[#f4faff]">Need help choosing?</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#a8c0d5]">
            Use the MKR assistant for sizing and fabric questions, or reach the team directly.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton href="/contact" size="lg">
              Contact the studio
            </LinkButton>
            {contact.phone ? (
              <LinkButton href={`tel:${contact.phone}`} variant="outline" size="lg">
                {contact.phone}
              </LinkButton>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
