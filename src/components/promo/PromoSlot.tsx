"use client";

import { useEffect, useRef, useState } from "react";
import PromoCarousel from "./PromoCarousel";
import type { PromoPublic } from "@/lib/promotion-utils";

/**
 * Client slot for a named placement. Fetches active campaigns for that
 * placement from the public API and renders nothing at all until data
 * arrives — customers never see a loading state, and if the request
 * fails the slot stays invisible (existing site keeps working).
 */
export default function PromoSlot({
  placements,
  productId,
  category,
  className = "",
}: {
  placements: string[];
  productId?: string;
  category?: string;
  className?: string;
}) {
  const key = placements.join(",");
  const [items, setItems] = useState<PromoPublic[] | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    fetch(
      `/api/promotions?placements=${encodeURIComponent(key)}${
        productId ? `&productId=${encodeURIComponent(productId)}` : ""
      }${category ? `&category=${encodeURIComponent(category)}` : ""}`,
    )
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { campaigns: PromoPublic[] }) => {
        if (mounted.current) setItems(data.campaigns ?? []);
      })
      .catch(() => {
        if (mounted.current) setItems([]);
      });
    return () => {
      mounted.current = false;
    };
  }, [key, productId, category]);

  if (items === null || items.length === 0) return null;
  return (
    <PromoSlotInner
      items={items}
      placementsKey={key}
      productId={productId}
      category={category}
      className={className}
    />
  );
}

function PromoSlotInner({
  items,
}: {
  items: PromoPublic[];
  placementsKey?: string;
  productId?: string;
  category?: string;
  className?: string;
}) {
  return <PromoCarousel campaigns={items} />;
}
