import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thrive Launch — Set Up Your Business Foundation",
  description:
    "A step-by-step checklist to guide you through forming your business, connecting your systems, and building your financial foundation.",
  robots: { index: false, follow: false },
};

export default function LaunchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
