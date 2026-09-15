import Link from "next/link";
import { ArrowRight } from "lucide-react";
import RetryButton from "@/components/RetryButton";

/**
 * Shown when a database/network query fails. This is deliberately distinct
 * from the custom 404 page (`not-found.tsx`): a data failure must never be
 * presented as "product not found" — and it never wipes existing content,
 * because the layout (nav, cart, footer) keeps rendering around it.
 */
export default function DataErrorState({
  title = "Something went wrong.",
  message = "We could not load the products just now. This is temporary — try again.",
  backHref = "/",
  backLabel = "Back to Home",
}: {
  title?: string;
  message?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[1400px] flex-col items-center justify-center gap-7 px-6 text-center">
      <p className="label">Temporary issue</p>
      <h1 className="display-2 text-foam">{title}</h1>
      <p className="max-w-sm text-sm leading-relaxed text-mist">{message}</p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link href={backHref} className="btn btn-solid">
          {backLabel} <ArrowRight className="btn-arrow h-3.5 w-3.5" />
        </Link>
        <RetryButton />
      </div>
    </div>
  );
}
