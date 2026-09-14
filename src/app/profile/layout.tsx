import type { Metadata } from "next";
import type { ReactNode } from "react";
import ProfileShell from "@/components/profile/ProfileShell";

export const metadata: Metadata = {
  title: "My Account",
  robots: { index: false },
};

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return <ProfileShell>{children}</ProfileShell>;
}
