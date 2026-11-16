import type { Metadata, Viewport } from "next";
import { sans, serif } from "./fonts";
import { Masthead } from "@/components/ui/Masthead";
import { SiteFooter } from "@/components/ui/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  other: { google: "notranslate" },
  title: "Anomalix · Is your city's climate actually shifting, or is it just natural noise?",
  description:
    "Is your city's climate actually shifting, or is it just natural noise? Type any city on Earth and get an honest verdict from open NASA data: the rate, the margin of error and significance tests, with Inconclusive when the signal is not there.",
};

export const viewport: Viewport = { themeColor: "#0D1015" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" translate="no" className={`notranslate ${serif.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-text focus:px-4 focus:py-2 focus:text-bg"
        >
          Skip to content
        </a>
        <Masthead />
        <div id="main" className="flex flex-1 flex-col">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
