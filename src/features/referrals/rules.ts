/**
 * Invite rules as plain functions: the invite code alphabet and the checks
 * that keep people from inviting themselves (no phone check yet: a loose start).
 */

/** No 0/O, 1/I/L: easy to read out and type. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** A 6-character code from random bytes (crypto.getRandomValues). */
export function makeCode(bytes: Uint8Array): string {
  let code = "";
  for (let i = 0; i < 6; i += 1) code += ALPHABET[(bytes[i] ?? 0) % ALPHABET.length];
  return code;
}

/** Throwaway inbox services: an invite with one of these earns nothing. */
const DISPOSABLE = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "sharklasers.com",
  "10minutemail.com",
  "10minutemail.net",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "tempmail.dev",
  "tempmailo.com",
  "throwawaymail.com",
  "yopmail.com",
  "yopmail.net",
  "getnada.com",
  "nada.email",
  "dispostable.com",
  "trashmail.com",
  "maildrop.cc",
  "mintemail.com",
  "mohmal.com",
  "emailondeck.com",
  "fakeinbox.com",
  "moakt.com",
  "tmail.ws",
  "tmpmail.org",
  "mailnesia.com",
  "burnermail.io",
  "spamgourmet.com",
  "inboxkitten.com",
]);

export function isDisposableEmail(email: string | null | undefined): boolean {
  const domain = email?.split("@")[1]?.trim().toLowerCase();
  if (!domain) return false;
  return [...DISPOSABLE].some((d) => domain === d || domain.endsWith(`.${d}`));
}

export type FlagReason = "same_device" | "device_reused" | "disposable_email";

/** Why an invite earns nothing, or null when it is fine. */
export function inviteFlag(input: {
  email: string | null;
  deviceId: string | null;
  inviterDeviceId: string | null;
  deviceSeenBefore: boolean;
}): FlagReason | null {
  if (input.deviceId && input.inviterDeviceId && input.deviceId === input.inviterDeviceId)
    return "same_device";
  if (input.deviceId && input.deviceSeenBefore) return "device_reused";
  if (isDisposableEmail(input.email)) return "disposable_email";
  return null;
}
