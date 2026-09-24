"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type LoadingContextValue = {
  begin: (reason: string) => void;
  end: (reason?: string) => void;
  isBusy: boolean;
};

const LoadingContext = createContext<LoadingContextValue>({ begin: () => {}, end: () => {}, isBusy: false });

export const useLoading = () => useContext(LoadingContext);

/**
 * ONE coordinated loading system for the whole app:
 *  - boot overlay (animated MKR brand moment)
 *  - route-transition overlay
 * Overlays are ref-counted, so a Loader → Loader → Loader stack is impossible.
 * Data loading uses skeletons inside Suspense boundaries instead of an overlay.
 */
export function LoadingCoordinator() {
  const pathname = usePathname();
  const activeRef = useRef(new Set<string>());
  const [isBusy, setIsBusy] = useState(false);
  const [booted, setBooted] = useState(false);
  // The boot overlay fades out before unmounting, so the brand moment ends
  // elegantly instead of snapping away.
  const [bootVisible, setBootVisible] = useState(true);
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const begin = useCallback((reason: string) => {
    activeRef.current.add(reason);
    setIsBusy(true);
    if (safetyTimer.current) clearTimeout(safetyTimer.current);
    safetyTimer.current = setTimeout(() => {
      activeRef.current.clear();
      setIsBusy(false);
    }, 8000);
  }, []);

  const end = useCallback((reason?: string) => {
    if (reason) activeRef.current.delete(reason);
    else activeRef.current.clear();
    if (activeRef.current.size === 0) {
      if (safetyTimer.current) clearTimeout(safetyTimer.current);
      setIsBusy(false);
    }
  }, []);

  // Boot loader — resolves on window load or a short timeout, whichever comes first.
  useEffect(() => {
    if (typeof document === "undefined") return;
    let unmountTimer: ReturnType<typeof setTimeout> | null = null;
    const finish = () => {
      setBooted(true);
      unmountTimer = setTimeout(() => setBootVisible(false), 620);
    };
    if (document.readyState === "complete") {
      const timer = setTimeout(finish, 900);
      return () => {
        clearTimeout(timer);
        if (unmountTimer) clearTimeout(unmountTimer);
      };
    }
    const done = () => finish();
    window.addEventListener("load", done, { once: true });
    const fallback = setTimeout(done, 2200);
    return () => {
      window.removeEventListener("load", done);
      clearTimeout(fallback);
      if (unmountTimer) clearTimeout(unmountTimer);
    };
  }, []);

  // Lenis owns the scroll position; the overlay must not lock body scroll
  // or the smooth-scroll engine desyncs on mobile.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("lenis-stopped", isBusy);
    return () => document.documentElement.classList.remove("lenis-stopped");
  }, [isBusy]);

  // Route transitions: one overlay for internal navigations, ended on pathname change.
  useEffect(() => {
    if (!booted) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.getAttribute("target") === "_blank") return;
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === pathname && url.search === window.location.search) return;
        begin("route");
      } catch {
        /* ignore malformed links */
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [begin, booted, pathname]);

  useEffect(() => {
    const timer = setTimeout(() => end("route"), 260);
    return () => clearTimeout(timer);
  }, [pathname, end]);

  const showBoot = !booted;

  return (
    <LoadingContext.Provider value={{ begin, end, isBusy }}>
      {bootVisible ? (
        <div
          aria-hidden={!showBoot}
          className={showBoot ? "mkr-boot-overlay fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#071a2b]" : "mkr-boot-overlay mkr-boot-overlay-out fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#071a2b]"}
        >
          {/* Soft radial glow behind the wordmark. */}
          <div className="mkr-boot-glow pointer-events-none absolute left-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(77,168,255,0.13),transparent)]" />

          <div className="relative flex flex-col items-center gap-7">
            <h1 className="wordmark flex text-4xl text-[#f4faff]" aria-label="MKR">
              {["M", "K", "R"].map((letter, index) => (
                <span
                  key={letter}
                  aria-hidden
                  className="mkr-boot-letter"
                  style={{ animationDelay: `${0.15 + index * 0.11}s` }}
                >
                  {letter}
                </span>
              ))}
            </h1>
            <span className="mkr-boot-line h-px w-24 overflow-hidden bg-[#a8c0d5]/15">
              <span className="mkr-boot-fill block h-full">
                <span className="mkr-progress-comet" />
              </span>
            </span>
            <p className="mkr-boot-tagline text-[10px] uppercase text-[#8ccbff]" style={{ letterSpacing: "0.62em" }}>
              Casual Threads &amp; Style
            </p>
          </div>
        </div>
      ) : null}

      {isBusy && booted ? (
        <>
          <div className="fixed inset-x-0 top-0 z-[95] h-[3px] overflow-hidden bg-[#0b263d]/60">
            <div className="mkr-progress-fill">
              <span className="mkr-progress-comet" />
            </div>
          </div>
          <div className="mkr-loading-pill pointer-events-none fixed bottom-6 left-1/2 z-[95] rounded-full border border-[#a8c0d5]/25 bg-[#071a2b]/85 px-5 py-2.5 shadow-[0_16px_44px_-20px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(140,203,255,0.1)] backdrop-blur">
            <span className="mkr-loading-text text-[11px] uppercase tracking-[0.3em]">Loading</span>
          </div>
        </>
      ) : null}
    </LoadingContext.Provider>
  );
}
