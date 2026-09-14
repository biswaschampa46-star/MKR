"use client";

import { useEffect, useRef, useState } from "react";
import { X, Check, Loader2 } from "lucide-react";
import StarRating from "@/components/StarRating";
import { supabase } from "@/lib/supabase";
import { useGlobalLoading } from "@/lib/loading-store";

type ReviewModalProps = {
  open: boolean;
  productId: string;
  productName: string;
  onClose: () => void;
};

export default function ReviewModal({
  open,
  productId,
  productName,
  onClose,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // lock body scroll + focus the dialog while open.
  // Note: transient state (sent/error) is reset by remount — the parent
  // only mounts this component when `open` is true.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Let the panel mount first, then focus + ensure top is visible.
    requestAnimationFrame(() => {
      closeRef.current?.focus({ preventScroll: true });
      dialogRef.current?.scrollTo({ top: 0 });
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    setError(null);
    if (rating < 1 || rating > 5) {
      setError("Please choose a star rating between 1 and 5.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Please add your name.");
      return;
    }
    if (body.trim().length < 6) {
      setError("Please share a few words about your experience.");
      return;
    }
    try {
      setBusy(true);
      useGlobalLoading.getState().startTask();
      let accessToken: string | undefined;
      try {
        const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
        accessToken = data.session?.access_token ?? undefined;
      } catch {
        accessToken = undefined;
      }
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId,
          name: name.trim(),
          rating,
          review: body.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          accessToken,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.message || "Could not save your review. Please try again.");
        return;
      }
      setSent(true);
      window.dispatchEvent(new CustomEvent("reviews:published"));
    } catch {
      setError("Could not save your review. Please check your connection and try again.");
    } finally {
      setBusy(false);
      useGlobalLoading.getState().endTask();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      className="fixed inset-0 z-[90] overflow-y-auto overscroll-contain"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* scrim — fixed so it stays put while the dialog scrolls */}
      <div className="scrim fixed inset-0 bg-abyss/80 backdrop-blur-sm" aria-hidden="true" />

      {/* centering wrapper: min-h-full + items-center avoids the
          flex + m-auto clipping bug where the top gets cut off
          and becomes unreachable when content exceeds the viewport */}
      <div
        className="relative flex min-h-full items-center justify-center p-4 sm:p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          role="document"
          className="review-modal-panel relative my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-deep/95 shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
        >
          {/* header — pinned above the scroll area, never clipped */}
          <div className="z-10 flex flex-shrink-0 items-start justify-between gap-4 border-b border-line-soft bg-deep/95 px-5 pb-4 pt-5 backdrop-blur-md sm:px-7 sm:pt-6">
            <div className="min-w-0">
              <h2 id="review-modal-title" className="font-display text-xl font-bold uppercase leading-tight tracking-[0.02em] text-foam sm:text-2xl">
                {sent ? "Thank you" : "Write a review"}
              </h2>
              <p className="mt-1 truncate text-sm leading-relaxed text-mist/85">
                {productName}
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close review form"
              className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full border border-line text-mist transition-colors hover:bg-white/5 hover:text-foam"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* scrollable content area — the ONLY scrolling element */}
          <div
            ref={dialogRef}
            className="review-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
          >
          {sent ? (
            <div className="px-5 py-8 text-center sm:px-7">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-soft/10 text-soft">
                <Check className="h-7 w-7" strokeWidth={1.6} />
              </div>
              <h3 className="font-display mt-6 text-lg font-bold uppercase tracking-[0.06em] text-foam">
                Thanks for sharing your experience
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-mist">
                Your review for {productName} has been added. It may take a moment to show up.
              </p>
              <button type="button" onClick={onClose} className="btn btn-line mt-8">
                Close
              </button>
            </div>
          ) : (
              <div className="px-5 py-6 sm:px-7 sm:py-7">
              <div>
                <p className="label">Your rating</p>
                <div className="mt-3">
                  <StarRating value={rating} onChange={setRating} size={26} label="Your rating" />
                </div>
              </div>

              <label className="mt-6 block">
                <span className="label">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  autoComplete="name"
                  placeholder="How should we address you?"
                  className="field mt-2"
                />
              </label>

              <label className="mt-4 block">
                <span className="label">Your review</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={1500}
                  rows={4}
                  placeholder="What did you like about it? How are the quality and fit?"
                  className="field mt-2 resize-none"
                />
                <span className="mt-1.5 block text-right text-[0.7rem] text-mist/60">
                  {body.length}/1500
                </span>
              </label>

              <div className="mt-5 rounded-xl border border-line-soft bg-white/[0.03] p-3.5 text-xs leading-relaxed text-mist/80">
                <strong className="text-soft">Verified purchase?</strong> Add the phone
                number you used on an order for this item (optional) — we’ll check it
                against past orders and mark your review as verified if it matches.
              </div>

              <label className="mt-3 block">
                <span className="label">Phone (optional — for verification)</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={24}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="01XXXXXXXXX"
                  className="field-under mt-1.5"
                />
              </label>

              <label className="mt-3 block">
                <span className="label">Email (optional — for order updates)</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={160}
                  inputMode="email"
                  autoComplete="email"
                  type="email"
                  placeholder="you@example.com"
                  className="field-under mt-1.5"
                />
              </label>

              {error && (
                <p role="alert" className="mt-5 flex items-center gap-2 text-sm text-accent/90">
                  <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-accent/50 text-xs">
                    !
                  </span>
                  {error}
                </p>
              )}
              </div>
          )}
          </div>

          {/* footer — pinned below the scroll area, always reachable */}
          {!sent && (
            <div className="flex flex-shrink-0 border-t border-line-soft bg-deep/95 px-5 py-4 backdrop-blur-md sm:px-7">
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                aria-busy={busy}
                className="btn btn-solid w-full"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                  </>
                ) : (
                  "Submit review"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}