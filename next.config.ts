import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* allow product images pasted as external URLs from the admin panel */
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  /* keep the dev indicator out of the bottom-left viewport corner so it
     never collides with page content, modals, or the Windows taskbar area */
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
