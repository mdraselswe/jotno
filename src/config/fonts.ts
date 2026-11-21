import { Anek_Bangla, Geist, Geist_Mono, Noto_Sans_Bengali } from "next/font/google";

/**
 * ✏️ Fonts. next/font needs literal options, so fonts live in code.
 *
 * - Headings: Anek Bangla (one family for Bangla and Latin, rounded and warm).
 * - Body: Geist for Latin, Noto Sans Bengali for Bangla (globals.css puts both
 *   in each stack). The Bengali fonts only cover Bengali code points
 *   (unicode-range), so a page without Bangla never downloads them.
 */
const sans = Geist({ subsets: ["latin"], variable: "--font-latin", display: "swap" });
const heading = Anek_Bangla({
  subsets: ["latin", "bengali"],
  variable: "--font-latin-heading",
  display: "swap",
  weight: ["500", "600", "700"],
});
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-latin-mono", display: "swap" });
const bengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bengali",
  display: "swap",
  preload: true,
});

export const fontVariables = `${sans.variable} ${heading.variable} ${mono.variable} ${bengali.variable}`;
