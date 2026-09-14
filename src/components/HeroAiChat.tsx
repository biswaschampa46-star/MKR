"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import Reveal from "@/components/Reveal";

type Msg = { role: "user" | "model"; text: string };

const SUGGESTIONS = [
  "Help me find something for everyday wear",
  "What should I wear this weekend?",
  "Find a minimal look for me",
  "Recommend something from MKR",
];

/**
 * Inline, editorial-style "Chat with MKR AI" panel for the hero section.
 * Talks to the existing /api/assistant endpoint (product-aware, key-safe).
 */
export default function HeroAiChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  /* keep the latest reply in view */
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    setError("");
    setInput("");
    const next: Msg[] = [...messages, { role: "user", text }];
    setMessages(next);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ history: next.slice(-10) }),
      });
      const data = (await res.json()) as { ok: boolean; text?: string; message?: string };
      if (data.ok && data.text) {
        setMessages((m) => [...m, { role: "model", text: data.text! }]);
      } else {
        setError(data.message ?? "The assistant is unavailable right now.");
      }
    } catch {
      setError("Connection problem — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void send(input);
    }
  };

  const showStarter = messages.length === 0;

  return (
    <Reveal delay={200} className="relative mx-auto mt-16 w-full max-w-3xl md:mt-20">
      {/* soft ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-8 rounded-[2.5rem] bg-soft/[0.05] blur-3xl"
      />

      <div className="relative overflow-hidden rounded-3xl border border-soft/15 bg-[rgba(9,30,50,0.55)] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.75)] backdrop-blur-xl">
        {/* header */}
        <div className="flex items-center gap-4 border-b border-soft/10 px-6 py-5 md:px-8">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-soft/25 bg-soft/10">
            <Sparkles className="h-4 w-4 text-ice" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-bold tracking-[0.22em] text-foam">
              CHAT WITH MKR AI
            </h3>
            <p className="mt-0.5 text-xs text-mist/70">Your personal style assistant.</p>
          </div>
          {/* live indicator */}
          <span className="ml-auto flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.2em] text-mist/60">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" aria-hidden="true" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            </span>
            Online
          </span>
        </div>

        {/* body */}
        <div className="px-6 py-6 md:px-8" ref={listRef}>
          {showStarter ? (
            /* starter suggestions */
            <div className="flex flex-wrap gap-2.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  disabled={busy}
                  className="rounded-full border border-soft/20 bg-white/[0.03] px-4 py-2 text-left text-[0.8rem] text-mist transition-all duration-200 hover:border-soft/45 hover:bg-soft/10 hover:text-ice disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : (
            /* conversation */
            <div className="max-h-64 space-y-4 overflow-y-auto pr-1 [scrollbar-width:thin]">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`chat-msg flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "user" ? (
                    <p className="max-w-[85%] rounded-2xl rounded-br-md bg-soft/15 px-4 py-2.5 text-sm leading-relaxed text-ice">
                      {m.text}
                    </p>
                  ) : (
                    <p className="max-w-[85%] rounded-2xl rounded-bl-md border border-soft/10 bg-white/[0.04] px-4 py-2.5 text-sm leading-relaxed text-mist">
                      {m.text}
                    </p>
                  )}
                </div>
              ))}
              {busy && (
                <div className="flex justify-start" aria-live="polite" aria-label="Assistant is typing">
                  <span className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-soft/10 bg-white/[0.04] px-4 py-3">
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-mist/60"
                        style={{ animationDelay: `${d * 0.15}s` }}
                      />
                    ))}
                  </span>
                </div>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="mt-4 text-xs text-accent">
              {error}
            </p>
          )}
        </div>

        {/* input */}
        <div className="border-t border-soft/10 px-6 py-4 md:px-8">
          <div className="flex items-center gap-3 rounded-full border border-soft/20 bg-white/[0.03] px-5 py-2 transition-all duration-300 focus-within:border-soft/50 focus-within:shadow-[0_0_0_3px_rgba(102,184,255,0.12)]">
            <Sparkles className="h-4 w-4 shrink-0 text-mist/60" strokeWidth={1.5} aria-hidden="true" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask MKR AI anything about style..."
              aria-label="Ask MKR AI anything about style"
              disabled={busy}
              maxLength={500}
              className="min-w-0 flex-1 bg-transparent text-sm text-foam placeholder:text-mist/50 focus:outline-none disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void send(input)}
              disabled={busy || !input.trim()}
              aria-label="Send message"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-soft/20 text-ice transition-all duration-200 hover:bg-soft/35 disabled:opacity-40 disabled:hover:bg-soft/20"
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
