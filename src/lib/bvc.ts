const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

/**
 * A BVC registration number reduced to its digits, for spotting two profiles
 * with the same number however it was typed: "BVC-01234", "১২৩৪" and "1234"
 * are all "1234". Null when there are no digits to compare.
 * `bvcKeySql` in features/admin/server/queries.ts does the same in Postgres.
 */
export function bvcKey(no: string | null | undefined): string | null {
  if (!no) return null;
  const ascii = no.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
  const digits = ascii.replace(/\D/g, "").replace(/^0+/, "");
  return digits || null;
}
