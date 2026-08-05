import type { Metadata } from "next";
import { Fraunces, DM_Sans, Noto_Sans_TC } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import "./globals.css";

// ─── Font loading ──────────────────────────────────────────────────────────
// All fonts loaded via next/font/google for automatic subset optimization,
// self-hosting, and zero layout shift. Never use <link> tags for these.
//
// Fraunces — display/italic serif for brand mark, prize names, winner reveals
// DM Sans  — body copy, labels, buttons, navigation
// Noto Sans TC — zh-HK bilingual text (Traditional Chinese)

const fraunces = Fraunces({
  subsets: ["latin"],
  // Italic is the primary use case for display (titles, prize names, brand mark)
  style: ["italic", "normal"],
  // Weight range covers thin labels through heavy hero text
  weight: ["300", "400", "500", "600", "700", "900"],
  // Optical size axis — "auto" lets the browser pick the right optical size
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-zh",
  display: "swap",
});

// ─── Metadata ──────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Lucky Draw",
  description: "Professional event lucky draw platform",
};

// ─── Root layout ───────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Compose all three font CSS variable classes onto <body>.
  // This makes --font-display, --font-body, and --font-zh available
  // as CSS custom properties anywhere in the component tree.
  const fontClasses = [
    fraunces.variable,
    dmSans.variable,
    notoSansTC.variable,
  ].join(" ");

  return (
    <html lang="en" className="dark">
      <body className={fontClasses} style={{ fontFamily: "var(--font-body)" }}>
        <ClerkProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
