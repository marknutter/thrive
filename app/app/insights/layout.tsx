import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Financial Insights",
  description: "AI-powered financial insights and recommendations.",
  robots: { index: false, follow: false },
};

export default function InsightsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
