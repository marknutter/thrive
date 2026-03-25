import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Financial Dashboard",
  description: "Your financial overview powered by Thrive.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
