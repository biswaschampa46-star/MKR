"use client";

import { useEffect, useState } from "react";
import { X, Mail, Lock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { useAuth, useAuthSync } from "@/lib/auth-store";
import { useUI } from "@/lib/store";
import { useGlobalLoading } from "@/lib/loading-store";

/** Official Google "G" logo — brand colors applied via CSS classes. */
function GoogleLogo() {
  return (
    <svg className="auth-google-logo" viewBox="0 0 48 48" aria-hidden="true">
      <path className="auth-google-logo__yellow" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path className="auth-google-logo__blue" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path className="auth-google-logo__green" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path className="auth-google-logo__red" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

type Mode = "signin" | "signup";

export default function AuthModal() {
  useAuthSync();
  const user = useAuth((s) => s.user);
  const setPendingAction = useAuth((s) => s.setPendingAction);
  const authOpen = useUI((s) => s.authOpen);
  const setAuthOpen = useUI((s) => s.setAuthOpen);

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "email" | "google">(null);
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);

  /* Close automatically as soon as the visitor is authenticated. */
  useEffect(() => {
    if (authOpen && user) {
      setAuthOpen(false);
      const fn = useAuth.getState().pendingAction;
      if (fn) {
        fn();
        setPendingAction(null);
      }
    }
  }, [authOpen, user, setAuthOpen, setPendingAction]);

  useEffect(() => {
    if (!authOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAuthOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [authOpen, setAuthOpen]);

  if (!authOpen) return null;

  /* Runs the action the visitor was trying to do before login (e.g. add to cart). */
  const finish = () => {
    setAuthOpen(false);
    const fn = useAuth.getState().pendingAction;
    if (fn) {
      fn();
      setPendingAction(null);
    }
  };

  const close = () => {
    setAuthOpen(false);
    setMessage(null);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setMessage(null);
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy("email");
    setMessage(null);
    useGlobalLoading.getState().startTask();
    if (!supabase) {
      setMessage({ kind: "error", text: "Authentication is not configured. Add your Supabase URL and key to .env.local." });
      setBusy(null);
      return;
    }
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage({ kind: "ok", text: "Signed in — welcome back!" });
        finish();
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          setMessage({ kind: "ok", text: "Account created — happy shopping!" });
          finish();
        } else {
          setMessage({ kind: "ok", text: "Check your inbox — we sent a confirmation link to finish signing up." });
        }
      }
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong. Try again." });
    } finally {
      setBusy(null);
      useGlobalLoading.getState().endTask();
    }
  };

  const handleGoogle = async () => {
    if (busy) return;
    setBusy("google");
    setMessage(null);
    useGlobalLoading.getState().startTask();
    if (!supabase) {
      setMessage({ kind: "error", text: "Authentication is not configured. Add your Supabase URL and key to .env.local." });
      setBusy(null);
      return;
    }
    const fn = useAuth.getState().pendingAction;
    setPendingAction(null); // OAuth navigates away — clear the replay to avoid double-adding on return
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      setMessage({ kind: "error", text: error.message });
      setPendingAction(fn);
      setBusy(null);
      useGlobalLoading.getState().endTask();
    }
    // Success navigates away — overlay failsafe + boot logic release the loader.
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto" role="dialog" aria-modal="true" aria-label={mode === "signin" ? "Sign in" : "Create account"}>
      <div className="absolute inset-0 bg-[rgba(5,16,27,0.72)] backdrop-blur-sm" onClick={close} />
      <div className="relative z-10 flex min-h-full items-center justify-center p-6">
        <div className="auth-card">
          <button type="button" onClick={close} aria-label="Close" className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full text-mist/70 transition-colors hover:text-ice">
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>

        <p className="label label--bright">{mode === "signin" ? "Welcome back" : "Join us"}</p>
        <h2 className="display-3 mt-3 text-foam">{mode === "signin" ? "Sign in to continue" : "Create your account"}</h2>
        <p className="mt-3 text-sm leading-relaxed text-mist">Sign in or sign up with Google or email to add items to your cart.</p>

        {!supabaseConfigured && (
          <p className="mt-5 flex items-start gap-2.5 rounded-lg border border-line bg-soft/5 p-3.5 text-xs leading-relaxed text-mist">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-soft" strokeWidth={1.5} />
            Authentication is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the dev server.
          </p>
        )}

        <button type="button" onClick={handleGoogle} disabled={busy !== null || !supabaseConfigured} aria-busy={busy === "google"} className="auth-google-btn mt-7 w-full">
          {busy === "google" ? <Loader2 className="h-5 w-5 animate-spin text-mist" /> : <GoogleLogo />}
          <span>Continue with Google</span>
        </button>

        <div className="auth-divider mt-7">
          <span className="label !text-[0.6rem] !text-mist/60">or with email</span>
        </div>

        <form onSubmit={handleEmail} className="mt-6 space-y-4">
          <label className="auth-field">
            <Mail className="h-4 w-4 shrink-0 text-mist/60" strokeWidth={1.5} />
            <input type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="auth-field">
            <Lock className="h-4 w-4 shrink-0 text-mist/60" strokeWidth={1.5} />
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder={mode === "signin" ? "Your password" : "Create a password (min. 6 characters)"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" disabled={busy !== null || !supabaseConfigured} aria-busy={busy === "email"} className="btn btn-solid w-full">
            {busy === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {message && (
          <p className={`mt-4 flex items-start gap-2.5 text-xs leading-relaxed ${message.kind === "ok" ? "text-soft" : "text-[#ff9b8a]"}`} role="status">
            {message.kind === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />}
            {message.text}
          </p>
        )}

        <p className="mt-7 text-center text-xs text-mist">
          {mode === "signin" ? (
            <>
              New here?{" "}
              <button type="button" onClick={() => switchMode("signup")} className="link-line font-semibold uppercase tracking-[0.18em] text-soft hover:text-ice">
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" onClick={() => switchMode("signin")} className="link-line font-semibold uppercase tracking-[0.18em] text-soft hover:text-ice">
                Sign in
              </button>
            </>
          )}
        </p>
        </div>
      </div>
    </div>
  );
}

