import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thrive Forecast — Where Your Business Is Heading",
  description: "Financial forecasts, scenario planning, and forward-looking projections for your studio.",
  robots: { index: false, follow: false },
};

export default function ForecastLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
