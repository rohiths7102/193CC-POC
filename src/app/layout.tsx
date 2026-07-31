import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { appUrl } from "@/lib/app-url";
import "./globals.css";

const display = Playfair_Display({ subsets: ["latin"], variable: "--font-display" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  // Absolute URL resolution for canonicals + OG images on any host.
  metadataBase: new URL(appUrl()),
  title: {
    default: "193 Countries Consortium — UK Business Membership · House of Lords Events & UK Investors Summit",
    template: "%s — 193 Countries Consortium",
  },
  description:
    "Business membership body for enterprises from 193 countries. Events at the House of Lords, the UK Investors Summit, enterprise mentoring and investor access. Tiers from £500.",
  applicationName: "193 Countries Consortium",
  openGraph: {
    type: "website",
    siteName: "193 Countries Consortium",
    locale: "en_GB",
  },
};

// Paints the mobile browser toolbar/status area navy instead of default light
// chrome above a #080F1F page — the single most visible "native app" cue.
export const viewport: Viewport = {
  themeColor: "#080F1F",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${display.variable} ${sans.variable}`}>
      <body className="grain font-sans min-h-svh">{children}</body>
    </html>
  );
}
