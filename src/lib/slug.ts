/** "Dr. Nusrat Jahan" → "dr-nusrat-jahan". Non-Latin text falls back to `fallback`. */
export function slugify(text: string, fallback = "vet"): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || fallback;
}

/** A short random suffix for unique slugs ("x7k2"). */
export function shortId(length = 4): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
