"use client";

import { useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import { MediaImage } from "@/components/media-image";
import { cn } from "@/lib/utils";
import type { ProductImageRef } from "@/types";

/* Phase 18 — post-mount media-query state via useSyncExternalStore (the
   React-correct replacement for setState-inside-effect). The server snapshot
   is always `false` so SSR/hydration match; the client snapshot subscribes to
   the media queries without re-render loops. */
const ZOOM_QUERY = "(pointer: fine) and (prefers-reduced-motion: no-preference)";
const zoomSubscription = (notify: () => void) => {
  const mql = window.matchMedia(ZOOM_QUERY);
  mql.addEventListener("change", notify);
  return () => mql.removeEventListener("change", notify);
};
const zoomClientSnapshot = () => window.matchMedia(ZOOM_QUERY).matches;
const zoomServerSnapshot = () => false;

export function ProductGallery({ images, name }: { images: ProductImageRef[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];

  // Desktop zoom lens: pointer-fine devices only, disabled under reduced motion.
  const stageRef = useRef<HTMLDivElement | null>(null);
  const lensRef = useRef<HTMLDivElement | null>(null);
  const [lensOn, setLensOn] = useState(false);
  const lensEnabled = useSyncExternalStore(zoomSubscription, zoomClientSnapshot, zoomServerSnapshot);

  const moveLens = (event: PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    const lens = lensRef.current;
    if (!stage || !lens || !current?.publicUrl) return;
    const rect = stage.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
    const zoom = 2.2;
    lens.style.left = `${x - lens.offsetWidth / 2}px`;
    lens.style.top = `${y - lens.offsetHeight / 2}px`;
    lens.style.backgroundImage = `url(${current.publicUrl})`;
    lens.style.backgroundSize = `${rect.width * zoom}px ${rect.height * zoom}px`;
    lens.style.backgroundPosition = `${-(x * zoom - lens.offsetWidth / 2)}px ${-(y * zoom - lens.offsetHeight / 2)}px`;
  };

  if (images.length === 0) {
    return (
      <MediaImage
        src={null}
        alt={name}
        className="aspect-[4/5] w-full rounded-[24px] border border-[#a8c0d5]/10"
        sizes="(max-width: 1024px) 100vw, 50vw"
      />
    );
  }

  return (
    <div className="space-y-3">
      <div
        ref={stageRef}
        className={cn(
          "lens-wrap relative aspect-[4/5] w-full rounded-[24px] border border-[#a8c0d5]/10",
          lensEnabled && current?.kind !== "video" && "cursor-zoom-in",
        )}
        onPointerEnter={() => lensEnabled && current?.kind !== "video" && setLensOn(true)}
        onPointerLeave={() => setLensOn(false)}
        onPointerMove={(event) => {
          if (!lensEnabled || current?.kind === "video") return;
          moveLens(event);
        }}
      >
        <MediaImage
          src={current?.publicUrl}
          alt={current?.altText ?? name}
          priority
          className="h-full w-full"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
        {lensOn ? <div ref={lensRef} className="lens-glass" aria-hidden /> : null}
      </div>

      {images.length > 1 ? (
        <div className="no-scrollbar h-tray flex gap-3 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.productImageId ?? image.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`View image ${index + 1}`}
              className={cn(
                "relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border transition-all duration-300",
                index === active ? "border-[#8ccbff]/70" : "border-[#a8c0d5]/15 opacity-60 hover:opacity-100",
              )}
            >
              {image.kind === "video" ? (
                <video src={image.publicUrl} muted playsInline className="h-full w-full object-cover" />
              ) : (
                <MediaImage src={image.publicUrl} alt={image.altText ?? name} className="h-full w-full" sizes="64px" />
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
