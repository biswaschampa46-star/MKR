"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, X, ArrowRight, ArrowUpRight } from "lucide-react";
import { useUI } from "@/lib/store";
import { trackTask } from "@/lib/loading-store";
import { bdt } from "@/lib/format";
import type { ProductCard } from "@/lib/products";

export default function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useUI();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ProductCard[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 350);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQ("");
      setResults([]);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearchOpen]);

  /* debounced live search */
  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await trackTask(fetch(`/api/search?q=${encodeURIComponent(q)}`));
        const data = (await res.json()) as { results: ProductCard[] };
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 260);
    return () => clearTimeout(t);
  }, [q]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setSearchOpen(false);
    router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div
      className={`fixed inset-0 z-[80] ${searchOpen ? "" : "pointer-events-none"}`}
      aria-hidden={!searchOpen}
    >
      <div
        className={`scrim absolute inset-0 bg-[rgba(5,16,27,0.72)] backdrop-blur-md ${
          searchOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => setSearchOpen(false)}
      />

      <div
        className={`drawer absolute inset-x-0 top-0 border-b border-line-soft bg-[rgba(7,26,43,0.94)] backdrop-blur-2xl ${
          searchOpen ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="mx-auto max-w-3xl px-6 pb-10 pt-24 md:pt-28">
          <div className="flex items-center justify-between">
            <p className="label label--bright">Search the store</p>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label="Close search"
              className="grid h-10 w-10 place-items-center rounded-full text-mist transition-colors hover:text-ice"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>

          <form onSubmit={submit} className="mt-8 flex min-w-0 items-center gap-3 sm:gap-4 border-b border-line pb-4 focus-within:border-soft/60">
            <Search className="h-6 w-6 shrink-0 text-mist" strokeWidth={1.5} />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
              placeholder="What are you looking for?"
              aria-label="Search products"
              className="font-display min-w-0 flex-1 bg-transparent text-2xl font-light tracking-tight text-foam placeholder:text-mist/40 focus:outline-none md:text-3xl"
            />
            <button type="submit" aria-label="Search" className="shrink-0 text-soft transition-colors hover:text-ice">
              <ArrowRight className="h-6 w-6" strokeWidth={1.5} />
            </button>
          </form>

          {/* live results */}
          <div className="mt-8 min-h-[3rem]" aria-busy={loading} aria-live="polite">
            {loading && (
              <p className="flex items-center gap-2 py-4 text-sm text-mist">
                <span className="h-4 w-4 animate-spin rounded-full border border-soft/40 border-t-transparent" aria-hidden="true" />
                Searching…
              </p>
            )}
            {q.trim() && !loading && results.length === 0 && (
              <p className="py-4 text-sm text-mist">
                Nothing found for “{q}”. Try another word.
              </p>
            )}
            <ul className="divide-y divide-line-soft">
              {results.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/product/${p.slug}`}
                    onClick={() => setSearchOpen(false)}
                    className="group flex items-center gap-5 py-4"
                  >
                    <div className="media-frame relative h-16 w-14 shrink-0">
                      <Image src={p.image} alt={p.name} fill sizes="56px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display truncate text-[0.95rem] font-semibold uppercase tracking-[0.06em] text-foam group-hover:text-ice">
                        {p.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-ice">{bdt(p.price)}</span>
                      <ArrowUpRight className="h-4 w-4 text-mist transition-all duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ice" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
