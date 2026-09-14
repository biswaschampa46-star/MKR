"use client";

import { useState } from "react";

/**
 * Image with a polished local loading state: shimmer placeholder + fade-in,
 * no layout jump (parent keeps aspect ratio), graceful error fallback.
 * Never triggers the global full-screen loader.
 */
export default function LoadingImage({
  src,
  alt,
  className = "",
  imgClassName = "",
  sizes,
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  eager?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  // Reset per-src state during render when the source changes (React-approved pattern).
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setLoaded(false);
    setFailed(false);
  }
  if (!src?.trim() || failed) {
    return (
      <div className={`grid place-items-center bg-deep-2 px-6 text-center ${className}`} role="img" aria-label={alt}>
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-soft">{alt}</p>
          <p className="mt-2 text-xs text-mist/70">Image coming soon</p>
        </div>
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden ${className}`} aria-busy={!loaded}>
      {!loaded && <div className="media-shimmer absolute inset-0" aria-hidden="true" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"} ${imgClassName}`}
      />
    </div>
  );
}
