"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";

export function NewsletterForm({ source = "footer" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ pending: boolean; message: string | null; error: string | null }>({
    pending: false,
    message: null,
    error: null,
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState({ pending: true, message: null, error: null });
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const payload = (await response.json()) as { ok: boolean; message?: string; error?: string };
      if (!payload.ok) throw new Error(payload.error ?? "Subscription failed.");
      setState({ pending: false, message: payload.message ?? "Subscribed.", error: null });
      setEmail("");
    } catch (cause) {
      setState({ pending: false, message: null, error: cause instanceof Error ? cause.message : "Subscription failed." });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email for new drops"
          aria-label="Email address"
        />
        <Button type="submit" disabled={state.pending} className="shrink-0">
          {state.pending ? "Saving…" : "Notify me"}
        </Button>
      </div>
      {state.message ? <p className="text-xs text-emerald-300">{state.message}</p> : null}
      {state.error ? <p className="text-xs text-rose-300">{state.error}</p> : null}
    </form>
  );
}
