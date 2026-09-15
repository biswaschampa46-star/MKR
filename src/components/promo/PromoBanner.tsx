"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import Countdown from "./Countdown";
import CouponCopy from "./CouponCopy";
import {
  discountParts,
  type PromoPublic,
} from "@/lib/promotion-utils";

const HEIGHTS: Record<string, string> = {
  sm: "min-h-[120px] py-8",
  md: "min-h-[180px] py-12",
  lg: "min-h-[260px] py-16",
};

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function SafeLink({
  href,
  className,
  style,
  children,
  ariaLabel,
}: {
  href: string;
  className: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  if (!href) return <span className={className} style={style}>{children}</span>;
  if (isExternalUrl(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={style}
        aria-label={ariaLabel}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} style={style} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}

/**
 * Renders one promotional campaign exactly as configured in the Admin
 * Panel. Shared between the public site and the admin live preview so
 * "what you see is what customers get".
 */
export default function PromoBanner({
  campaign,
  onExpire,
}: {
  campaign: PromoPublic;
  onExpire?: () => void;
}) {
  const c = campaign;
  const { badge } = discountParts(c.discountKind, c.discountValue, c.heading);

  const style: React.CSSProperties = {
    borderRadius: c.radius,
    color: c.textColor,
  };

  if (c.bgMode === "image" && c.imageUrl) {
    style.background = c.bgColor;
  } else if (c.bgMode === "gradient" && c.gradientEnabled) {
    style.background = `linear-gradient(120deg, ${c.bgColor} 0%, ${c.bgColor2} 100%)`;
  } else {
    style.background = c.bgColor;
  }

  const alignCls =
    c.align === "center" ? "items-center text-center" : c.align === "right" ? "items-end text-right" : "items-start text-left";

  const showCountdown =
    (c.campaignType === "flash_sale" || c.campaignType === "limited_time") &&
    !!c.endAt;

  const content = (
    <div
      className={`relative z-10 flex w-full flex-col gap-4 px-6 py-8 sm:px-10 md:px-14 ${alignCls} ${
        c.layout === "split" ? "md:flex-row md:items-center md:justify-between md:gap-10" : "items-center"
      }`}
    >
      {/* text zone */}
      <div
        className={`flex max-w-xl flex-col gap-3 ${
          c.align === "center" ? "items-center" : c.align === "right" ? "items-end" : "items-start"
        } ${c.layout === "split" ? "md:max-w-md" : ""}`}
      >
        {c.label && (
          <p
            className="font-display text-[0.65rem] font-bold uppercase tracking-[0.32em]"
            style={{ color: c.accentColor }}
          >
            {c.label}
          </p>
        )}

        <h2 className="font-display text-[2rem] font-extrabold leading-[1.02] tracking-tight sm:text-5xl">
          {badge || c.campaignName}
        </h2>

        {c.description && (
          <p className="max-w-md text-sm leading-relaxed opacity-85">
            {c.description}
          </p>
        )}

        {(showCountdown || c.couponCode) && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {showCountdown && c.endAt && (
              <Countdown
                endAt={c.endAt}
                textColor={c.textColor}
                accentColor={c.accentColor}
                onExpire={onExpire}
              />
            )}
            {c.couponCode && (
              <CouponCopy
                code={c.couponCode}
                accentColor={c.accentColor}
                textColor={c.textColor}
              />
            )}
          </div>
        )}
      </div>

      {/* CTA zone (split layout puts it to the right) */}
      {c.ctaText && (
        <div className={c.layout === "split" ? "shrink-0" : "mt-1"}>
          <SafeLink
            href={c.ctaUrl}
            ariaLabel={c.ctaText}
            className="font-display inline-flex items-center gap-2 whitespace-nowrap rounded-full px-7 py-3 text-[0.7rem] font-bold uppercase tracking-[0.24em] transition-all duration-300 hover:opacity-90 active:scale-[0.98]"
            style={{
              background: c.buttonColor,
              color: c.buttonTextColor,
            }}
          >
            {c.ctaText}
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </SafeLink>
        </div>
      )}
    </div>
  );

  const media =
    c.bgMode === "image" && c.imageUrl ? (
      <>
        <Image
          src={c.imageUrl}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 60vw"
          className="object-cover"
        />
        {/* readable veil over the image */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, ${c.bgColor}E6 0%, ${c.bgColor}B3 45%, transparent 100%)`,
          }}
          aria-hidden="true"
        />
      </>
    ) : null;

  return (
    <div
      className={`relative isolate w-full overflow-hidden ${
        c.animationEnabled ? "promo-anim" : ""
      }`}
      style={style}
    >
      {media}
      {content}
    </div>
  );
}
