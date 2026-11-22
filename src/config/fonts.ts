import { DM_Sans, Geist_Mono, Noto_Sans_Bengali } from "next/font/google";

/**
 * ✏️ Fonts. next/font needs literal options, so fonts live in code.
 *
 * Chosen for reading first: one Latin and one Bangla family, used for body
 * and headings alike (headings differ by weight, not by a display face).
 * globals.css puts both in each stack; the Bangla file only covers Bengali
 * code points, so an English page never downloads it.
 * - DM Sans: clean geometric sans with an optical-size axis (crisp small text,
 *   tight big titles).
 * - Noto Sans Bengali: Google's reference Bangla sans; clear conjuncts and
 *   unambiguous digits (১ ২ ৩) at every size.
 */
const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-latin",
  display: "swap",
  axes: ["opsz"],
});
const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-latin-mono",
  display: "swap",
  preload: false,
});
const bengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bengali",
  display: "swap",
});

export const fontVariables = [sans, mono, bengali].map((f) => f.variable).join(" ");
