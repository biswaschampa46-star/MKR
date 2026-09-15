"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * "Copy Code" coupon chip. Copies the code to the clipboard and shows a
 * brief inline success note — no external toast library needed.
 */
export default function CouponCopy({
  code,
  accentColor,
  textColor,
  small = false,
}: {
  code: string;
  accentColor: string;
  textColor: string;
  small?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard API can be blocked (e.g. http contexts) — fall back.
      const ta = document.createElement("textarea");
      ta.value = code;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* nothing else we can do */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
  }, [code]);

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy coupon code ${code}`}
      className={`inline-flex items-center gap-2 rounded-full border border-dashed font-display font-bold tracking-[0.18em] transition-all duration-300 hover:opacity-85 active:scale-[0.97] ${
        small ? "px-3 py-1 text-[0.65rem]" : "px-4 py-2 text-xs sm:px-5"
      }`}
      style={{
        borderColor: accentColor,
        color: textColor,
        background: "rgba(4, 13, 22, 0.30)",
      }}
    >
      <span>{code}</span>
      <span
        className="text-[0.6rem] font-semibold normal-case tracking-[0.1em] opacity-80"
        aria-live="polite"
      >
        {copied ? "✓ Copied" : "Copy"}
      </span>
    </button>
  );
}
