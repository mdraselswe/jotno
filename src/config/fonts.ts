import {
  Anek_Bangla,
  Bricolage_Grotesque,
  Caveat_Brush,
  Galada,
  Geist_Mono,
  Hind_Siliguri,
  Plus_Jakarta_Sans,
} from "next/font/google";

/**
 * ✏️ Fonts. next/font needs literal options, so fonts live in code.
 *
 * Jotno pairs one Latin and one Bangla family per role (globals.css puts both
 * in each stack; the Bangla files only cover Bengali code points, so an
 * English page never downloads them):
 * - Display/headings: Bricolage Grotesque (editorial, variable width for the
 *   condensed two-weight titles) + Anek Bangla (variable width and weight).
 * - Body: Plus Jakarta Sans + Hind Siliguri (clear at small sizes on phones).
 * - Script (footer wordmark, stickers): Caveat Brush + Galada. Not preloaded.
 */
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-latin", display: "swap" });
const heading = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-latin-heading",
  display: "swap",
  axes: ["wdth", "opsz"],
});
const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-latin-mono",
  display: "swap",
  preload: false,
});
const bengali = Hind_Siliguri({
  subsets: ["bengali"],
  variable: "--font-bengali",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});
const bengaliHeading = Anek_Bangla({
  subsets: ["bengali"],
  variable: "--font-bengali-heading",
  display: "swap",
  axes: ["wdth"],
});
const script = Caveat_Brush({
  subsets: ["latin"],
  variable: "--font-latin-script",
  display: "swap",
  weight: "400",
  preload: false,
});
const bengaliScript = Galada({
  subsets: ["bengali"],
  variable: "--font-bengali-script",
  display: "swap",
  weight: "400",
  preload: false,
});

export const fontVariables = [sans, heading, mono, bengali, bengaliHeading, script, bengaliScript]
  .map((f) => f.variable)
  .join(" ");
