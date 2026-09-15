import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { HeroVideo } from "@/db/schema";

/* Built-in defaults — shown only when no admin-managed hero video exists. */
const DEFAULT_VIDEO =
  "https://videos.pexels.com/video-files/8365478/8365478-hd_1080_1920_30fps.mp4";

export default function Hero({ video }: { video?: HeroVideo | null }) {
  const src = video?.videoUrl || DEFAULT_VIDEO;
  /* No /images/hero.jpg exists in public/ — fall back to the shipped logo
     asset so the poster never 404s when an admin video has no thumbnail. */
  const poster = video?.thumbnailUrl || "/images/mkr-logo-512.png";
  const bottomText = video?.bottomText || "No. 01 — Everyday Essentials";
  const durationLabel = video?.durationLabel || "00:15";
  return (
    <section className="relative overflow-hidden lg:min-h-[100dvh]" aria-label="Introduction">
      <div className="mx-auto grid max-w-[1400px] items-center gap-14 px-6 pb-20 pt-36 md:px-10 lg:grid-cols-12 lg:gap-8 lg:pb-24 lg:pt-28 lg:min-h-[100dvh]">
        {/* ——— text zone ——— */}
        <div className="relative z-10 lg:col-span-7">
          <p className="fi label flex items-center gap-4" style={{ "--d": "250ms" } as React.CSSProperties}>
            <span className="inline-block h-px w-12 bg-soft/50" aria-hidden="true" />
            Premium Collection
          </p>

          <h1 className="display-1 mt-8 text-foam">
            <span className="lm"><span style={{ "--d": "450ms" } as React.CSSProperties}>Shop More,</span></span>
            <span className="lm"><span style={{ "--d": "600ms" } as React.CSSProperties}>Live Better.</span></span>
          </h1>

          <p
            className="fu body-lead mt-9 max-w-md"
            style={{ "--d": "820ms" } as React.CSSProperties}
          >
            Discover pieces designed for everyday life — a small, considered
            wardrobe for calmer, better living.
          </p>

          <div
            className="fu mt-11 flex flex-wrap items-center gap-4"
            style={{ "--d": "980ms" } as React.CSSProperties}
          >
            <Link href="/shop" className="btn btn-solid">
              Explore Shop <ArrowRight className="btn-arrow h-3.5 w-3.5" />
            </Link>
            <Link href="/shop?view=new" className="btn btn-line">
              New Arrivals
            </Link>
          </div>
        </div>

        {/* ——— media zone ——— */}
        <div className="relative lg:col-span-5">
          <div
            className="fb media-frame relative aspect-[4/5] shadow-[0_40px_120px_-30px_rgba(13,71,133,0.45)] lg:mt-14"
            style={{ "--d": "700ms" } as React.CSSProperties}
          >
            <video
              className="media-zoom h-full w-full object-cover"
              poster={poster}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label={video?.subtitle || "MKR brand film, cinematic editorial footage"}
            >
              <source src={src} type="video/mp4" />
            </video>
            {/* dreamy blue veil */}
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(7,26,43,0.6)] via-[rgba(11,38,61,0.12)] to-[rgba(77,168,255,0.08)]"
              aria-hidden="true"
            />
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
              <p className="label !text-ice/80">{bottomText || video?.label || ""}</p>
              <p className="label hidden !text-ice/50 sm:block">{durationLabel}</p>
            </div>
          </div>

          {/* offset caption strip */}
          {video?.subtitle ? (
            <p
              className="fu mt-6 hidden max-w-xs text-sm leading-relaxed text-mist/80 lg:block"
              style={{ "--d": "1150ms" } as React.CSSProperties}
            >
              {video.subtitle}
            </p>
          ) : (
            <p
              className="fu mt-6 hidden max-w-xs text-sm leading-relaxed text-mist/80 lg:block"
              style={{ "--d": "1150ms" } as React.CSSProperties}
            >
              Considered essentials for the quiet hours of the day — worn,
              washed, and kept.
            </p>
          )}
        </div>
      </div>

      {/* scroll cue */}
      <div
        className="fi pointer-events-none absolute bottom-8 left-10 hidden items-center gap-4 lg:flex"
        style={{ "--d": "1400ms" } as React.CSSProperties}
        aria-hidden="true"
      >
        <span className="label !text-mist/60 [writing-mode:vertical-rl]">Scroll</span>
        <span className="block h-14 w-px overflow-hidden">
          <span className="block h-full w-full origin-top animate-[scrollcue_2.6s_ease-in-out_infinite] bg-gradient-to-b from-soft/70 to-transparent" />
        </span>
      </div>
    </section>
  );
}
