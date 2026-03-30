import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Foundation — Thrive",
  description:
    "Your Business Foundation document - a summary of your business profile, milestones, and recommendations from your Thrive coaching session.",
  robots: { index: false, follow: false },
};

export default function FoundationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
