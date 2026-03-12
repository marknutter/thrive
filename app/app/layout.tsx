import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your CoachK coaching dashboard.",
  robots: { index: false, follow: false },
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
