"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Remote media (Supabase Storage / media API) rendered through next/image with
 * lazy loading, fixed aspect ratio and a graceful fallback — never a fake photo.
 */
export function MediaImage({
  src,
  alt,
  className,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-[#0e2f4a] via-[#0b263d] to-[#071a2b] text-center",
          className,
        )}
        aria-label={alt}
        role="img"
      >
        <span className="wordmark text-sm tracking-[0.3em] text-[#8ccbff]/70">MKR</span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-[#0b263d]", className)}>
      {!loaded ? <div className="absolute inset-0 skeleton" /> : null}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        onError={() => setFailed(true)}
        onLoad={() => setLoaded(true)}
        className={cn("object-cover transition-all duration-700", loaded ? "opacity-100" : "opacity-0")}
      />
    </div>
  );
}
