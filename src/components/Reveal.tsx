"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type CSSProperties,
  type ElementType,
} from "react";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
};

/**
 * Scroll-triggered reveal: blur → sharp, opacity → visible, gentle rise.
 * Honours prefers-reduced-motion (renders instantly).
 *
 * Visibility contract (progressive enhancement): the .rv base class is fully
 * visible, so SSR / pre-hydration paint never shows a blank section. This
 * hook hides the element BEFORE first post-hydration paint (layout effect)
 * and lets the observer reveal it — above-fold content animates in exactly
 * as before, below-fold content stays hidden until scrolled into view.
 */
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function Reveal({ children, className = "", delay = 0, as }: Props) {
  const ref = useRef<HTMLElement | null>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("rv-in");
      return;
    }
    el.classList.add("rv-hidden");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.classList.add("rv-in");
            io.disconnect();
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = (as ?? "div") as ElementType;

  return (
    <Tag
      ref={ref}
      className={`rv ${className}`}
      style={{ "--rd": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
