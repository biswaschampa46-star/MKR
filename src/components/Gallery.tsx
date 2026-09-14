"use client";

import { useState } from "react";
import Image from "next/image";
import type { ProductImage } from "@/db/schema";

/**
 * Product image gallery — main frame + thumbnail strip.
 * Local shimmer while the active image decodes; graceful placeholder on
 * error. Never uses the global full-screen loader for images.
 */
export default function Gallery({
  images,
  name,
  isNew = false,
  sale = false,
}: {
  images: ProductImage[];
  name: string;
  isNew?: boolean;
  sale?: boolean;
}) {
  const [active, setActive] = useState(0);
  const [mainFailed, setMainFailed] = useState(false);
  const [mainLoaded, setMainLoaded] = useState(false);
  const safeImages = images.filter((im) => im.url?.trim());
  const current = safeImages[Math.min(active, Math.max(safeImages.length - 1, 0))];
  const showPlaceholder = safeImages.length === 0 || !current || mainFailed;

  return (
    <div>
      <div className="media-frame relative aspect-[4/5]">
        {showPlaceholder ? (
          <div className="absolute inset-0 grid place-items-center bg-deep-2 px-8 text-center">
            <div>
              <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-soft">
                {name}
              </p>
              <p className="mt-2 text-xs text-mist/70">Image coming soon</p>
            </div>
          </div>
        ) : (
          <>
            {!mainLoaded && <div className="media-shimmer absolute inset-0" aria-hidden="true" />}
            <Image
              key={current.url}
              src={current.url}
              alt={current.alt || name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className={`gallery-swap media-zoom object-cover transition-opacity duration-700 ${mainLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setMainLoaded(true)}
              onError={() => setMainFailed(true)}
            />
          </>
        )}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(7,26,43,0.28)] to-transparent"
          aria-hidden="true"
        />
        {isNew && <span className="badge-tag absolute left-5 top-5">New</span>}
        {sale && <span className="badge-tag absolute left-5 top-5">Sale</span>}
      </div>

      {safeImages.length > 1 && (
        <div className="mt-4 grid grid-cols-5 gap-2.5 sm:gap-3" role="tablist" aria-label={`${name} images`}>
          {safeImages.map((im, i) => (
            <button
              key={`${im.url}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`${name} image ${i + 1}`}
              onClick={() => { setActive(i); setMainFailed(false); setMainLoaded(false); }}
              className={`gal-thumb media-frame relative aspect-square min-h-[44px] min-w-[44px] overflow-hidden ${
                i === active ? "opacity-100" : "opacity-60 hover:opacity-100"
              }`}
            >
              <Image src={im.url} alt={im.alt || `${name} ${i + 1}`} fill sizes="15vw" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
