import type { Metadata } from "next";
import { ThemeProvider } from "@/lib/theme";
import { ToastContainer } from "@/components/ui/toast";
import { CommandPaletteProvider } from "@/components/ui/command-palette";
import { CookieConsent } from "@/components/cookie-consent";
import "./globals.css";

const siteUrl = process.env.BETTER_AUTH_URL || "https://sprintbook.ai";

export const metadata: Metadata = {
  title: {
    default: "Sprintbook — AI-powered GTM playbooks in hours, not weeks",
    template: "%s | Sprintbook",
  },
  description:
    "AI-powered go-to-market platform. Build your GTM playbook, get coached on improvements, and execute outbound campaigns.",
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
    siteName: "Sprintbook",
    title: "Sprintbook — AI-powered GTM playbooks in hours, not weeks",
    description:
      "AI-powered go-to-market platform. Build your GTM playbook, get coached on improvements, and execute outbound campaigns.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sprintbook — AI-powered GTM playbooks in hours, not weeks",
    description:
      "AI-powered go-to-market platform. Build your GTM playbook, get coached on improvements, and execute outbound campaigns.",
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
    var stored = localStorage.getItem('sprintbook-theme');
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
