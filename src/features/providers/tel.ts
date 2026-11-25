/**
 * A phone number as a `tel:` link, or null when there is nothing callable
 * (unset, blank or no digits), so a page never shows a dead Call button.
 * Keeps a leading + and the digits; Bangla digits become Latin ones.
 */
export function telHref(phone: string | null | undefined): `tel:${string}` | null {
  const latin = (phone ?? "").trim().replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6));
  const digits = latin.replace(/\D/g, "");
  if (digits.length < 3) return null;
  return `tel:${latin.startsWith("+") ? "+" : ""}${digits}`;
}
