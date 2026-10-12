import type { Metadata, Viewport } from "next";
import { Roboto, Roboto_Condensed, JetBrains_Mono, Instrument_Serif, Geist } from "next/font/google";
import { appUrl } from "@/lib/app-url";
import "./globals.css";

// LSI's two families carry the identity. Roboto Condensed needs the full
// 100–700 span: 700 for the uppercase hero, and the hairline 100 that its
// 40px section titles are set in. JetBrains Mono is ours, not LSI's — a
// micro-label register (kickers, stat plates, spec chips) that lifts the
// page from themed to crafted without touching the headline identity.
const display = Roboto_Condensed({
  subsets: ["latin"],
  weight: ["100", "300", "400", "700"],
  variable: "--font-roboto-condensed",
});
const sans = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
});

// Editorial redesign (ADR-0030): a high-contrast display serif for headlines
// and a neutral grotesk for reading. Instrument Serif ships one weight — its
// drama comes from size and the italic, not from boldness.
const headline = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});
const body = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

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

// The page ground is now white, so the toolbar must follow it. Leaving this on
// navy would band the top of every mobile screen against a white hero.
export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${display.variable} ${sans.variable} ${mono.variable} ${headline.variable} ${body.variable}`}>
      <body className="grain font-sans min-h-svh">{children}</body>
    </html>
  );
}
