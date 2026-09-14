"use client";

import { useEffect } from "react";
import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { ensureCustomerProfile } from "./customer";

type AuthState = {
  /** null when the visitor is logged out. */
  user: User | null;
  /** true once the initial session lookup has finished (avoids auth flicker). */
  ready: boolean;
  /** Authenticated customer profile — created automatically on first sign-in. */
  profile: import("./customer").CustomerProfile | null;
  /** Action captured before login (e.g. "add this product to cart") — replayed after success. */
  pendingAction: (() => void) | null;
  setUser: (u: User | null) => void;
  setReady: (v: boolean) => void;
  setProfile: (p: import("./customer").CustomerProfile | null) => void;
  setPendingAction: (fn: (() => void) | null) => void;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  ready: false,
  profile: null,
  pendingAction: null,
  setUser: (user) => set({ user }),
  setReady: (ready) => set({ ready }),
  setProfile: (profile) => set({ profile }),
  setPendingAction: (pendingAction) => set({ pendingAction }),
}));

/** Tracks which user id the profile has been ensured for (dedupes calls). */
let ensuredFor: string | null = null;

/**
 * Mount once (in AuthModal / layout) to keep the auth store in sync
 * with the Supabase session for the lifetime of the page.
 */
export function useAuthSync(): void {
  const setUser = useAuth((s) => s.setUser);
  const setReady = useAuth((s) => s.setReady);
  const setProfile = useAuth((s) => s.setProfile);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let mounted = true;

    /** Auto-create/refresh the customer profile for ANY sign-in method. */
    const ensure = async (u: User | null) => {
      if (!u) {
        ensuredFor = null;
        if (mounted) setProfile(null);
        return;
      }
      if (ensuredFor === u.id) return;
      ensuredFor = u.id;
      const profile = await ensureCustomerProfile(u);
      if (mounted && profile) setProfile(profile);
    };

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (mounted) {
          setUser(data.user ?? null);
          setReady(true);
          ensure(data.user);
        }
      })
      .catch(() => mounted && setReady(true));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      ensure(session?.user ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [setUser, setReady, setProfile]);
}

export async function signOutUser(): Promise<void> {
  await supabase?.auth.signOut();
  ensuredFor = null;
  useAuth.getState().setUser(null);
  useAuth.getState().setProfile(null);
}
