"use client";

import { useEffect, useRef } from "react";

/**
 * HERO MEDIA — responsive video/image stage for the MKR hero.
 *
 * ONE stage; the source is chosen by viewport at mount (never two downloaded
 * files), so only the appropriate file is ever fetched:
 *   - ≤768px (the project's existing mobile breakpoint, matches
 *     smooth-scroll.tsx / Tailwind md): admin's Mobile Hero media in the
 *     admin-selected portrait ratio (9:16 / 2:3 / 4:5 / 1:1).
 *   - >768px: the existing desktop hero media (16:9 stage, unchanged).
 *
 * Two inert stage elements overlap inside the container — an <img> and a
 * <video> — because a browser cannot render a still inside <video>, so image
 * slides need the real <img>. Both start source-less and hidden; the effect
 * below attaches the resolved URL to whichever one this viewport needs, so
 * nothing extra is ever downloaded.
 *
 * Replaces the previous static <video>/<MediaImage> block in the Hero.
 * Everything else in the Hero (overlays, typography, animations, fallback
 * gradients) is untouched. Honours prefers-reduced-motion: no autoplay,
 * poster/first frame only.
 *
 * Fallbacks (never a broken or blank stage):
 *   - mobile requested but unset → desktop media (or gradient below)
 *   - video error → the same URL retried as a still, else the section gradient
 *   - image error → the section's gradient
 */

const MOBILE_MAX = 768;
const VALID_RATIOS = new Set(["9:16", "2:3", "4:5", "1:1"]);

export type HeroMediaSource = {
  desktopUrl: string | null;
  desktopKind: "image" | "video";
  desktopAlt: string;
  mobileUrl: string | null;
  mobileKind: "image" | "video";
  mobileAlt: string;
  mobileRatio: string;
  mobileIsActive: boolean;
};

export function HeroMedia({ source }: { source: HeroMediaSource }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // The URL this viewport resolved to — the <video> error handler retries it
  // as a still before giving up on the media entirely.
  const resolvedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    const image = imageRef.current;
    if (!container) return;

    const isMobile = window.innerWidth <= MOBILE_MAX;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Resolve which asset this viewport should use (mobile first when
    // active, desktop fallback, then mobile-only, else nothing).
    let url: string | null = null;
    let kind: "image" | "video" = "image";
    let mobile = false;
    if (isMobile && source.mobileUrl && source.mobileIsActive) {
      url = source.mobileUrl;
      kind = source.mobileKind;
      mobile = true;
    } else if (!isMobile && source.desktopUrl) {
      url = source.desktopUrl;
      kind = source.desktopKind;
    } else if (isMobile && source.desktopUrl) {
      // Mobile media unset/disabled → desktop media still fills the stage
      // (object-cover crops gracefully; no black hero).
      url = source.desktopUrl;
      kind = source.desktopKind;
    } else if (!isMobile && source.mobileUrl) {
      // Desktop unset but mobile configured → better than an empty stage.
      url = source.mobileUrl;
      kind = source.mobileKind;
    }

    resolvedUrlRef.current = url;
    if (!url) return;

    // Mark the container first so CSS applies the right composition per
    // viewport (mobile ratio, crop bias) before the asset lands.
    container.dataset.heroKind = kind;
    container.dataset.heroMobile = mobile ? "1" : "0";
    container.dataset.heroRatio = mobile && VALID_RATIOS.has(source.mobileRatio) ? source.mobileRatio : "16:9";

    // Swap the video source without remounting (no duplicate downloads).
    if (video && kind === "video") {
      const current = video.querySelector("source");
      if (!current || current.getAttribute("src") !== url) {
        if (current) current.remove();
        const el = document.createElement("source");
        el.setAttribute("src", url);
        video.appendChild(el);
        video.load();
      }
      video.style.display = "";
      if (!reduced) video.play().catch(() => { /* autoplay block is fine — poster remains */ });
    }

    // A still cannot live inside <video>, so image slides use the real <img>
    // stage — same fade-in contract (hidden until the file is really painted).
    if (image && kind === "image") {
      if (image.getAttribute("src") !== url) image.setAttribute("src", url);
      image.style.display = "";
    }
  }, [source]);

  const ratio = VALID_RATIOS.has(source.mobileRatio) ? source.mobileRatio : "16:9";

  return (
    <div ref={containerRef} className="hero-media" data-hero-ratio={ratio}>
      {source.desktopUrl || source.mobileUrl ? (
        <>
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
            aria-hidden
            className="hero-media-el"
            style={{ opacity: 0 }}
            onLoadedMetadata={(event) => {
              const el = event.currentTarget;
              el.style.opacity = "";
              el.dataset.ready = "1";
              // Metadata proved the file plays — retire the still stage.
              if (imageRef.current) imageRef.current.style.display = "none";
            }}
            onError={() => {
              // Never a blank hero: hide the element, then retry the same URL
              // as a still (a stale "video" media type loads fine in <img>);
              // if that fails too the image handler leaves the gradient.
              const el = videoRef.current;
              if (el) el.style.display = "none";
              const image = imageRef.current;
              const url = resolvedUrlRef.current;
              if (image && url && image.getAttribute("src") !== url) {
                image.setAttribute("src", url);
                image.style.display = "";
              }
            }}
          />
          {/* Image stage — source-less and hidden until the effect resolves the
              viewport's asset, so only the chosen file is ever downloaded.
              Decorative (alt=""): the hero heading stays the one announcement
              to screen readers, matching aria-hidden on the video. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            alt=""
            draggable={false}
            decoding="async"
            fetchPriority="high"
            className="hero-media-el"
            style={{ opacity: 0, display: "none" }}
            onLoad={(event) => {
              const el = event.currentTarget;
              el.style.opacity = "";
              el.dataset.ready = "1";
              // The still is on screen — the video stage is redundant.
              if (videoRef.current) videoRef.current.style.display = "none";
            }}
            onError={(event) => {
              // Broken/missing upload: hide it; the section's gradient keeps
              // the hero premium (never a broken-image icon).
              (event.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </>
      ) : null}
    </div>
  );
}
