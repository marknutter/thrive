import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thrive Compass — Your Goals and Priorities",
};

export default function CompassLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
