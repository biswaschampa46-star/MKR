"use client";
import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import PremiumLoader, { LOADER_STATUS } from "./PremiumLoader";
import { useGlobalLoading, markBootWindowActive, markBootWindowDone } from "@/lib/loading-store";
import { useAuth } from "@/lib/auth-store";
import { useHydrated } from "@/lib/store";

const MIN_MS = 1400;
const MAX_BOOT_MS = 6000;
const EXIT_MS = 950;
/** After the boot splash exits, navigation/task loaders stay suppressed
    this long so the user never sees loader → loader. */
const SETTLE_MS = 1200;
const ROUTE_DELAY = 250;
const TASK_DELAY = 250;
const ROUTE_MAX = 8000;

function useEased(run: boolean, done: boolean) {
  const [p, setP] = useState(0);
  const v = useRef(0);
  const raf = useRef(0);
  useEffect(() => {
    if (!run) {
      v.current = 0;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setP(0);
      return;
    }
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const t = done ? 100 : 90;
      const sp = done ? 0.012 : 0.0035;
      v.current += (t - v.current) * Math.min(1, dt * sp) + (done ? dt * 0.06 : dt * 0.004);
      if (v.current > 99.4 && !done) v.current = 99.4;
      if (v.current >= 100 && done) v.current = 100;
      setP(v.current);
      if (!(done && v.current >= 100)) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [run, done]);
  return p;
}

export default function GlobalLoadingOverlay() {
  return (
    <React.Suspense fallback={null}>
      <OverlayInner />
    </React.Suspense>
  );
}

function OverlayInner() {
  const bootActive = useGlobalLoading((s) => s.bootActive);
  const dismissBoot = useGlobalLoading((s) => s.dismissBoot);
  const routeActive = useGlobalLoading((s) => s.routeActive);
  const setRouteActive = useGlobalLoading((s) => s.setRouteActive);
  const taskCount = useGlobalLoading((s) => s.taskCount);
  const authReady = useAuth((s) => s.ready);
  const hydrated = useHydrated();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryKey = searchParams?.toString() ?? "";
  const [mounted, setMounted] = useState(false);
  const [bootReady, setBootReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  /** True from boot start until EXIT_MS after the splash began leaving.
      Route/task loaders are suppressed during this whole window — this is
      the core fix for the "loading → loading again" experience. */
  const [bootSettling, setBootSettling] = useState(true);
  const [showRoute, setShowRoute] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const startRef = useRef(0);
  const prevUrl = useRef("");
  const routeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeFailsafe = useRef<ReturnType<typeof setTimeout> | null>(null);
  const taskTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* Boot handshake. NOTE: never imperatively remove server-rendered DOM —
     that breaks React hydration (insertBefore crash). The overlay is
     purely React-managed: SSR renders null, client mounts the splash. */
  useEffect(() => {
    startRef.current = Date.now();
    let skip = false;
    try {
      skip = sessionStorage.getItem("mkr-boot-done") === "1";
    } catch {
      skip = false;
    }
    if (skip) {
      // Repeat visit this tab: cinematic boot already played — stay hidden.
      const raf = requestAnimationFrame(() => {
        dismissBoot();
        setGone(true);
        setBootSettling(false);
        markBootWindowDone();
      });
      return () => cancelAnimationFrame(raf);
    }
    // First visit: open the boot window so route fallbacks stay hidden.
    markBootWindowActive();
    const raf = requestAnimationFrame(() => setMounted(true));
    const t = setTimeout(() => setBootReady(true), MAX_BOOT_MS);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); };
  }, [dismissBoot]);
  useEffect(() => {
    if (!mounted || bootReady) return;
    let done = false;
    const settle = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, MIN_MS - (Date.now() - startRef.current));
      setTimeout(() => setBootReady(true), wait);
    };
    let fonts = false;
    let loaded = document.readyState === "complete";
    const maybe = () => {
      if (fonts && loaded && authReady && hydrated) settle();
    };
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => { fonts = true; maybe(); }).catch(() => { fonts = true; maybe(); });
    } else { fonts = true; }
    const onLoad = () => { loaded = true; maybe(); };
    if (!loaded) window.addEventListener("load", onLoad, { once: true });
    maybe();
    const soft = setTimeout(() => { if (fonts && loaded) settle(); }, 3200);
    return () => { window.removeEventListener("load", onLoad); clearTimeout(soft); };
  }, [mounted, bootReady, authReady, hydrated]);

  useEffect(() => {
    if (!bootReady || !bootActive) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLeaving(true);
    const t = setTimeout(() => {
      dismissBoot();
      setGone(true);
      // Keep suppressing route/task loaders through the exit transition.
      try { sessionStorage.setItem("mkr-boot-done", "1"); } catch { /* noop */ }
    }, EXIT_MS);
    const settle = setTimeout(() => {
      setBootSettling(false);
      markBootWindowDone();
    }, EXIT_MS + SETTLE_MS);
    return () => { clearTimeout(t); clearTimeout(settle); };
  }, [bootReady, bootActive, dismissBoot]);

  const beginRoute = useCallback(() => {
    if (routeTimer.current) clearTimeout(routeTimer.current);
    if (routeFailsafe.current) clearTimeout(routeFailsafe.current);
    routeTimer.current = setTimeout(() => setShowRoute(true), ROUTE_DELAY);
    // Failsafe: never trap the user behind the loader on a failed navigation.
    routeFailsafe.current = setTimeout(() => {
      setRouteActive(false);
      setShowRoute(false);
    }, ROUTE_MAX);
  }, [setRouteActive]);

  const finishRoute = useCallback(() => {
    if (routeTimer.current) clearTimeout(routeTimer.current);
    if (routeFailsafe.current) clearTimeout(routeFailsafe.current);
    routeTimer.current = null;
    routeFailsafe.current = null;
    setRouteActive(false);
    setShowRoute(false);
  }, [setRouteActive]);

  // Settle the route loader once the URL (path or query) actually changes.
  useEffect(() => {
    const url = `${pathname}?${queryKey}`;
    if (prevUrl.current === "") {
      prevUrl.current = url;
      return;
    }
    if (prevUrl.current !== url) {
      prevUrl.current = url;
      finishRoute();
    }
  }, [pathname, queryKey, finishRoute]);

  // Patch history so router.push/replace + back/forward also signal transitions.
  useEffect(() => {
    if (typeof window === "undefined" || typeof history === "undefined") return;
    const origPush = history.pushState.bind(history);
    const origReplace = history.replaceState.bind(history);
    const mark = () => {
      setRouteActive(true);
      beginRoute();
    };
    history.pushState = ((...args: Parameters<typeof origPush>) => {
      mark();
      return origPush(...args);
    }) as typeof history.pushState;
    history.replaceState = ((...args: Parameters<typeof origReplace>) => {
      const before = `${window.location.pathname}${window.location.search}`;
      const ret = origReplace(...args);
      const after = `${window.location.pathname}${window.location.search}`;
      if (before !== after) mark();
      return ret;
    }) as typeof history.replaceState;
    const onPop = () => {
      setRouteActive(true);
      beginRoute();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      history.pushState = origPush;
      history.replaceState = origReplace;
      window.removeEventListener("popstate", onPop);
      if (routeTimer.current) clearTimeout(routeTimer.current);
      if (routeFailsafe.current) clearTimeout(routeFailsafe.current);
    };
  }, [beginRoute, setRouteActive]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a[href]");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      if (href.startsWith("/") && !href.startsWith("/#") && !href.startsWith("#") && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && (a as HTMLAnchorElement).target !== "_blank") {
        setRouteActive(true);
        beginRoute();
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [beginRoute, setRouteActive]);

  // Debounced task visibility: fast requests never flash the full-screen
  // loader; sustained data work gets the same premium brand feedback.
  useEffect(() => {
    if (taskCount > 0) {
      if (taskTimer.current) clearTimeout(taskTimer.current);
      taskTimer.current = setTimeout(() => setShowTask(true), TASK_DELAY);
      return () => {
        if (taskTimer.current) clearTimeout(taskTimer.current);
      };
    }
    if (taskTimer.current) clearTimeout(taskTimer.current);
    taskTimer.current = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowTask(false);
  }, [taskCount]);

  const showBoot = mounted && bootActive && !gone;
  // One-loader guarantee: while the boot splash is visible OR still exiting
  // (bootSettling), route/task loaders may not take over the screen.
  const showNavLoader = !bootSettling && (showRoute || (routeActive && !showBoot));
  const showTaskLoader = !bootSettling && showTask && !showNavLoader;
  const vis = Boolean(showBoot || showNavLoader || showTaskLoader);
  const done = showBoot ? bootReady : !routeActive && taskCount === 0;
  const prog = useEased(vis, done);
  const status = prog >= 99 ? LOADER_STATUS[4] : prog >= 72 ? LOADER_STATUS[3] : prog >= 45 ? LOADER_STATUS[2] : prog >= 18 ? LOADER_STATUS[1] : LOADER_STATUS[0];

  useEffect(() => {
    if (!showBoot) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [showBoot]);

  useEffect(() => {
    const main = document.getElementById("main");
    if (main) main.setAttribute("aria-busy", vis ? "true" : "false");
  }, [vis]);

  if (!vis) return null;
  const compact = !showBoot;
  return (
    <div className="mkr-loader-root" role="status" aria-live="polite" aria-label="Loading MKR">
      <PremiumLoader
        progress={showBoot ? prog : 62}
        status={showBoot ? status : LOADER_STATUS[1]}
        leaving={showBoot ? leaving : false}
        compact={compact}
      />
      <span className="sr-only">Loading — please wait</span>
    </div>
  );
}
