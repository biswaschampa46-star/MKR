"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const PROMO_VIDEO =
  "https://videos.pexels.com/video-files/37259189/15784119_1920_1080_24fps.mp4";

/**
 * Cinematic full-bleed promotional section.
 * Video loads lazily when near the viewport; gentle parallax on scroll.
 */
export default function Promo() {
  const sectionRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loadVideo, setLoadVideo] = useState(false);
  const [seen, setSeen] = useState(false);

  /* lazy-load video near viewport */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setLoadVideo(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "420px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* reveal + parallax */
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = sectionRef.current;
    if (!el) return;

    /* Progressive enhancement (see Reveal): .rv is visible by default so the
       block never paints blank pre-hydration. This section sits far below the
       fold, so hiding it here post-hydration is unobservable and preserves
       the original scroll-reveal entrance exactly. */
    if (!reduced) el.classList.add("rv-hidden");

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setSeen(true)),
      { threshold: 0.25 },
    );
    io.observe(el);

    if (reduced) return () => io.disconnect();

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        if (rect.bottom < 0 || rect.top > vh) return;
        const progress = (rect.top + rect.height / 2 - vh / 2) / (vh + rect.height);
        if (mediaRef.current) {
          mediaRef.current.style.transform = `translate3d(0, ${(progress * 90).toFixed(1)}px, 0)`;
        }
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (loadVideo && videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [loadVideo]);

  return (
    <section
      ref={sectionRef}
      className="relative my-8 h-[80vh] min-h-[34rem] overflow-hidden md:my-14 md:h-[88vh]"
      aria-label="Discover something new"
    >
      {/* parallax media */}
      <div ref={mediaRef} className="absolute inset-[-10%] will-change-transform">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          poster="/images/mkr-logo-512.png"
          muted
          loop
          playsInline
          preload="none"
          aria-label="Slow cinematic waves in deep blue light"
        >
          {loadVideo && <source src={PROMO_VIDEO} type="video/mp4" />}
        </video>
      </div>

      {/* atmospheric overlays */}
      <div className="absolute inset-0 bg-[rgba(7,26,43,0.52)]" aria-hidden="true" />
      <div
        className="absolute inset-0 bg-gradient-to-t from-[rgba(7,26,43,0.9)] via-transparent to-[rgba(7,26,43,0.55)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(70%_60%_at_30%_60%,rgba(77,168,255,0.14),transparent_70%)]"
        aria-hidden="true"
      />

      {/* content */}
      <div
        className={`rv relative z-10 mx-auto flex h-full max-w-[1400px] flex-col justify-end px-6 pb-16 md:px-10 md:pb-20 ${
          seen ? "rv-in" : ""
        }`}
      >
        <p className="label label--bright flex items-center gap-4">
          <span className="inline-block h-px w-12 bg-soft/60" aria-hidden="true" />
          Discover Something New
        </p>
        <h2 className="display-2 mt-7 max-w-3xl text-foam">
          Designed for
          <br />
          <span className="text-stroke">everyday life.</span>
        </h2>
        <p className="body-lead mt-7 max-w-md">
          Pieces that settle quietly into your routine — and stay there for years.
        </p>
        <div className="mt-10">
          <Link href="/shop" className="btn btn-line !border-soft/40">
            Explore Shop <ArrowRight className="btn-arrow h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
