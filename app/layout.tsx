import type { Metadata } from "next";
import { ThemeProvider } from "@/lib/theme";
import { ToastContainer } from "@/components/ui/toast";
import { CommandPaletteProvider } from "@/components/ui/command-palette";
import { CookieConsent } from "@/components/cookie-consent";
import "./globals.css";

const siteUrl = process.env.BETTER_AUTH_URL || "https://thrive.ai";

export const metadata: Metadata = {
  title: {
    default: "Thrive - Financial clarity and coaching for studio owners",
    template: "%s | Thrive",
  },
  description:
    "AI-powered business operations coaching for wellness and fitness businesses. Build financial clarity, reporting habits, and better decisions with Thrive.",
  metadataBase: new URL(siteUrl),
  // Mobile Safari optimization
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Thrive",
    title: "Thrive - Financial clarity and coaching for studio owners",
    description:
      "AI-powered business operations coaching for wellness and fitness businesses. Build financial clarity, reporting habits, and better decisions with Thrive.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Thrive - Financial clarity and coaching for studio owners",
    description:
      "AI-powered business operations coaching for wellness and fitness businesses. Build financial clarity, reporting habits, and better decisions with Thrive.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: siteUrl,
    types: {
      "application/rss+xml": `${siteUrl}/feed.xml`,
    },
  },
};

/**
 * Inline script to prevent flash of wrong theme on load.
 * Reads from localStorage before React hydrates.
 */
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('thrive-theme');
    var theme = stored || 'system';
    var resolved = theme;
    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.classList.add(resolved);
  } catch(e) {}
})()
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <CommandPaletteProvider>
            {children}
          </CommandPaletteProvider>
          <ToastContainer />
          <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  );
}
