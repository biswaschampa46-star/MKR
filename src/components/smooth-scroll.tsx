"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import Lenis from "lenis";

/**
 * THE single smooth-scroll + scroll-motion engine for the public site.
 *
 * - ONE Lenis instance, ONE requestAnimationFrame loop (owned by Lenis).
 * - ONE IntersectionObserver for the [data-reveal] system (opacity /
 *   transform / clip-path only — compositable, no layout thrash).
 * - ONE MutationObserver so elements mounted by client-side navigation
 *   (e.g. pressing Back to return to the homepage) are picked up too —
 *   without it, route-changed content would stay hidden forever.
 * - ONE parallax pass, driven by Lenis's own scroll event (no second RAF):
 *   elements marked [data-parallax] with data-parallax-speed get a
 *   translate3d via the --parallax-y custom property (CSS in globals.css).
 * - ONE floating product peek (`.peek-jeans`, dark/light jeans + black shirt):
 *   scroll-progress driven HIDDEN → PEEK IN → HOLD → PEEK OUT → HIDDEN
 *   teaser with staggered enter/exit, driven by direct DOM writes inside
 *   the same scroll pass — no React state, no extra listeners, transforms only.
 * - Honours prefers-reduced-motion: no Lenis, no parallax, instant reveals,
 *   product peek still visible but snaps instantly (no inertia/blur motion).
 * - Mounted once in the (site) layout, never in admin.
 */
/**
 * Price count-up: animates the textContent of [data-countup] elements from 0
 * to their target number when revealed. Reduced motion renders instantly.
 * Format template (e.g. currency glyph + {n}) keeps currency glyphs.
 */
function startCountUp(element: HTMLElement) {
  const target = element.querySelector<HTMLElement>("[data-countup]");
  if (!target || target.dataset.countupDone === "1") return;
  const value = Number(target.dataset.countup);
  if (!Number.isFinite(value)) return;
  target.dataset.countupDone = "1";
  const template = target.dataset.countupTemplate ?? "{n}";
  const render = (n: number) => {
    target.textContent = template.replace("{n}", Math.round(n).toLocaleString("en-BD"));
  };
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || value <= 0) {
    render(value);
    return;
  }
  const duration = 900;
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    // ease-out-expo, clamped to final value
    const eased = t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
    render(value * eased);
    if (t < 1) requestAnimationFrame(tick);
    else render(value);
  };
  requestAnimationFrame(tick);
}

/* Floating peek cutouts — admin-configurable (Settings → Peek images).
   Falls back to the bundled brand cutouts when a slot is unset. */
export type PeekSources = {
  left?: { lead?: string | null; follow?: string | null; shirt?: string | null };
  right?: { lead?: string | null; follow?: string | null; shirt?: string | null };
};

/* Viewport subscription for the peek-mount gate: one resize listener shared
   by the component instance; getSnapshot reads live width. */
const subscribeViewport = (onStoreChange: () => void) => {
  window.addEventListener("resize", onStoreChange);
  return () => window.removeEventListener("resize", onStoreChange);
};

export function SmoothScroll({ peekSources }: { peekSources?: PeekSources }) {
  // Floating product peek: fixed-position, transform-only.
  // Direct DOM writes — no React state, no re-renders on scroll.
  const peekOuterRef = useRef<HTMLDivElement | null>(null);
  const peekLeadRef = useRef<HTMLDivElement | null>(null);
  const peekFollowRef = useRef<HTMLDivElement | null>(null);
  const peekShirtRef = useRef<HTMLDivElement | null>(null);
  // Second, mirrored stack for the RIGHT viewport edge (desktop/tablet only).
  const peekOuterRightRef = useRef<HTMLDivElement | null>(null);
  const peekLeadRightRef = useRef<HTMLDivElement | null>(null);
  const peekFollowRightRef = useRef<HTMLDivElement | null>(null);
  const peekShirtRightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    // ── MOBILE: the desktop peek composition never runs on phones ──
    // Phones get the admin's single MobileHeroImage (mobile-hero-image.tsx)
    // instead of the floating shirt+pants stack. Everything below the early
    // return — Lenis, reveals, parallax, peek animation — stays desktop/tablet
    // only, so no desktop clothing assets are driven on mobile and no
    // duplicate animation engine exists. Reveals must still fire (safety):
    // run a minimal reveal-only pass so mobile content is never invisible.
    if (window.innerWidth <= 768) {
      document
        .querySelectorAll<HTMLElement>("[data-reveal]:not(.is-revealed)")
        .forEach((element) => element.classList.add("is-revealed"));
      const mobileMutations = new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (node instanceof HTMLElement) {
              if (node.matches?.("[data-reveal]:not(.is-revealed)")) node.classList.add("is-revealed");
              node.querySelectorAll?.("[data-reveal]:not(.is-revealed)").forEach((el) => el.classList.add("is-revealed"));
            }
          }
        }
      });
      mobileMutations.observe(document.body, { childList: true, subtree: true });

      // Mobile-only scroll-linked dissolve for the existing outlined MKR.
      // The text remains the source of truth; this layer samples its rendered
      // shape once and paints deterministic dust fragments from the same glyphs.
      const watermark = document.querySelector<HTMLElement>(".peek-watermark");
      let particleRaf = 0;
      let removeParticleCanvas: (() => void) | null = null;

      if (watermark && !reduced.matches) {
        const sample = document.createElement("canvas");
        const sampleContext = sample.getContext("2d", { willReadFrequently: true });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        // Edge-first dust. Each particle remembers the exact glyph pixel it
        // came from, how deep that pixel sits inside the stroke, and an outward
        // normal so dust leaves along the letter contour — never as a filled
        // rectangle of particles.
        const particles: Array<{
          ox: number;
          oy: number;
          nx: number;
          ny: number;
          span: number;
          travel: number;
          size: number;
          alpha: number;
          phase: number;
          amp: number;
          fade: number;
          tone: number;
        }> = [];

        // Paint margin around the word so drifting dust is never clipped.
        let glyphMargin = 72;

        if (sampleContext && context) {
          const rebuild = () => {
            const rect = watermark.getBoundingClientRect();
            const width = Math.max(1, Math.round(rect.width));
            const height = Math.max(1, Math.round(rect.height));
            const margin = Math.round(Math.max(48, Math.min(120, height * 0.85)));
            glyphMargin = margin;

            // Canvas is larger than the word so dust can drift outward without
            // being clipped into a rectangular block.
            canvas.width = Math.round((width + margin * 2) * dpr);
            canvas.height = Math.round((height + margin * 2) * dpr);
            canvas.style.width = `${width + margin * 2}px`;
            canvas.style.height = `${height + margin * 2}px`;
            canvas.style.transform = `translate3d(${Math.round(rect.left - margin)}px, ${Math.round(rect.top - margin)}px, 0)`;

            sample.width = width;
            sample.height = height;
            const styles = getComputedStyle(watermark);
            const text = watermark.textContent?.trim() || "MKR";
            sampleContext.setTransform(1, 0, 0, 1, 0, 0);
            sampleContext.clearRect(0, 0, width, height);
            sampleContext.font = `${styles.fontWeight || 600} ${styles.fontSize || "9rem"}/${styles.lineHeight || "1"} ${styles.fontFamily || "sans-serif"}`;
            sampleContext.textAlign = "center";
            sampleContext.textBaseline = "alphabetic";
            (sampleContext as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing =
              styles.letterSpacing;
            const metrics = sampleContext.measureText(text);
            const ascent = metrics.fontBoundingBoxAscent || metrics.actualBoundingBoxAscent || height * 0.75;
            const descent = metrics.fontBoundingBoxDescent || metrics.actualBoundingBoxDescent || height * 0.25;
            const baseline = (height - (ascent + descent)) / 2 + ascent;
            sampleContext.fillStyle = "#fff";
            sampleContext.fillText(text, width / 2, baseline);
            const pixels = sampleContext.getImageData(0, 0, width, height).data;

            // Binary glyph mask + chamfer distance INSIDE the letterforms. The
            // distance lets contour pixels dissolve first and stroke interiors
            // last, so the letters erode naturally from their edges inward.
            const total = width * height;
            const inside = new Uint8Array(total);
            for (let i = 0; i < total; i += 1) inside[i] = pixels[i * 4 + 3] > 96 ? 1 : 0;
            const inf = 1e4;
            const depth = new Float32Array(total);
            for (let i = 0; i < total; i += 1) depth[i] = inside[i] ? inf : 0;
            const relax = (index: number, neighbour: number, weight: number) => {
              const candidate = depth[neighbour] + weight;
              if (candidate < depth[index]) depth[index] = candidate;
            };
            for (let y = 1; y < height; y += 1) {
              for (let x = 1; x < width; x += 1) {
                const i = y * width + x;
                if (!inside[i]) continue;
                relax(i, i - 1, 1);
                relax(i, i - width, 1);
                relax(i, i - width - 1, 1.414);
                if (x + 1 < width) relax(i, i - width + 1, 1.414);
              }
            }
            for (let y = height - 2; y >= 0; y -= 1) {
              for (let x = width - 2; x >= 0; x -= 1) {
                const i = y * width + x;
                if (!inside[i]) continue;
                relax(i, i + 1, 1);
                relax(i, i + width, 1);
                relax(i, i + width + 1, 1.414);
                if (x > 0) relax(i, i + width - 1, 1.414);
              }
            }
            // Contour-weighted sampling: edge pixels are relatively common,
            // stroke interiors progressively rarer — so the result reads as an
            // eroding outline, never a solid filled mass.
            particles.length = 0;
            let seed = 1947;
            const random = () => {
              seed = (seed * 16807) % 2147483647;
              return (seed - 1) / 2147483646;
            };
            for (let y = 1; y < height - 1; y += 1) {
              for (let x = 1; x < width - 1; x += 1) {
                const i = y * width + x;
                if (!inside[i]) continue;
                const edge = depth[i];
                if (edge > 7) continue;
                const keep = edge <= 2.4 ? 0.075 : edge <= 4.2 ? 0.03 : edge <= 6 ? 0.01 : 0.004;
                if (random() > keep) continue;
                // Outward normal from the distance field (depth grows inward),
                // plus a small sideways lean so paths follow the strokes
                // instead of collapsing into horizontal bands.
                let nx = depth[i - 1] - depth[i + 1];
                let ny = depth[i - width] - depth[i + width];
                const len = Math.hypot(nx, ny);
                if (len < 0.001) {
                  const angle = random() * Math.PI * 2;
                  nx = Math.cos(angle);
                  ny = Math.sin(angle);
                } else {
                  nx /= len;
                  ny /= len;
                }
                const lean = (random() - 0.5) * 0.7;
                const jitterAngle = (random() - 0.5) * 0.5;
                const cos = Math.cos(jitterAngle);
                const sin = Math.sin(jitterAngle);
                const sideX = -ny * lean;
                const sideY = nx * lean;
                let dx = (nx + sideX) * cos - (ny + sideY) * sin;
                let dy = (nx + sideX) * sin + (ny + sideY) * cos - 0.14;
                const dl = Math.hypot(dx, dy) || 1;
                dx /= dl;
                dy /= dl;

                const far = random() > 0.9;
                const roll = random();
                const tier = edge <= 1.2 ? 0 : edge <= 2.4 ? 1 : edge <= 4.2 ? 2 : edge <= 6 ? 3 : 4;
                // Dissolve order: contour dust leaves first, stroke cores last.
                // A small early wave lets a few specks detach around 20% scroll
                // while the word is still almost completely readable.
                const early = tier === 0 && random() > 0.78;
                const span = early
                  ? 0.06 + random() * 0.1
                  : [0.5, 0.62, 0.72, 0.82, 0.9][tier] + random() * 0.14;
                particles.push({
                  ox: x,
                  oy: y,
                  nx: dx,
                  ny: dy,
                  span,
                  travel: far ? 12 + random() * 12 : 3 + edge * 1.4 + random() * 11,
                  size:
                    roll > 0.965
                      ? 1.3 + random() * 0.6
                      : roll > 0.87
                        ? 0.9 + random() * 0.35
                        : 0.45 + random() * 0.4,
                  alpha:
                    (roll > 0.955 ? 0.26 + random() * 0.1 : roll > 0.8 ? 0.14 + random() * 0.1 : 0.07 + random() * 0.11) *
                    (1 - Math.min(0.45, edge * 0.06)),
                  phase: random() * Math.PI * 2,
                  amp: 0.05 + random() * 0.12,
                  fade: random() > 0.88 ? 0.55 : 0.95,
                  tone: random() > 0.7 ? 1 : 0,
                });
              }
            }
          };

          canvas.className = "mkr-particle-layer";
          canvas.setAttribute("aria-hidden", "true");
          // Keep the visual layer in the root stacking context. The source
          // watermark stays in its original section; only this canvas is fixed.
          document.body.appendChild(canvas);
          rebuild();

          const drawDust = (time: number, eased: number) => {
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.setTransform(dpr, 0, 0, dpr, glyphMargin * dpr, glyphMargin * dpr);
            context.globalCompositeOperation = "source-over";
            for (const particle of particles) {
              // Each speck owns a span: contour dust finishes early, stroke
              // cores finish late, so erosion reads as letters breaking apart.
              const t = Math.max(0, Math.min(1, eased / particle.span));
              const motion = t * t * (3 - 2 * t);
              // Pure function of scroll progress — scrolling back up walks the
              // dust home to its exact original glyph pixel.
              const x = particle.ox + particle.nx * particle.travel * motion;
              const y = particle.oy + particle.ny * particle.travel * motion;
              const twinkle = 1 + Math.sin(time * 0.0022 + particle.phase) * particle.amp;
              // A whisper of activity while the letter is intact, fully present
              // once detached, then thinned into a sparse field.
              const presence = 0.1 + motion * 0.9;
              const alpha = particle.alpha * twinkle * presence * (1 - eased * particle.fade);
              if (alpha < 0.012) continue;
              context.fillStyle = particle.tone
                ? `rgba(176, 208, 234, ${alpha.toFixed(3)})`
                : `rgba(226, 240, 252, ${alpha.toFixed(3)})`;
              if (particle.size <= 1) {
                // Sub-pixel dust is painted as a crisp speck so it survives
                // antialiasing on high-DPR phones without any bloom.
                context.fillRect(x - 0.5, y - 0.5, 1, 1);
              } else {
                context.beginPath();
                context.arc(x, y, particle.size, 0, Math.PI * 2);
                context.fill();
              }
            }
            watermark.style.setProperty("--mkr-dissolve", eased.toFixed(4));
          };

          const readProgress = (top: number) =>
            Math.max(0, Math.min(1, (window.innerHeight * 0.78 - top) / (window.innerHeight * 0.92)));

          const ensureLoop = () => {
            if (!particleRaf) particleRaf = requestAnimationFrame(tick);
          };
          const tick = (time: number) => {
            particleRaf = 0;
            const rect = watermark.getBoundingClientRect();
            // Idle when the wordmark is off-screen; scroll wakes the loop again.
            if (rect.bottom <= -glyphMargin || rect.top >= window.innerHeight + glyphMargin) {
              context.setTransform(1, 0, 0, 1, 0, 0);
              context.clearRect(0, 0, canvas.width, canvas.height);
              return;
            }
            canvas.style.transform = `translate3d(${Math.round(rect.left - glyphMargin)}px, ${Math.round(rect.top - glyphMargin)}px, 0)`;
            const progress = readProgress(rect.top);
            drawDust(time, progress * progress * (3 - 2 * progress));
            particleRaf = requestAnimationFrame(tick);
          };
          const onResize = () => {
            rebuild();
            ensureLoop();
          };
          window.addEventListener("scroll", ensureLoop, { passive: true });
          window.addEventListener("resize", onResize, { passive: true });
          ensureLoop();

          removeParticleCanvas = () => {
            window.removeEventListener("scroll", ensureLoop);
            window.removeEventListener("resize", onResize);
            cancelAnimationFrame(particleRaf);
            particleRaf = 0;
            canvas.remove();
            watermark.style.removeProperty("--mkr-dissolve");
          };
        }
      }

      // Native CSS smooth scrolling keeps anchors pleasant on phones.
      document.documentElement.style.scrollBehavior = "smooth";
      return () => {
        mobileMutations.disconnect();
        removeParticleCanvas?.();
        document.documentElement.style.scrollBehavior = "";
      };
    }

    // ── Reveal system ──
    let observer: IntersectionObserver | null = null;
    const reveal = (element: HTMLElement) => {
      element.classList.add("is-revealed");
      // Count-up targets animate their numeric text once revealed.
      startCountUp(element);
    };

    // Parallax registry is refreshed whenever new content mounts.
    let parallaxElements: HTMLElement[] = [];
    const applyParallax = () => {
      const viewportHeight = window.innerHeight;
      for (const element of parallaxElements) {
        const speed = Number(element.dataset.parallaxSpeed ?? "0.12");
        const rect = element.getBoundingClientRect();
        // -1 (below viewport) … 0 (centred) … 1 (above viewport)
        const progress = (rect.top + rect.height / 2 - viewportHeight / 2) / viewportHeight;
        element.style.setProperty("--parallax-y", `${(progress * speed * 100).toFixed(1)}px`);
      }
    };

    // ── Floating product peek (jeans + shirt) ──
    // Homepage-only, scroll-progress journey anchored to [data-peek-zone]
    // (the "MKR standard" statement). Products peek in with a cinematic arc +
    // rack focus, hold, then retreat BEFORE Featured pieces arrives.
    // Any other route has no zone → permanently hidden (no fallback path).
    // Per-property staggered easings (quart/cubic) give the move a filmed,
    // weighted feel — still only transform/opacity/filter, no layout.
    const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
    const smooth01 = (value: number) => {
      const t = clamp01(value);
      return t * t * (3 - 2 * t);
    };
    // Cinematic easings — editorial slow-in/slow-out with soft bias.
    // Enter uses a gentler cubic-bezier–like curve (less mechanical than pure quart);
    // exit keeps the sine cosine ramp for a weighted, inertial retreat.
    const easeInOutQuart = (t: number) => {
      const c = clamp01(t);
      // Approx cubic-bezier(0.65, 0, 0.35, 1) via smootherstep hybrid
      return c * c * c * (c * (c * 6 - 15) + 10) * 0.35 + (c < 0.5 ? 8 * c * c * c * c : 1 - Math.pow(-2 * c + 2, 4) / 2) * 0.65;
    };
    const easeInCubic = (t: number) => {
      const c = clamp01(t);
      return c * c * c;
    };
    // Soft ease-out for exit fade continuity (micro-interaction polish).
    const easeOutQuad = (t: number) => {
      const c = clamp01(t);
      return 1 - (1 - c) * (1 - c);
    };

    // Peek-zone registry: one or more [data-peek-zone] sections form a
    // union (homepage statement). Refreshed in rescan for client nav.
    let peekZones: HTMLElement[] = [];
    const refreshPeekZone = () => {
      peekZones = [...document.querySelectorAll<HTMLElement>("[data-peek-zone]")].filter(
        (zone) => zone.isConnected,
      );
    };

    // Cinematic inertia: scroll sets TARGET enter/exit; a rAF loop eases
    // the RENDERED values toward them (frame-rate-independent exp smoothing).
    // Adaptive τ: slightly tighter when far behind a fast scroll so the
    // motion never feels stuck, still luxurious (~200–280ms) when close.
    let targetEnter = 0;
    let targetExit = 0;
    let smoothEnter = 0;
    let smoothExit = 0;
    let peekRaf = 0;
    let peekLastTime = 0;
    let peekSettled = true;
    // Monotonic clock for idle motion (levitation) — ms since first frame.
    let peekClock = 0;
    // Coarse viewport class for mobile-aware rest offsets (no per-frame matchMedia).
    const isNarrow = () => window.innerWidth <= 768;

    // Delay a 0→1 channel so the follower starts after the lead
    // (one-by-one in, one-by-one out). Still clamps cleanly to 0/1.
    const stagger = (value: number, delay: number) =>
      smooth01((clamp01(value) - delay) / (1 - delay));

    // Hold X from the LIVE text edge: each layer’s OPAQUE right edge is
    // pushed as far right as possible while keeping a clear gap before type.
    const OPAQUE_RIGHT = { lead: 0.82, follow: 0.8, shirt: 0.92 } as const;
    type PeekRole = "lead" | "follow" | "shirt";
    let edgeGap = 20;
    let edgeTextLeft = 128;
    const refreshTextEdge = (narrow: boolean) => {
      const eyebrow = document.querySelector<HTMLElement>("[data-peek-zone] .eyebrow");
      const headline = document.querySelector<HTMLElement>("[data-peek-zone] .display-1");
      const textLeft = eyebrow
        ? eyebrow.getBoundingClientRect().left
        : headline
          ? headline.getBoundingClientRect().left
          : 128;
      // Tight but clear empty band — product body stays readable and visible.
      // Narrow keeps a slimmer 8px gap so the strip reads (~32px visible).
      edgeGap = narrow ? 8 : 18;
      edgeTextLeft = textLeft;
    };
    // tx% that places this layer’s opaque content at (textLeft - gap).
    // Clamp the FINAL translate (holdX + restX), not holdX alone — otherwise
    // restX compensation is lost on narrow viewports and the shirt covers type.
    const holdXFor = (role: PeekRole, restX: number, scale: number, w: number) => {
      const frac = OPAQUE_RIGHT[role];
      // opaque_right/w = 0.5 + (frac - 0.5) * scale + finalTx/100
      // (transform-origin is center; scale applies before translate).
      const target = (edgeTextLeft - edgeGap) / w;
      const desiredFinal = 100 * (target - 0.5 - (frac - 0.5) * scale);
      // Keep a readable opaque band on-screen; never push past the type edge.
      const minOpaque = edgeTextLeft < 60 ? 16 : 40;
      const minFinal = 100 * (minOpaque / w - 0.5 - (frac - 0.5) * scale);
      const finalTx = Math.max(minFinal, Math.min(desiredFinal, -24));
      return finalTx - restX;
    };

    const renderPeek = (enter: number, exit: number) => {
      const outer = peekOuterRef.current;
      const lead = peekLeadRef.current;
      const follow = peekFollowRef.current;
      const shirt = peekShirtRef.current;
      if (!outer || !lead || !follow || !shirt) return;

      // Dark jeans lead → light jeans follows → black shirt trails.
      // Staggered enter AND exit (one-by-one in, one-by-one out).
      const ENTER_STAGGER = 0.28;
      const ENTER_STAGGER_SHIRT = 0.5;
      const EXIT_STAGGER = 0.24;
      const EXIT_STAGGER_SHIRT = 0.42;
      const items: { el: HTMLElement; enter: number; exit: number; role: PeekRole }[] = [
        { el: lead, enter, exit, role: "lead" },
        {
          el: follow,
          enter: stagger(enter, ENTER_STAGGER),
          exit: stagger(exit, EXIT_STAGGER),
          role: "follow",
        },
        {
          el: shirt,
          enter: stagger(enter, ENTER_STAGGER_SHIRT),
          exit: stagger(exit, EXIT_STAGGER_SHIRT),
          role: "shirt",
        },
      ];

      let anyVisible = false;
      const narrow = isNarrow();
      // Desktop/tablet shows the twin stacks on BOTH edges simultaneously;
      // phones dock a single centered stack. The right stack is rendered
      // separately at the end of this function.
      // Mobile dock: the 40px phone gutter can never fit a garment, so a
      // left-edge peek is always a crop. Instead the whole stack rides the
      // EMPTY band between the marquee strip and the statement eyebrow —
      // fully on-screen, never over type. All measurements are live, so the
      // dock tracks any viewport (portrait, landscape, small phones) and the
      // garments shrink-to-fit if the band ever runs short. Desktop/tablet
      // keep the classic left-edge peek below.
      let dockY = 0;
      let fitScale = 1;
      if (narrow) {
        const zone = peekZones[0];
        const eyebrowEl = zone?.querySelector<HTMLElement>(".eyebrow") ?? null;
        // The marquee can be several siblings above the zone (full-bleed
        // wrappers, conditional sections) — walk back until we find an
        // element whose bottom sits above the zone top.
        let marqueeEl: HTMLElement | null = null;
        let prev = zone?.previousElementSibling;
        const zoneTop = zone ? zone.getBoundingClientRect().top : 0;
        while (prev instanceof HTMLElement) {
          if (prev.getBoundingClientRect().bottom <= zoneTop + 2) {
            marqueeEl = prev;
            break;
          }
          prev = prev.previousElementSibling;
        }
        if (zone && eyebrowEl) {
          const zr = zone.getBoundingClientRect();
          const er = eyebrowEl.getBoundingClientRect();
          // Defensive: sibling must sit just above the zone; otherwise fall
          // back to the zone's own padding band.
          const siblingBottom = marqueeEl?.getBoundingClientRect().bottom;
          const bandTop =
            siblingBottom !== undefined && siblingBottom <= zr.top + 2 && siblingBottom > zr.top - 400
              ? siblingBottom
              : zr.top;
          const bandH = er.top - bandTop;
          const outerW = outer.offsetWidth || 140;
          const stackH = outerW * 1.5;
          // Never shrink below half size — a too-tiny stack reads as clutter.
          // 28px breathing room keeps the stack clear of marquee and eyebrow.
          fitScale = bandH > 56 ? Math.max(0.5, Math.min(1, (bandH - 28) / stackH)) : 0.5;
          // Container center sits at 50% viewport (see CSS); shift items so
          // the stack centers on the band. When the band is unreliable
          // (section not yet laid out / eyebrow still offscreen), center on
          // the zone itself so the stack can never ride up over the
          // headline or marquee.
          const anchorCenter = bandH >= 40 ? bandTop + bandH / 2 : zr.top + zr.height / 2;
          dockY = anchorCenter - window.innerHeight * 0.5;
        }
      }
      for (const item of items) {
        const { el, role } = item;
        const presence = item.enter * (1 - item.exit);
        if (presence <= 0.001) {
          el.style.opacity = "0";
          el.style.filter = "";
          continue;
        }
        anyVisible = true;

        const enterE = easeInOutQuart(item.enter);
        const exitE = 0.5 - 0.5 * Math.cos(Math.PI * clamp01(item.exit));
        const presenceE = enterE * (1 - exitE);

        // Soft opacity continuity: slightly delayed fade-in, earlier fade-out
        // so nothing pops; later layers linger a touch longer on exit.
        const fadeIn = easeOutQuad(item.enter) * 1.2;
        const linger = role === "shirt" ? 2.5 : role === "follow" ? 2.3 : 2.1;
        const fade = clamp01(Math.min(fadeIn, (1 - item.exit) * linger));

        // Layer rest offsets: follow/shirt step RIGHT so every layer’s
        // body stays clearly visible (shirt leads the front of the stack).
        // Dock mode keeps the stack compact (no vertical fan) so the whole
        // garments fit the band.
        const restX = role === "follow" ? (narrow ? 3 : 6) : role === "shirt" ? (narrow ? 6 : 12) : 0;
        const restY = narrow ? 0 : role === "follow" ? 26 : role === "shirt" ? -18 : 0;
        // Hold tilt ≈ −6° base (editorial lean); restRoll keeps each layer in ~5–8°.
        const restRoll = role === "follow" ? (narrow ? -1 : -1.5) : role === "shirt" ? (narrow ? 0.5 : 1) : 0;
        const restScale =
          (role === "follow" ? 0.94 : role === "shirt" ? 0.86 : 1) * (narrow ? fitScale : 1);
        if (!narrow) refreshTextEdge(narrow);
        const outerW = outer.offsetWidth || 300;
        // Right dock: hold shows the LEFT part of the stack cropped by the
        // right edge; shifted so the visible edge clears the headline.
        const holdX = narrow ? 0 : holdXFor(role, restX, restScale, outerW);
        // Enter starts off-left so mid-enter already reveals product body.
        // Dock mode: rises ~120px into the band with a gentle sway (peek-in).
        const tx = narrow
          ? restX * presenceE + Math.sin(presenceE * Math.PI) * 5 * (role === "shirt" ? 1.1 : 1)
          : -96 + (holdX + 96) * presenceE + restX * presenceE;
        const arc = Math.sin(presenceE * Math.PI);
        // Subtle depth/parallax: later layers drift a hair more for separation.
        const depthDrift = role === "shirt" ? 1.1 : role === "follow" ? 1.06 : 1;
        const driftY = narrow
          ? // Peek-in: rises 120px from below the band; peek-out: floats 90px
            // up and away — a visible cinematic arc, not a static fade.
            dockY + (1 - enterE) * 120 * depthDrift - exitE * 90 * depthDrift
          : // Both edges share the right stack's cinematic rise: enters from
            // 80px below, floats 60px up on retreat — a vertical arc, not a
            // static drift.
            ((1 - enterE) * 80 - exitE * 60 + restY * presenceE) * depthDrift;
        // Enter rights an 11° lean to straight; exit tilts back — mirrored
        // per side so both stacks lean INTO their viewport edge.
        const roll = narrow
          ? 7 - 7 * enterE + 6 * easeInCubic(item.exit) + restRoll
          : -11 + 11 * enterE - 6 * easeInCubic(item.exit) + restRoll;
        // Imperceptible yaw + slight differential between layers for depth.
        const yawExtra = role === "shirt" ? 2 : role === "follow" ? 1.2 : 0;
        const yawBase = -7 + 7 * enterE - 3.5 * exitE + yawExtra * (1 - presenceE);
        const yaw = yawBase;
        // Grows from 84% on enter, shrinks slightly on retreat (both stacks).
        const scale = (0.84 + 0.16 * enterE) * (1 - 0.1 * exitE) * restScale;
        // Idle levitation on mobile hold: a slow 2.6s float loop so the
        // stack never sits frozen — phase-shifted per layer for depth.
        let idleY = 0;
        if (narrow && presenceE > 0.9) {
          const holdPhase = clamp01((presenceE - 0.9) / 0.1);
          const t = (peekClock / 2600) * Math.PI * 2 + (role === "follow" ? 1.4 : role === "shirt" ? 2.4 : 0);
          idleY = Math.sin(t) * 5 * holdPhase;
        }
        // Rack focus: sharper as it settles; keep blur subtle (≤1.2px) for
        // GPU cost + luxury restraint.
        const sharpness = clamp01(Math.min(item.enter, 1 - item.exit) * 2.4);
        const blurPx = (1 - sharpness) * (role === "lead" ? 1.2 : 1.1);

        el.style.opacity = fade.toFixed(3);
        el.style.transform =
          `translate3d(${tx.toFixed(2)}%, ${(driftY + idleY).toFixed(1)}px, 0) ` +
          `rotate(${roll.toFixed(2)}deg) ` +
          `rotateY(${yaw.toFixed(2)}deg) ` +
          `scale(${scale.toFixed(3)})`;
        el.style.filter = blurPx > 0.05 ? `blur(${blurPx.toFixed(2)}px)` : "";
      }

      outer.style.opacity = "1";
      outer.style.visibility = anyVisible ? "visible" : "hidden";
      // will-change only while layers are live (saves compositing memory when idle).
      outer.classList.toggle("is-live", anyVisible);

      // ── RIGHT stack (desktop/tablet only): mirrored twin of the left ──
      // Same choreography, X/tilt/yaw negated, docking off the right edge.
      // Mobile hides the right stack entirely (CSS display:none).
      const outerR = peekOuterRightRef.current;
      const leadR = peekLeadRightRef.current;
      const followR = peekFollowRightRef.current;
      const shirtR = peekShirtRightRef.current;
      if (outerR && leadR && followR && shirtR) {
        const rightItems = [
          { el: leadR, enter, exit, role: "lead" as PeekRole },
          { el: followR, enter: stagger(enter, ENTER_STAGGER), exit: stagger(exit, EXIT_STAGGER), role: "follow" as PeekRole },
          { el: shirtR, enter: stagger(enter, ENTER_STAGGER_SHIRT), exit: stagger(exit, EXIT_STAGGER_SHIRT), role: "shirt" as PeekRole },
        ];
        let anyVisibleR = false;
        for (const item of rightItems) {
          const el = item.el;
          const role = item.role;
          const presence = item.enter * (1 - item.exit);
          if (presence <= 0.001) {
            el.style.opacity = "0";
            el.style.filter = "";
            continue;
          }
          anyVisibleR = true;
          const enterE = easeInOutQuart(item.enter);
          const exitE = 0.5 - 0.5 * Math.cos(Math.PI * clamp01(item.exit));
          const presenceE = enterE * (1 - exitE);
          const fadeIn = easeOutQuad(item.enter) * 1.2;
          const linger = role === "shirt" ? 2.5 : role === "follow" ? 2.3 : 2.1;
          const fade = clamp01(Math.min(fadeIn, (1 - item.exit) * linger));
          const restX = role === "follow" ? 6 : role === "shirt" ? 12 : 0;
          const restY = role === "follow" ? 26 : role === "shirt" ? -18 : 0;
          const restRoll = role === "follow" ? -1.5 : role === "shirt" ? 1 : 0;
          const restScale = role === "follow" ? 0.94 : role === "shirt" ? 0.86 : 1;
          // Mirrored hold: stack rides right:0, so POSITIVE tx crops it off
          // the right edge. Enter at +96% (off-screen) → hold at +24%+restX
          // (≈350px of garment body visible, clear of the headline).
          const tx = 96 - (96 - 24 - restX) * presenceE;
          const arc = Math.sin(presenceE * Math.PI);
          const depthDrift = role === "shirt" ? 1.1 : role === "follow" ? 1.06 : 1;
          const driftY = ((1 - enterE) * 80 - exitE * 60 + restY * presenceE) * depthDrift;
          const roll = 11 - 11 * enterE + 6 * easeInCubic(item.exit) - restRoll;
          const yawExtra = role === "shirt" ? 2 : role === "follow" ? 1.2 : 0;
          const yawBase = -7 + 7 * enterE - 3.5 * exitE + yawExtra * (1 - presenceE);
          const yaw = -yawBase;
          const scale = (0.95 + 0.05 * presenceE) * restScale;
          const sharpness = clamp01(Math.min(item.enter, 1 - item.exit) * 2.4);
          const blurPx = (1 - sharpness) * (role === "lead" ? 1.2 : 1.1);
          el.style.opacity = fade.toFixed(3);
          el.style.transform =
            `translate3d(${tx.toFixed(2)}%, ${driftY.toFixed(1)}px, 0) ` +
            `rotate(${roll.toFixed(2)}deg) ` +
            `rotateY(${yaw.toFixed(2)}deg) ` +
            `scale(${scale.toFixed(3)})`;
          el.style.filter = blurPx > 0.05 ? `blur(${blurPx.toFixed(2)}px)` : "";
        }
        outerR.style.opacity = "1";
        outerR.style.visibility = anyVisibleR ? "visible" : "hidden";
        outerR.classList.toggle("is-live", anyVisibleR);
      }
    };

    // Inertia loop — runs only while smoothed values chase targets.
    // Adaptive time constant: pulls τ from ~280ms (settled) toward ~200ms
    // when far behind a fast scroll, so motion never sticks but stays weighted.
    const peekTick = (now: number) => {
      peekRaf = 0;
      const dt = peekLastTime ? Math.min(64, now - peekLastTime) : 16.7;
      peekLastTime = now;
      peekClock += dt;
      const gap = Math.max(
        Math.abs(targetEnter - smoothEnter),
        Math.abs(targetExit - smoothExit),
      );
      const tau = 280 - Math.min(80, gap * 140);
      const k = 1 - Math.exp(-dt / tau);
      smoothEnter += (targetEnter - smoothEnter) * k;
      smoothExit += (targetExit - smoothExit) * k;
      const dEnter = Math.abs(targetEnter - smoothEnter);
      const dExit = Math.abs(targetExit - smoothExit);
      if (dEnter < 0.0015 && dExit < 0.0015) {
        smoothEnter = targetEnter;
        smoothExit = targetExit;
        peekSettled = true;
        peekLastTime = 0;
      } else {
        peekSettled = false;
      }
      renderPeek(smoothEnter, smoothExit);
      // Keep the loop alive while the mobile stack is on hold so the idle
      // levitation keeps playing (settled render otherwise freezes it).
      const idleActive =
        isNarrow() && smoothEnter > 0.9 && smoothExit < 0.1;
      if (!peekSettled || idleActive) peekRaf = requestAnimationFrame(peekTick);
      else peekLastTime = 0;
    };

    const applyPeek = () => {
      const zones = peekZones.filter((zone) => zone.isConnected);
      // Homepage only: no [data-peek-zone] → product stays hidden.
      if (zones.length === 0) {
        targetEnter = 0;
        targetExit = 0;
        if (reduced.matches) {
          smoothEnter = 0;
          smoothExit = 0;
          renderPeek(0, 0);
          peekSettled = true;
          return;
        }
        if (peekSettled && smoothEnter === 0 && smoothExit === 0) return;
      } else {
        // Enter as the zone (homepage statement) arrives; hold while it
        // travels the viewport; fully retreat BEFORE Featured pieces.
        let top = Infinity;
        let bottom = -Infinity;
        for (const zone of zones) {
          const rect = zone.getBoundingClientRect();
          top = Math.min(top, rect.top);
          bottom = Math.max(bottom, rect.bottom);
        }
        const vh = window.innerHeight;
        // Wide scroll budget so the arc spans a lot of the journey.
        // Exit starts only once the zone bottom clears the viewport bottom
        // so the statement reading position is a true hold (exit ≈ 0),
        // but still completes by the time featured content is centered.
        const start = vh * 1.3;
        const full = vh * 0.7;
        const exitStart = vh * 1.0;
        const exitEnd = vh * 0.45;
        targetEnter = smooth01((start - top) / (start - full));
        targetExit = smooth01((exitStart - bottom) / (exitStart - exitEnd));
      }

      if (reduced.matches) {
        // Instant snap under prefers-reduced-motion — images remain visible
        // (no CSS display:none), just without inertia or decorative motion.
        smoothEnter = targetEnter;
        smoothExit = targetExit;
        renderPeek(smoothEnter, smoothExit);
        peekSettled = true;
        return;
      }

      // Chase targets with the inertia loop (or paint once if settled).
      const needsChase =
        Math.abs(targetEnter - smoothEnter) > 0.0015 ||
        Math.abs(targetExit - smoothExit) > 0.0015;
      if (needsChase) {
        peekSettled = false;
        if (!peekRaf) {
          peekLastTime = 0;
          peekRaf = requestAnimationFrame(peekTick);
        }
      } else if (!peekRaf) {
        smoothEnter = targetEnter;
        smoothExit = targetExit;
        peekSettled = true;
        renderPeek(smoothEnter, smoothExit);
      }
    };

    const requestPeek = () => {
      applyPeek();
    };
    const onScrollFrame = () => {
      applyParallax();
      requestPeek();
    };

    let unsubscribeScroll: (() => void) | null = null;
    let safetyTimer = 0;

    // Scan for unrevealed [data-reveal] elements and track [data-parallax].
    // Called on mount AND whenever the MutationObserver sees new content.
    const rescan = () => {
      const viewportHeight = window.innerHeight;
      document
        .querySelectorAll<HTMLElement>("[data-reveal]:not(.is-revealed)")
        .forEach((element) => {
          if (reduced.matches || !observer) {
            reveal(element);
            return;
          }
          // Fallback: anything already inside the viewport reveals instantly
          // instead of waiting for the observer callback (covers restored
          // scroll positions and embedded webviews that throttle IO).
          const rect = element.getBoundingClientRect();
          if (rect.top < viewportHeight * 0.92 && rect.bottom > 0) {
            reveal(element);
            return;
          }
          observer.observe(element);
        });
      // Safety net: never let a card stay invisible. If a reveal element
      // has been waiting longer than 6s (IO wedged, throttled tab, webview
      // quirk), reveal it anyway — the stagger delay keeps this invisible
      // in normal usage since cards reveal long before the timer fires.
      window.clearTimeout(safetyTimer);
      safetyTimer = window.setTimeout(() => {
        document
          .querySelectorAll<HTMLElement>("[data-reveal]:not(.is-revealed)")
          .forEach((element) => reveal(element));
      }, 6000);
      const nextParallax = document.querySelectorAll<HTMLElement>("[data-parallax]");
      if (nextParallax.length !== parallaxElements.length) {
        parallaxElements = [...nextParallax];
        applyParallax();
      }
      refreshPeekZone();
      // Re-apply immediately on DOM rescans so client-side navigation
      // away from the homepage hides the product peek without waiting for scroll.
      requestPeek();
    };

    if (!reduced.matches) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              reveal(entry.target as HTMLElement);
              observer?.unobserve(entry.target);
            }
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
      );
    }

    rescan();

    // React to client-side navigations: new route content mounts after this
    // layout effect has run, so watch the DOM for added nodes. childList only
    // — our own class writes are attribute changes and cannot loop.
    const mutations = new MutationObserver(rescan);
    mutations.observe(document.body, { childList: true, subtree: true });

    // ── Lenis (skipped entirely under reduced motion) ──
    let lenis: Lenis | null = null;
    let destroyLenis: (() => void) | null = null;

    if (!reduced.matches) {
      const instance = new Lenis({
        // autoRaf: Lenis owns the single RAF loop that drives the scroll —
        // without it the wheel is captured but never animated.
        autoRaf: true,
        duration: 1.1,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        anchors: { offset: -96 },
        touchMultiplier: 1.4,
      });
      lenis = instance;
      instance.on("scroll", onScrollFrame);
      unsubscribeScroll = () => instance.off("scroll", onScrollFrame);

      const onReducedChange = () => {
        if (reduced.matches) lenis?.destroy();
      };
      reduced.addEventListener("change", onReducedChange);

      destroyLenis = () => {
        reduced.removeEventListener("change", onReducedChange);
        lenis?.destroy();
      };
    } else {
      window.addEventListener("scroll", onScrollFrame, { passive: true });
      unsubscribeScroll = () => window.removeEventListener("scroll", onScrollFrame);
    }

    // Initial pose (page load / restored scroll position).
    requestPeek();

    // Native-scroll fallback: Lenis covers wheel/touch, but scrollbar drags,
    // keyboard paging, and find-in-page also move the document — keep the
    // peek in sync without a second animation loop (rAF coalesces).
    window.addEventListener("scroll", requestPeek, { passive: true });

    return () => {
      if (peekRaf) cancelAnimationFrame(peekRaf);
      window.clearTimeout(safetyTimer);
      window.removeEventListener("scroll", requestPeek);
      mutations.disconnect();
      observer?.disconnect();
      unsubscribeScroll?.();
      destroyLenis?.();
    };
  }, []);

  // MOBILE: the desktop peek composition never mounts on phones — no DOM,
  // no desktop clothing asset requests, no desktop animation engine. The
  // homepage renders the admin's single MobileHeroImage instead.
  // Hydration-safe: server AND first client paint output null; only after mount
  // (when the viewport is actually known) does desktop render the peek.
  // useSyncExternalStore reads the live viewport without setState-in-effect —
  // no cascading render, no hydration mismatch (subscribe fires post-hydration).
  const peekMounted = useSyncExternalStore(
    subscribeViewport,
    () => typeof window !== "undefined" && window.innerWidth > 768,
    () => false,
  );
  if (!peekMounted) return null;

  return (
    <>
      <div ref={peekOuterRef} className="peek-jeans" aria-hidden="true">
        {/* Premium stage: spotlight pool + floor shadow (mobile only, CSS). */}
        <div className="peek-stage" />
      {/* Lead: dark jeans — enters first, leaves first.
          loading="lazy": on mobile this component is not even mounted
          (mobile early return renders null), so desktop cutouts are never
          fetched by phones. */}
      <div
        ref={peekLeadRef}
        className="peek-jeans-item peek-jeans-item--lead"
        style={{ opacity: 0, transform: "translate3d(-96%, 34px, 0) rotate(-11deg) rotateY(-7deg) scale(0.95)" }}
      >
        <img
          src={peekSources?.left?.lead || "/brand/baggy-jeans-dark.png"}
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            (event.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
      {/* Follow: light jeans — trails in, lingers out */}
      <div
        ref={peekFollowRef}
        className="peek-jeans-item peek-jeans-item--follow"
        style={{ opacity: 0, transform: "translate3d(-96%, 34px, 0) rotate(-11deg) rotateY(-7deg) scale(0.95)" }}
      >
        <img
          src={peekSources?.left?.follow || "/brand/baggy-jeans.png"}
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            (event.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
      {/* Third: black MKR shirt — last in, last out (lingers) */}
      <div
        ref={peekShirtRef}
        className="peek-jeans-item peek-jeans-item--shirt"
        style={{ opacity: 0, transform: "translate3d(-96%, 34px, 0) rotate(-11deg) rotateY(-7deg) scale(0.95)" }}
      >
        <img
          src={peekSources?.left?.shirt || "/brand/mkr-shirt-black.png"}
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            (event.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    </div>

    {/* ── RIGHT stack: mirrored twin for the right viewport edge ── */}
    <div ref={peekOuterRightRef} className="peek-jeans peek-jeans--right" aria-hidden="true">
        <div
          ref={peekLeadRightRef}
          className="peek-jeans-item peek-jeans-item--lead"
          style={{ opacity: 0, transform: "translate3d(96%, 34px, 0) rotate(11deg) rotateY(7deg) scale(0.95)" }}
        >
          <img
            src={peekSources?.right?.lead || peekSources?.left?.lead || "/brand/baggy-jeans-dark.png"}
            alt=""
            draggable={false}
            loading="lazy"
            decoding="async"
            onError={(event) => {
              (event.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div
          ref={peekFollowRightRef}
          className="peek-jeans-item peek-jeans-item--follow"
          style={{ opacity: 0, transform: "translate3d(96%, 34px, 0) rotate(11deg) rotateY(7deg) scale(0.95)" }}
        >
          <img
            src={peekSources?.right?.follow || peekSources?.left?.follow || "/brand/baggy-jeans.png"}
            alt=""
            draggable={false}
            loading="lazy"
            decoding="async"
            onError={(event) => {
              (event.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div
          ref={peekShirtRightRef}
          className="peek-jeans-item peek-jeans-item--shirt"
          style={{ opacity: 0, transform: "translate3d(96%, 34px, 0) rotate(11deg) rotateY(7deg) scale(0.95)" }}
        >
          <img
            src={peekSources?.right?.shirt || peekSources?.left?.shirt || "/brand/mkr-shirt-black.png"}
            alt=""
            draggable={false}
            loading="lazy"
            decoding="async"
            onError={(event) => {
              (event.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      </div>
    </>
  );
}
