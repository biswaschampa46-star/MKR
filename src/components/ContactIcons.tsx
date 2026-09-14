import type { SVGProps } from "react";
import type { SocialKey } from "@/lib/contact-links";

/**
 * Geometric vector contact/social icons in a single consistent stroke system
 * (24×24 grid, 1.8 stroke, round caps — matching lucide-react).
 * Brand marks are clean geometric outlines rather than emojis or PNGs, so
 * every icon shares the same weight, proportions and hover behavior.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M15.5 3.5h-2.3a3.7 3.7 0 0 0-3.7 3.7v2.3H7v3h2.5v8h3v-8h2.4l.5-3h-2.9V7.4c0-.6.4-.9 1-.9h2V3.5z" />
    </Base>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="3.8" />
      <circle cx="17" cy="7" r="0.6" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function WhatsappIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5z" />
      <path d="M9.2 8.6c.2-.5.5-.5.8-.5l.6.9c.1.2.1.5 0 .7l-.4.5c.5 1 1.3 1.8 2.3 2.3l.5-.4c.2-.1.5-.1.7 0l.9.6c0 .3 0 .6-.5.8-.4.2-1 .3-1.9.1-1.9-.5-3.5-2.1-4-4-.2-.9-.1-1.5.1-1.9l.9-.1z" />
    </Base>
  );
}

export function TiktokIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9.5 4v10.5a3.25 3.25 0 1 0 3.25 3.25" />
      <path d="M9.5 9.5c.6-2.4 2.3-4.3 4.8-4.7 1.5-.2 3 .2 4.2 1.1" />
      <path d="M12.75 4v9.75" />
    </Base>
  );
}

export function YoutubeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="2.8" y="6" width="18.4" height="12" rx="3.5" />
      <path d="M10.5 9.8v4.4l4-2.2-4-2.2z" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function XLogoIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4.5 4.5l15 15" />
      <path d="M19.5 4.5l-15 15" />
    </Base>
  );
}

export const SOCIAL_ICONS: Record<SocialKey, (p: IconProps) => React.JSX.Element> = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  tiktok: TiktokIcon,
  youtube: YoutubeIcon,
  twitter: XLogoIcon,
};
