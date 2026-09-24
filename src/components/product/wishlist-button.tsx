"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export function WishlistButton({
  productId,
  initialActive,
  authenticated,
  className,
}: {
  productId: string;
  initialActive: boolean;
  authenticated: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const toggle = async () => {
    if (!authenticated) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const response = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    const payload = (await response.json()) as { ok: boolean; active?: boolean; error?: string };
    if (!payload.ok) {
      setMessage(payload.error ?? "Could not update your wishlist.");
      return;
    }
    setActive(Boolean(payload.active));
    setMessage(payload.active ? "Saved to wishlist" : "Removed from wishlist");
    startTransition(() => router.refresh());
    setTimeout(() => setMessage(null), 1800);
  };

  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={pending}
        aria-label={active ? "Remove from wishlist" : "Save to wishlist"}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border border-[#a8c0d5]/25 bg-[#071a2b]/70 text-[#ddf3ff] backdrop-blur transition hover:border-[#8ccbff] hover:text-[#8ccbff]",
          className,
        )}
      >
        <Heart className={cn("h-4 w-4", active && "fill-[#8ccbff] text-[#8ccbff]")} />
      </button>
      {message ? (
        <span className="absolute right-0 top-11 z-10 w-max rounded-full border border-[#a8c0d5]/25 bg-[#071a2b]/95 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#8ccbff]">
          {message}
        </span>
      ) : null}
    </span>
  );
}
