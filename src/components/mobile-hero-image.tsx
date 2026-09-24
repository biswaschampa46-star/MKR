"use client";

import { useEffect, useRef } from "react";

/**
 * MOBILE HERO IMAGE — the single admin-uploaded garment shot that replaces
 * the desktop floating peek composition on phones (the peek never renders
 * on mobile; see SmoothScroll's early return).
 *
 * Rendering strategy (hydration-safe, no mismatch):
 *  - Server renders the <img> immediately with the cinematic start pose as an
 *    inline style (opacity 0 / offset) — no flash, no layout shift.
 *  - "mobile" is decided in a passive effect and only toggles the animation,
 *    never the markup, so server and client HTML always match.
 *  - Animations are transform/opacity only (GPU-friendly, 60fps), driven by
 *    one IntersectionObserver + one rAF settle; integrated with the site's
 *    reveal/parallax language instead of a second scroll engine.
 *  - Honours prefers-reduced-motion (static, fully visible).
 *  - Broken/missing upload → hidden image; the section's gradient fallback
 *    and the editorial type carry the hero (no broken-image icon).
 */
export function MobileHeroImage({ src, alt }: { src: string; alt: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    // The animation only arms on mobile viewports; the markup itself is
    // identical on server and client (no hydration mismatch), and the CSS
    // layer (.mobile-hero-mount display:none on ≥769px) does the rest.
    if (reduced.matches || !window.matchMedia("(max-width: 768px)").matches) return;

    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return;

    // ── Enter + settle ──
    // Start pose (offset, smaller, dimmed) → drift to final with premium
    // easing. rAF-driven transform/opacity only, ~1.1s, no bounce.
    const START = { x: 18, y: 34, s: 0.94, o: 0 };
    const END = { x: 0, y: 0, s: 1, o: 1 };
    const DURATION = 1100;
    const EASE = (t: number) => 1 - Math.pow(1 - t, 4); // ease-out-quart, no overshoot

    let raf = 0;
    let startTime = 0;
    let entered = false;
    // Subtle scroll parallax (≤14px) once settled — reads depth, never jars.
    let parallaxTarget = 0;
    let parallaxCurrent = 0;
    let parallaxRaf = 0;

    const paint = (p: { x: number; y: number; s: number; o: number }) => {
      img.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) scale(${p.s.toFixed(3)})`;
      img.style.opacity = String(p.o);
    };

    const tick = (now: number) => {
      if (!startTime) startTime = now;
      const t = Math.min(1, (now - startTime) / DURATION);
      const e = EASE(t);
      paint({
        x: START.x + (END.x - START.x) * e,
        y: START.y + (END.y - START.y) * e,
        s: START.s + (END.s - START.s) * e,
        o: START.o + (END.o - START.o) * e,
      });
      if (t < 1) raf = requestAnimationFrame(tick);
      else entered = true;
    };

    const onScroll = () => {
      // One passive read per scroll frame; no React state updates.
      const rect = wrap.getBoundingClientRect();
      const progress = Math.min(1, Math.max(-1, (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight));
      parallaxTarget = progress * -14;
      if (entered && !parallaxRaf) {
        parallaxRaf = requestAnimationFrame(() => {
          parallaxRaf = 0;
          parallaxCurrent += (parallaxTarget - parallaxCurrent) * 0.12;
          img.style.setProperty("--hero-parallax", `${parallaxCurrent.toFixed(2)}px`);
        });
      }
    };

    paint(START);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            observer.disconnect();
            raf = requestAnimationFrame(tick);
            window.addEventListener("scroll", onScroll, { passive: true });
          }
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(wrap);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(parallaxRaf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div ref={wrapRef} className="mobile-hero-frame">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        decoding="async"
        fetchPriority="high"
        className="mobile-hero-img"
        style={{ opacity: 0 }}
        onError={(event) => {
          // Graceful fallback: broken/missing upload never shows a broken
          // image icon — the gradient + type carry the hero instead.
          (event.target as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  );
}
