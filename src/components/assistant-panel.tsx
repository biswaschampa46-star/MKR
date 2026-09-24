"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send } from "lucide-react";
import { Alert, Button } from "@/components/ui";

type Exchange = { role: "user" | "assistant"; text: string };

export function AssistantPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [value, setValue] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ name: string; slug: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [exchanges, pending]);

  if (!open) return null;

  const send = async () => {
    const question = value.trim();
    if (question.length < 3) {
      setError("Tell the assistant a little more.");
      return;
    }
    setError(null);
    setExchanges((prev) => [...prev, { role: "user", text: question }]);
    setValue("");
    setPending(true);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "assistant", prompt: question }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        text?: string;
        error?: string;
        suggestions?: { name: string; slug: string }[];
      };
      if (!payload.ok) throw new Error(payload.error ?? "The assistant is unavailable.");
      setExchanges((prev) => [...prev, { role: "assistant", text: payload.text ?? "" }]);
      setSuggestions(payload.suggestions ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The assistant is unavailable.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-end p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-[#071a2b]/80 backdrop-blur-sm" onClick={onClose} />
      <section className="relative flex h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-[#a8c0d5]/20 bg-[#0b263d] sm:h-[70dvh] sm:rounded-3xl">
        <header className="flex items-center justify-between border-b border-[#a8c0d5]/12 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#8ccbff]" />
            <h2 className="font-display text-lg text-[#f4faff]">MKR assistant</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close assistant" className="rounded-full p-2 text-[#ddf3ff] hover:bg-[#ddf3ff]/10">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
          {exchanges.length === 0 ? (
            <div className="space-y-3 text-sm text-[#a8c0d5]">
              <p>Ask about sizing, fabric, delivery inside Bangladesh or payments.</p>
              <ul className="space-y-1.5 text-xs text-[#8ccbff]">
                <li>“Which size fits a 175 cm, 72 kg frame?”</li>
                <li>“What is the delivery charge outside Chattogram?”</li>
                <li>“Do you accept bKash send money?”</li>
              </ul>
            </div>
          ) : null}

          {exchanges.map((exchange, index) => (
            <div
              key={index}
              className={
                exchange.role === "user"
                  ? "ml-auto max-w-[85%] rounded-2xl bg-gradient-to-r from-[#4da8ff]/25 to-[#8ccbff]/20 px-4 py-3 text-sm text-[#f4faff]"
                  : "max-w-[92%] whitespace-pre-wrap rounded-2xl border border-[#a8c0d5]/15 bg-[#071a2b]/60 px-4 py-3 text-sm text-[#ddf3ff]"
              }
            >
              {exchange.text}
            </div>
          ))}

          {pending ? <p className="text-xs uppercase tracking-[0.3em] text-[#8ccbff]">Thinking…</p> : null}
          {error ? <Alert tone="warn">{error}</Alert> : null}

          {suggestions.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-2">
              {suggestions.map((item) => (
                <Link
                  key={item.slug}
                  href={`/product/${item.slug}`}
                  onClick={onClose}
                  className="rounded-full border border-[#a8c0d5]/25 px-3 py-1.5 text-xs text-[#ddf3ff] hover:border-[#8ccbff]"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <footer className="space-y-3 border-t border-[#a8c0d5]/12 px-5 py-4">
          <div className="flex items-end gap-2">
            <textarea
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              rows={2}
              placeholder="Ask the MKR assistant…"
              className="flex-1 resize-none rounded-2xl border border-[#a8c0d5]/25 bg-[#071a2b]/70 px-4 py-3 text-sm"
            />
            <Button type="button" onClick={() => void send()} disabled={pending} aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#a8c0d5]/70">
            Powered server-side — your key never reaches the browser.
          </p>
        </footer>
      </section>
    </div>
  );
}
