"use client";

import Image from "next/image";
import { useState } from "react";

/** Local image loading state for product cards — shimmer, no layout jump. */
export default function ProductCardImage({
  src,
  alt,
  sizes,
  priority = false,
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
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
      <div className="absolute inset-0 grid place-items-center bg-deep-2 px-6 text-center" role="img" aria-label={alt}>
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-soft">{alt}</p>
      </div>
    );
  }
  return (
    <>
      {!loaded && <div className="media-shimmer absolute inset-0" aria-hidden="true" />}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`object-cover transition-opacity duration-700 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}
