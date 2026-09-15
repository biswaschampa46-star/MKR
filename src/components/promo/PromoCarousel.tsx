"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import PromoBanner from "./PromoBanner";
import type { PromoPublic } from "@/lib/promotion-utils";

const AUTOPLAY_MS = 6000;

/**
 * Premium carousel for multiple active campaigns at one placement.
 * Autoplay with pause-on-hover/focus, swipe, prev/next, indicator dots.
 * Renders nothing when there is no campaign.
 */
export default function PromoCarousel({
  campaigns,
  className = "",
}: {
  campaigns: PromoPublic[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [expiredIds, setExpiredIds] = useState<ReadonlySet<string>>(new Set());
  const touchX = useRef<number | null>(null);

  const visible = campaigns.filter((c) => !expiredIds.has(c.id));
  const n = visible.length;
  /* clamp so expiring the last slide never leaves a blank viewport */
  const idx = n > 0 ? Math.min(index, n - 1) : 0;

  const go = useCallback(
    (dir: 1 | -1) => setIndex((i) => (i + dir + n) % Math.max(n, 1)),
    [n],
  );

  const onExpire = useCallback((id: string) => {
    setExpiredIds((s) => new Set(s).add(id));
  }, []);

  /* autoplay — paused on hover/focus so it never fights the reader */
  useEffectAutoplay(paused, n, go);

  if (n === 0) return null;

  if (n === 1) {
    return (
      <div className={className}>
        <PromoBanner campaign={visible[0]} onExpire={() => onExpire(visible[0].id)} />
      </div>
    );
  }

  return (
    <div
      className={`relative ${className}`}
      role="region"
      aria-roledescription="carousel"
      aria-label="Promotional offers"
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="overflow-hidden" style={{ borderRadius: visible[0]?.radius ?? 20 }}>
        <div
          className="flex transition-transform duration-700 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {visible.map((c, i) => (
            <div
              key={c.id}
              className="w-full shrink-0"
              aria-hidden={i !== idx}
              role="group"
              aria-label={`${i + 1} of ${n}`}
            >
              <PromoBanner campaign={c} onExpire={() => onExpire(c.id)} />
            </div>
          ))}
        </div>
      </div>

      {/* controls */}
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Previous offer"
        className="absolute left-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-[rgba(4,13,22,0.45)] text-foam backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-[rgba(4,13,22,0.7)]"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Next offer"
        className="absolute right-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-[rgba(4,13,22,0.45)] text-foam backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-[rgba(4,13,22,0.7)]"
      >
        <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
      </button>

      {/* indicator dots */}
      <div className="absolute inset-x-0 bottom-3 z-20 flex justify-center gap-2">
        {visible.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Go to offer ${i + 1}`}
            aria-current={i === idx}
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: i === idx ? 22 : 8,
              background: i === idx ? "rgba(244,250,255,0.95)" : "rgba(244,250,255,0.35)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** setInterval wrapper kept out of the render path. */
function useEffectAutoplay(
  paused: boolean,
  n: number,
  go: (dir: 1 | -1) => void,
) {
  useInterval(() => go(1), paused || n <= 1 ? null : AUTOPLAY_MS);
}

function useInterval(cb: () => void, delayMs: number | null) {
  const ref = useRef(cb);
  useEffect(() => {
    ref.current = cb;
  }, [cb]);
  useEffect(() => {
    if (delayMs === null) return;
    const t = setInterval(() => ref.current(), delayMs);
    return () => clearInterval(t);
  }, [delayMs]);
}
