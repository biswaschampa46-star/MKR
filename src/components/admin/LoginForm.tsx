"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGlobalLoading } from "@/lib/loading-store";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    useGlobalLoading.getState().startTask();
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!data.ok) {
        setError(data.message ?? "Login failed.");
        setBusy(false);
        useGlobalLoading.getState().endTask();
        return;
      }
      router.replace("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setBusy(false);
      useGlobalLoading.getState().endTask();
    }
    // Success navigates away — overlay failsafe releases the task signal.
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-line-soft bg-[#071a2b] p-8">
      <p className="font-display text-sm font-extrabold tracking-[0.28em] text-foam">MKR ADMIN</p>
      <h1 className="font-display mt-4 text-xl font-bold text-foam">Sign in</h1>

      <label className="mt-7 block text-xs uppercase tracking-[0.2em] text-mist">
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
          className="mt-2 w-full rounded-lg border border-line bg-transparent px-4 py-3 text-sm text-foam focus:border-soft/60 focus:outline-none"
        />
      </label>

      <label className="mt-5 block text-xs uppercase tracking-[0.2em] text-mist">
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="mt-2 w-full rounded-lg border border-line bg-transparent px-4 py-3 text-sm text-foam focus:border-soft/60 focus:outline-none"
        />
      </label>

      {error && <p className="mt-4 text-sm text-accent">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        aria-busy={busy}
        className="btn btn-line mt-8 w-full justify-center disabled:opacity-50"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
