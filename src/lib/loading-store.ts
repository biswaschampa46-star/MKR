"use client";

import { create } from "zustand";

/**
 * Global loading signals — single source of truth for the premium loader.
 * Pages/components opt in via startTask/endTask or withTask(); the overlay
 * decides visibility with a small debounce so fast requests never flash.
 */
type GlobalLoadingState = {
  /** Initial boot splash still active. */
  bootActive: boolean;
  /** A route transition is in flight (set by RouteTransitionMonitor/overlay). */
  routeActive: boolean;
  /** Number of outstanding manual long-tasks (API, Supabase, admin work…). */
  taskCount: number;
  /** Dismiss the boot splash permanently for this session. */
  dismissBoot: () => void;
  setRouteActive: (v: boolean) => void;
  startTask: () => void;
  endTask: () => void;
  /** Run a promise as a tracked task — always releases, even on error/timeout. */
  withTask: <T>(work: () => Promise<T>) => Promise<T>;
};

export const useGlobalLoading = create<GlobalLoadingState>((set, get) => ({
  bootActive: true,
  routeActive: false,
  taskCount: 0,
  dismissBoot: () => set({ bootActive: false }),
  setRouteActive: (routeActive) => set({ routeActive }),
  startTask: () => set((s) => ({ taskCount: s.taskCount + 1 })),
  endTask: () =>
    set((s) => ({ taskCount: Math.max(0, s.taskCount - 1) })),
  withTask: async <T,>(work: () => Promise<T>): Promise<T> => {
    get().startTask();
    // Hard failsafe: never hold the loader for one task longer than 8s.
    const failsafe = setTimeout(() => get().endTask(), 8000);
    try {
      return await work();
    } finally {
      clearTimeout(failsafe);
      get().endTask();
    }
  },
}));

/**
 * Convenience hook for long async work:
 *   const { track } = useLoadingTask();
 *   await track(fetch(...));
 * Always releases the task even when the promise rejects — the loader
 * can never get stuck because one optional request failed.
 */
export function useLoadingTask() {
  const startTask = useGlobalLoading((s) => s.startTask);
  const endTask = useGlobalLoading((s) => s.endTask);
  const withTask = useGlobalLoading((s) => s.withTask);
  return {
    track: async <T,>(promise: Promise<T>): Promise<T> => {
      startTask();
      // Hard failsafe: never hold the loader for one task longer than 8s.
      const failsafe = setTimeout(endTask, 8000);
      try {
        return await promise;
      } finally {
        clearTimeout(failsafe);
        endTask();
      }
    },
    run: withTask,
    startTask,
    endTask,
  };
}

/** Non-hook access for server-action callbacks / event handlers. */
export async function trackTask<T>(promise: Promise<T>): Promise<T> {
  const { startTask, endTask } = useGlobalLoading.getState();
  startTask();
  const failsafe = setTimeout(endTask, 8000);
  try {
    return await promise;
  } finally {
    clearTimeout(failsafe);
    endTask();
  }
}

/* ------------------------------------------------------------------ */
/*  Boot window — single source of truth for "is the cinematic boot     */
/*  splash active or still settling?" Route-level fallbacks consult     */
/*  this so a second full-screen loader can never appear right after    */
/*  the boot splash.                                                    */
/* ------------------------------------------------------------------ */

/** Boot splash is up OR within its exit/settle window (ms). */
const BOOT_SETTLE_MS = 2200;
let bootWindowUntil = 0;

export function markBootWindowActive(): void {
  bootWindowUntil = Date.now() + BOOT_SETTLE_MS;
}

export function markBootWindowDone(): void {
  bootWindowUntil = 0;
}

/** Synchronous, SSR-safe check for RouteLoadingFallback (server render). */
export function isBootOrSettling(): boolean {
  if (typeof window === "undefined") return true; // SSR: never render a second loader
  return Date.now() < bootWindowUntil || useGlobalLoading.getState().bootActive;
}

/** Called by route fallbacks once real content has arrived. */
export function markNavigationComplete(): void {
  const s = useGlobalLoading.getState();
  if (s.routeActive) s.setRouteActive(false);
}

